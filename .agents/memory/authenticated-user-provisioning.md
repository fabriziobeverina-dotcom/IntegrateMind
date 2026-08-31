---
name: Authenticated user provisioning
description: How to handle valid Replit Auth sessions whose application user row is missing.
---

An authenticated session does not guarantee that a matching application user row exists. Protected write flows must provision the row from trusted session claims and use the normalized database ID before updating user settings.

**Why:** OIDC login intentionally continues when its initial database upsert fails, so a valid session can otherwise reach onboarding and receive repeated `User not found` responses.

**How to apply:** For account setup and other protected writes, recover the user from trusted claims first, require the recovered record, and use its returned ID for subsequent database operations.