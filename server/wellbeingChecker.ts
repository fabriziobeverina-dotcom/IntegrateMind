// Wellbeing & Crisis Detection System — Integration Compass
// Runs daily flag checks and manages alert states server-side.
// Never exposes clinical language to users.

import webpush from 'web-push';
import { storage } from './storage';
import type { WellbeingFlag, PulseRecord, UserWellbeing } from '@shared/schema';

// ─── Admin push notification helper ──────────────────────────────────────────

async function notifyAdmins(triggeredCount: number, watchingCount: number): Promise<void> {
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
  const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@integrationcompass.com';
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const total = triggeredCount + watchingCount;
  if (total === 0) return; // Nothing to report

  const parts: string[] = [];
  if (triggeredCount > 0) parts.push(`${triggeredCount} red flag${triggeredCount > 1 ? 's' : ''}`);
  if (watchingCount > 0) parts.push(`${watchingCount} monitoring`);

  const payload = JSON.stringify({
    title: 'Wellbeing Alert — Action Required',
    body: `Daily check: ${parts.join(', ')}. Open the wellbeing board to review.`,
    url: '/admin/wellbeing',
    tag: 'admin-wellbeing-daily',
    icon: '/icon-192.png',
  });

  const subs = await storage.getAdminPushSubscriptions();
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 86400, urgency: 'high', vapidDetails: { subject: VAPID_EMAIL, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY } }
      );
      console.log(`[Wellbeing] Admin notification sent to endpoint: ${sub.endpoint.slice(0, 40)}…`);
    } catch (err: any) {
      console.error(`[Wellbeing] Failed to send admin push:`, err?.message);
    }
  }
}

// ─── Retry helper for transient Neon cold-start errors ────────────────────────
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRetryable = err?.sourceError?.message?.includes('retryable') ||
        JSON.stringify(err).includes('"neon:retryable":true') ||
        err?.message?.includes('Control plane request failed') ||
        err?.message?.includes('Too many database connection attempts');
      if (isRetryable && attempt < retries - 1) {
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error('withRetry exhausted');
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Stabilization prompts (5, rotating) ─────────────────────────────────────

export const STABILIZATION_PROMPTS = [
  "Today, just one practice: find three points of contact between your body and a surface — floor, chair, ground. Rest your attention there for two minutes. Nothing else is required of you today.",
  "Notice something in your immediate environment that is not moving. A wall, a table, a tree. Let your eyes rest on it without trying to understand it. Two minutes. That's the practice.",
  "Put one hand on your chest and one on your belly. Breathe until you feel both hands move. Do this for ten breaths. You don't have to reflect on anything today.",
  "Today's prompt is simple: drink a full glass of water slowly, noticing the temperature and weight of it. The medicine works through the body. The body needs tending.",
  "Step outside for five minutes. No phone. No agenda. Just stand somewhere and let the air touch your face. Return when you're ready.",
];

// ─── Word stemmer (simple English suffix stripping) ───────────────────────────

function stem(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/(ing|tion|ness|ment|ed|er|est|ly|s)$/, '');
}

function wordFrequency(text: string): Map<string, number> {
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const freq = new Map<string, number>();
  for (const w of words) {
    const s = stem(w);
    if (s.length > 2) freq.set(s, (freq.get(s) ?? 0) + 1);
  }
  return freq;
}

// ─── Flag detection logic ─────────────────────────────────────────────────────

async function detectFlags(userId: string): Promise<WellbeingFlag[]> {
  const activeFlags: WellbeingFlag[] = [];
  const now = new Date().toISOString();

  // Get last 14 days of journal entries
  const allEntries = await storage.getUserJournalEntries(userId, 100);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

  const recent14 = allEntries.filter(e => new Date(e.createdAt!) >= fourteenDaysAgo);
  const last7 = recent14.filter(e => new Date(e.createdAt!) >= sevenDaysAgo);
  const prev7 = recent14.filter(e => new Date(e.createdAt!) < sevenDaysAgo);

  // FLAG 1: Journaling dropout — no entry for 4+ days after journaling ≥3 times in previous 7 days
  if (prev7.length >= 3) {
    const lastEntry = allEntries[0];
    if (!lastEntry || new Date(lastEntry.createdAt!) < fourDaysAgo) {
      activeFlags.push({ name: 'journaling_dropout', setAt: now });
    }
  }

  // FLAG 2: Entry length collapse — avg < 30 words for 3 consecutive days after avg 80+ words
  if (last7.length >= 3) {
    const prevAvgWords = prev7.length > 0
      ? prev7.reduce((sum, e) => sum + e.content.split(/\s+/).length, 0) / prev7.length
      : 0;

    // Get the last 3 days of entries
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const last3DaysEntries = last7.filter(e => new Date(e.createdAt!) >= threeDaysAgo);
    if (prevAvgWords >= 80 && last3DaysEntries.length >= 1) {
      const recentAvg = last3DaysEntries.reduce((sum, e) => sum + e.content.split(/\s+/).length, 0) / last3DaysEntries.length;
      if (recentAvg < 30) {
        activeFlags.push({ name: 'entry_length_collapse', setAt: now });
      }
    }
  }

  // FLAG 3: Obsessive repetition — same stem dominates >40% of content in 5+ consecutive entries
  if (last7.length >= 5) {
    const lastFive = [...last7].sort((a, b) =>
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    ).slice(0, 5);

    const stemCounts = new Map<string, number>();
    let totalWords = 0;
    for (const entry of lastFive) {
      const freq = wordFrequency(entry.content);
      for (const [stem, count] of freq) {
        stemCounts.set(stem, (stemCounts.get(stem) ?? 0) + count);
        totalWords += count;
      }
    }
    if (totalWords > 0) {
      const maxCount = Math.max(...stemCounts.values());
      if (maxCount / totalWords > 0.40) {
        activeFlags.push({ name: 'obsessive_repetition', setAt: now });
      }
    }
  }

  // FLAG 4: Streak break after 7+ day streak
  // Simple check: find longest consecutive-day streak ending yesterday or before
  const entriesByDay = new Set(
    recent14.map(e => new Date(e.createdAt!).toDateString())
  );
  let streak = 0;
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (entriesByDay.has(d.toDateString())) {
      streak++;
    } else {
      break;
    }
  }
  // Streak broken today if yesterday had a streak of 7+
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const hadEntryToday = entriesByDay.has(today.toDateString());
  if (!hadEntryToday && streak >= 7) {
    activeFlags.push({ name: 'streak_break', setAt: now });
  }

  return activeFlags;
}

// ─── Alert trigger logic ──────────────────────────────────────────────────────

function shouldTriggerFromPulse(record: PulseRecord, previous: PulseRecord | null): boolean {
  if (record.q1 === 1 || record.q2 === 1 || record.q3 === 1) return true;
  const lowCount = [record.q1, record.q2, record.q3].filter(q => q <= 2).length;
  if (lowCount >= 2) return true;
  if (!previous && record.composite <= 6) return true;
  if (previous && (previous.composite - record.composite) >= 5) return true;
  return false;
}

// ─── Sustained low mood detection ─────────────────────────────────────────────
// Flags when the last 3 pulse check-ins all score ≤ 9/15 (avg ≤ 3/5 per dimension).
// This catches persistent low mood that never hits the single-check crisis threshold.

export function detectSustainedLowMood(history: PulseRecord[]): WellbeingFlag | null {
  if (history.length < 3) return null;
  const recent = history.slice(-3);
  const allPersistentlyLow = recent.every(r => r.composite <= 9);
  if (!allPersistentlyLow) return null;
  return { name: 'sustained_low_mood', setAt: new Date().toISOString() };
}

// ─── Improvement detection ────────────────────────────────────────────────────
// Returns true if the last 3 pulse records all show healthy scores:
// no individual score at crisis level (1/5), composite >= 9 (avg 3+ per dimension).

function isImprovingTrend(history: PulseRecord[]): boolean {
  if (history.length < 3) return false;
  const recent = history.slice(-3);
  return recent.every(r => r.q1 > 1 && r.q2 > 1 && r.q3 > 1 && r.composite >= 9);
}

// ─── Main daily check ─────────────────────────────────────────────────────────

let dailyCheckRunning = false;

export async function runDailyWellbeingCheck(): Promise<void> {
  if (dailyCheckRunning) return;
  dailyCheckRunning = true;
  console.log('[Wellbeing] Running daily flag check...');
  try {
    const allUsers = await withRetry(() => storage.getAllUsersForFlagCheck());
    let triggeredCount = 0;
    let watchingCount = 0;

    for (const user of allUsers) {
      try {
        await sleep(100); // stagger: 100ms between users to avoid connection bursts
        const journalFlags = await withRetry(() => detectFlags(user.id));
        const wb = await withRetry(() => storage.getUserWellbeing(user.id));

        // Also check for sustained low mood across pulse history
        const pulseHistory = (wb?.pulseHistory ?? []) as PulseRecord[];
        const sustainedFlag = detectSustainedLowMood(pulseHistory);
        const flags = sustainedFlag ? [...journalFlags, sustainedFlag] : journalFlags;

        const currentStatus = wb?.alertStatus ?? 'none';
        let newStatus = currentStatus;

        // Watching: 1 flag. Triggered: 2+ flags simultaneously.
        if (flags.length >= 2 && currentStatus !== 'triggered' && currentStatus !== 'resolved') {
          newStatus = 'triggered';
        } else if (flags.length === 1 && currentStatus === 'none') {
          newStatus = 'watching';
        }

        // Reduce stabilizationDaysRemaining by 1 each day if active
        const stabilizationDaysRemaining = Math.max(0, (wb?.stabilizationDaysRemaining ?? 0) - 1);

        // ── Dynamic auto-downgrade based on improving pulse trend ──────────────
        const improving = isImprovingTrend(pulseHistory);

        // 'triggered' → 'none': flags cleared AND (stabilization done OR clear improving trend)
        if (currentStatus === 'triggered' && newStatus === 'triggered') {
          if (flags.length === 0 && (stabilizationDaysRemaining <= 0 || improving)) {
            newStatus = 'none';
            console.log(`[Wellbeing] Auto-resolved ${user.id}: flags clear, improving=${improving}, stabilDays=${stabilizationDaysRemaining}`);
          }
        }

        // 'watching' → 'none': flags cleared naturally
        if (currentStatus === 'watching' && newStatus === 'watching' && flags.length === 0) {
          newStatus = 'none';
          console.log(`[Wellbeing] Auto-cleared ${user.id}: watching → none, flags resolved`);
        }

        await withRetry(() => storage.upsertUserWellbeing(user.id, {
          flags,
          alertStatus: newStatus,
          ...(newStatus === 'triggered' && currentStatus !== 'triggered' ? {
            alertTriggeredAt: new Date(),
            stabilizationDaysRemaining: 3,
            stabilizationStartedAt: new Date(),
          } : { stabilizationDaysRemaining }),
        }));

        // Tally final status for admin notification
        if (newStatus === 'triggered') triggeredCount++;
        else if (newStatus === 'watching') watchingCount++;

      } catch (err) {
        console.error(`[Wellbeing] Error checking user ${user.id}:`, err);
      }
    }

    console.log(`[Wellbeing] Daily check complete for ${allUsers.length} users — triggered: ${triggeredCount}, watching: ${watchingCount}`);

    // Send one daily push notification to all admins if any flags are active
    await notifyAdmins(triggeredCount, watchingCount);

  } catch (err) {
    console.error('[Wellbeing] Daily check failed:', err);
  } finally {
    dailyCheckRunning = false;
  }
}

// ─── Pulse check helpers ──────────────────────────────────────────────────────

export function isPulseCheckDue(wb: UserWellbeing | null): boolean {
  if (!wb?.lastPulseDate) return true; // Never done one
  const daysSince = (Date.now() - new Date(wb.lastPulseDate).getTime()) / (1000 * 60 * 60 * 24);
  // Due every 7 days, OR early if 2+ flags active
  if (Array.isArray(wb.flags) && (wb.flags as WellbeingFlag[]).length >= 2) {
    return daysSince >= 3.5; // Half cycle if flags active
  }
  return daysSince >= 7;
}

export async function processPulseSubmission(
  userId: string,
  q1: number,
  q2: number,
  q3: number
): Promise<{ triggered: boolean }> {
  const composite = q1 + q2 + q3;
  const record: PulseRecord = {
    date: new Date().toISOString(),
    q1, q2, q3, composite,
  };

  const wb = await storage.getUserWellbeing(userId);
  const history: PulseRecord[] = Array.isArray(wb?.pulseHistory) ? wb!.pulseHistory as PulseRecord[] : [];
  const previous = history.length > 0 ? history[history.length - 1] : null;

  const triggered = shouldTriggerFromPulse(record, previous);
  const newHistory = [...history, record];

  const currentStatus = wb?.alertStatus ?? 'none';
  let newStatus = currentStatus;

  if (triggered && currentStatus !== 'triggered') {
    newStatus = 'triggered';
  }

  // Check for sustained low mood pattern after adding this new check-in
  const sustainedFlag = detectSustainedLowMood(newHistory);
  if (sustainedFlag && !triggered && currentStatus === 'none') {
    newStatus = 'watching';
    console.log(`[Wellbeing] Sustained low mood detected for ${userId}: → watching`);
  }

  // Dynamic auto-downgrade: if status was 'triggered' but this new pulse is fine
  // and the last 3 pulses in the full history all show improvement → ease to 'watching'
  if (currentStatus === 'triggered' && !triggered && newStatus === 'triggered') {
    if (isImprovingTrend(newHistory)) {
      newStatus = 'watching';
      console.log(`[Wellbeing] Pulse auto-downgrade ${userId}: triggered → watching (improving trend)`);
    }
  }

  await storage.upsertUserWellbeing(userId, {
    pulseHistory: newHistory,
    lastPulseDate: new Date(),
    alertStatus: newStatus,
    ...(triggered && currentStatus !== 'triggered' ? {
      alertTriggeredAt: new Date(),
      stabilizationDaysRemaining: 3,
      stabilizationStartedAt: new Date(),
    } : {}),
  });

  return { triggered, sustainedLowMood: !!sustainedFlag, autoDowngraded: currentStatus === 'triggered' && newStatus === 'watching' };
}

export function getStabilizationPrompt(index: number): string {
  return STABILIZATION_PROMPTS[index % STABILIZATION_PROMPTS.length];
}

// ─── Scheduler setup ──────────────────────────────────────────────────────────

export function setupWellbeingScheduler(): void {
  // Delay startup check so it doesn't race with session store init
  setTimeout(() => runDailyWellbeingCheck(), 60_000);

  // Then every 24 hours
  setInterval(() => runDailyWellbeingCheck(), 24 * 60 * 60 * 1000);
  console.log('[Wellbeing] Daily checker scheduled');
}
