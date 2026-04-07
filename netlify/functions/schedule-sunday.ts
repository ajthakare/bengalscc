/**
 * Sunday 6 PM Pacific scheduled job (runs Mon 01:00 UTC).
 *
 * 1. Check for fixtures in the next 7 days → send fixture vote notification.
 * 2. Create Net Practice (Wednesday 7 PM) + Field Practice (Thursday 5 PM)
 *    for the coming week, unless they already exist.
 * 3. Send practice vote notification if sessions were created.
 */
import { schedule } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { randomUUID } from 'crypto';
import { getPacificNow, parseLocalDate } from './_utils';
import { sendPushToAll, toDateString } from './_push-utils';
import type { PracticeSession } from '../../src/types/player';

export const handler = schedule('0 1 * * 1', async () => {
  console.log('[schedule-sunday] Starting Sunday 6 PM job');

  try {
    const now = getPacificNow(); // Sunday ~6 PM Pacific
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    // ── 1. Get active season ──────────────────────────────────────────────────

    const seasonsStore = getStore({
      name: 'seasons',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const activeSeason: any = await seasonsStore.get('active-season', { type: 'json' });

    if (!activeSeason?.id) {
      console.log('[schedule-sunday] No active season. Exiting.');
      return { statusCode: 200 };
    }

    // ── 2. Check for upcoming fixtures ────────────────────────────────────────

    const fixturesStore = getStore({
      name: 'fixtures',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const allFixtures: any[] =
      (await fixturesStore.get(`fixtures-${activeSeason.id}`, { type: 'json' })) || [];

    const upcomingFixtures = allFixtures.filter((f) => {
      const d = parseLocalDate(f.date);
      d.setHours(0, 0, 0, 0);
      return d >= today && d <= sevenDaysLater;
    });

    if (upcomingFixtures.length > 0) {
      const result = await sendPushToAll({
        title: "Vote for Next Week's Fixtures",
        body: `${upcomingFixtures.length} match${upcomingFixtures.length > 1 ? 'es' : ''} coming up — mark your availability now.`,
        url: '/myfixtures',
      });
      console.log(`[schedule-sunday] Fixture notification sent to ${result.sent} players.`);
    } else {
      console.log('[schedule-sunday] No upcoming fixtures. Skipping fixture notification.');
    }

    // ── 3. Create practice sessions ───────────────────────────────────────────

    // Next Wednesday = today (Sunday=0) + 3 days
    // Next Thursday  = today (Sunday=0) + 4 days
    const dayOfWeek = now.getDay(); // Should be 0 (Sunday) when cron fires
    const daysToWed = (3 - dayOfWeek + 7) % 7 || 7;
    const daysToThu = (4 - dayOfWeek + 7) % 7 || 7;

    const wednesdayDate = new Date(today);
    wednesdayDate.setDate(today.getDate() + daysToWed);
    const thursdayDate = new Date(today);
    thursdayDate.setDate(today.getDate() + daysToThu);

    const wednesdayStr = toDateString(wednesdayDate);
    const thursdayStr = toDateString(thursdayDate);

    const practicesStore = getStore({
      name: 'practice-sessions',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    // Load existing practices for this season to check for duplicates
    const practiceIndex: string[] =
      (await practicesStore.get(`practice-index-${activeSeason.id}`, { type: 'json' })) || [];

    const existingDates = new Set<string>();
    await Promise.all(
      practiceIndex.map(async (id) => {
        const p: any = await practicesStore.get(`practice-${id}`, { type: 'json' });
        if (p?.date) existingDates.add(p.date);
      })
    );

    const createdCount = { net: false, field: false };
    const nowIso = new Date().toISOString();

    // Create Net Practice (Wednesday 7 PM) if not already present
    if (!existingDates.has(wednesdayStr)) {
      const netId = randomUUID();
      const wednesdayDisplay = wednesdayDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric',
      });
      const netPractice: PracticeSession = {
        id: netId,
        type: 'net',
        title: `Net Practice - ${wednesdayDisplay}`,
        date: wednesdayStr,
        time: '19:00',
        location: 'NACL Sports Center, 1111 Felipe Ave, San Jose, CA 95122',
        seasonId: activeSeason.id,
        team: 'all',
        description: '',
        status: 'active',
        locked: false,
        playerAvailability: [],
        createdAt: nowIso,
        createdBy: 'scheduler',
        updatedAt: nowIso,
        updatedBy: 'scheduler',
      } as any;

      await practicesStore.setJSON(`practice-${netId}`, netPractice);
      practiceIndex.push(netId);

      const active: string[] =
        (await practicesStore.get('practices-active', { type: 'json' })) || [];
      active.push(netId);
      await practicesStore.setJSON('practices-active', active);

      createdCount.net = true;
      console.log(`[schedule-sunday] Created net practice for ${wednesdayStr}`);
    } else {
      console.log(`[schedule-sunday] Net practice already exists for ${wednesdayStr}. Skipping.`);
    }

    // Create Field Practice (Thursday 5 PM) if not already present
    if (!existingDates.has(thursdayStr)) {
      const fieldId = randomUUID();
      const thursdayDisplay = thursdayDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric',
      });
      const fieldPractice: PracticeSession = {
        id: fieldId,
        type: 'field',
        title: `Field Practice - ${thursdayDisplay}`,
        date: thursdayStr,
        time: '17:00',
        location: 'Ortega Park, 636 Harrow Way, Sunnyvale, CA 94087',
        seasonId: activeSeason.id,
        team: 'all',
        description: '',
        status: 'active',
        locked: false,
        playerAvailability: [],
        createdAt: nowIso,
        createdBy: 'scheduler',
        updatedAt: nowIso,
        updatedBy: 'scheduler',
      } as any;

      await practicesStore.setJSON(`practice-${fieldId}`, fieldPractice);
      practiceIndex.push(fieldId);

      const active: string[] =
        (await practicesStore.get('practices-active', { type: 'json' })) || [];
      active.push(fieldId);
      await practicesStore.setJSON('practices-active', active);

      createdCount.field = true;
      console.log(`[schedule-sunday] Created field practice for ${thursdayStr}`);
    } else {
      console.log(`[schedule-sunday] Field practice already exists for ${thursdayStr}. Skipping.`);
    }

    // Save updated practice index
    await practicesStore.setJSON(`practice-index-${activeSeason.id}`, practiceIndex);

    // ── 4. Send practice notification if sessions were created ────────────────

    if (createdCount.net || createdCount.field) {
      const result = await sendPushToAll({
        title: 'Practice Sessions This Week',
        body: `Net Practice (Wed 7 PM) and Field Practice (Thu 5 PM) are up — vote if you're coming.`,
        url: '/mypractice',
      });
      console.log(`[schedule-sunday] Practice notification sent to ${result.sent} players.`);
    }

    console.log('[schedule-sunday] Done.');
    return { statusCode: 200 };
  } catch (err) {
    console.error('[schedule-sunday] Error:', err);
    return { statusCode: 500 };
  }
});
