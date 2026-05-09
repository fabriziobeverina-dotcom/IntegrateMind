import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import ConnectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days

  const PgSession = ConnectPgSimple(session);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    allowExitOnIdle: true,
  });
  const sessionStore = new PgSession({
    pool,
    tableName: 'sessions',
    ttl: sessionTtl / 1000, // seconds
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  // Create a full name from first and last name, fallback to email if not available
  const firstName = claims["first_name"] || "";
  const lastName = claims["last_name"] || "";
  const fullName = `${firstName} ${lastName}`.trim() || claims["email"] || "Unknown User";
  
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    name: fullName,
    avatar: claims["profile_image_url"] || null,
    provider: "replit",
    providerId: claims["sub"],
    firstName: firstName || null,
    lastName: lastName || null,
    profileImageUrl: claims["profile_image_url"] || null,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    try {
      await upsertUser(tokens.claims());
    } catch (error) {
      console.error("Database error during user upsert:", error);
      // Continue authentication even if database upsert fails
      // User can still access the app, but features requiring database will show errors
    }
    verified(null, user);
  };

  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Load admin status from DB (best-effort)
  const loadAdminStatus = async () => {
    try {
      const dbUser = await storage.getUserById(user.claims?.sub);
      user.isAdmin = dbUser?.isAdmin || false;
    } catch {
      user.isAdmin = false;
    }
  };

  // If no expiry info in the session, trust the session as-is
  if (!user.expires_at) {
    await loadAdminStatus();
    return next();
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    await loadAdminStatus();
    return next();
  }

  // Token is expired — try to refresh, but fall back to trusting the session
  // The PostgreSQL session is valid for 30 days; an expired OIDC token should not log users out
  const refreshToken = user.refresh_token;
  if (refreshToken) {
    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
    } catch {
      // Refresh failed — that's okay, the session itself is still valid
    }
  }

  await loadAdminStatus();
  return next();
};

// Admin-only middleware for content management
export const isAdmin: RequestHandler = async (req, res, next) => {
  // First ensure user is authenticated
  isAuthenticated(req, res, () => {
    const user = req.user as any;
    if (user && user.isAdmin) {
      next();
    } else {
      res.status(403).json({ message: "Admin access required" });
    }
  });
};