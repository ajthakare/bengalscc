/**
 * Monday 8 PM Pacific scheduled job (runs Tue 04:00 UTC).
 *
 * Sends a practice reminder if sessions exist for this week's
 * Wednesday and/or Thursday.
 */
import { schedule } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { getPacificNow } from './_utils';
import { sendPushToAll, toDateString } from './_push-utils';

export const handler = schedule('0 4 * * 2', async () => {
  console.log('[schedule-monday] Starting Monday 8 PM job');

  try {
    const now = getPacificNow(); // Monday ~8 PM Pacific
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // This week's Wednesday = Monday + 2, Thursday = Monday + 3
    const dayOfWeek = now.getDay(); // Should be 1 (Monday) when cron fires
    const daysToWed = (3 - dayOfWeek + 7) % 7;
    const daysToThu = (4 - dayOfWeek + 7) % 7;

    const wednesdayDate = new Date(today);
    wednesdayDate.setDate(today.getDate() + daysToWed);
    const thursdayDate = new Date(today);
    thursdayDate.setDate(today.getDate() + daysToThu);

    const wednesdayStr = toDateString(wednesdayDate);
    const thursdayStr = toDateString(thursdayDate);

    // ── Get active season ─────────────────────────────────────────────────────

    const seasonsStore = getStore({
      name: 'seasons',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const activeSeason: any = await seasonsStore.get('active-season', { type: 'json' });

    if (!activeSeason?.id) {
      console.log('[schedule-monday] No active season. Exiting.');
      return { statusCode: 200 };
    }

    // ── Check for this week's practice sessions ───────────────────────────────

    const practicesStore = getStore({
      name: 'practice-sessions',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const practiceIndex: string[] =
      (await practicesStore.get(`practice-index-${activeSeason.id}`, { type: 'json' })) || [];

    let hasWedPractice = false;
    let hasThuPractice = false;

    await Promise.all(
      practiceIndex.map(async (id) => {
        const p: any = await practicesStore.get(`practice-${id}`, { type: 'json' });
        if (!p || p.status === 'cancelled') return;
        if (p.date === wednesdayStr) hasWedPractice = true;
        if (p.date === thursdayStr) hasThuPractice = true;
      })
    );

    if (!hasWedPractice && !hasThuPractice) {
      console.log('[schedule-monday] No practice sessions found this week. Skipping reminder.');
      return { statusCode: 200 };
    }

    // Build reminder body based on which sessions exist
    let body: string;
    if (hasWedPractice && hasThuPractice) {
      body = 'Net Practice (Wed 7 PM) and Field Practice (Thu 5 PM) this week — have you voted?';
    } else if (hasWedPractice) {
      body = 'Net Practice on Wednesday at 7 PM — have you voted?';
    } else {
      body = 'Field Practice on Thursday at 5 PM — have you voted?';
    }

    const result = await sendPushToAll({
      title: 'Practice Reminder This Week',
      body,
      url: '/mypractice',
    });

    console.log(`[schedule-monday] Practice reminder sent to ${result.sent} players.`);
    return { statusCode: 200 };
  } catch (err) {
    console.error('[schedule-monday] Error:', err);
    return { statusCode: 500 };
  }
});
