/**
 * Sunday 8 PM Pacific scheduled job (runs Mon 03:00 UTC).
 *
 * Sends one combined notification covering practice votes and game votes.
 * Practice sessions are created separately on Saturday at 3 PM.
 */
import { schedule } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { getPacificNow, parseLocalDate } from './_utils';
import { sendPushToAll, toDateString } from './_push-utils';

export const handler = schedule('0 3 * * 1', async () => {
  console.log('[schedule-sunday] Starting Sunday 8 PM notification job');

  try {
    const now = getPacificNow();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

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

    // Check for practice sessions this week (Wed and Fri)
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const daysToWed = (3 - dayOfWeek + 7) % 7 || 7;
    const daysToFri = (5 - dayOfWeek + 7) % 7 || 7;

    const wednesdayDate = new Date(today);
    wednesdayDate.setDate(today.getDate() + daysToWed);
    const fridayDate = new Date(today);
    fridayDate.setDate(today.getDate() + daysToFri);

    const wednesdayStr = toDateString(wednesdayDate);
    const fridayStr = toDateString(fridayDate);

    const practicesStore = getStore({
      name: 'practice-sessions',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const practiceIndex: string[] =
      (await practicesStore.get(`practice-index-${activeSeason.id}`, { type: 'json' })) || [];

    let hasWedPractice = false;
    let hasFriPractice = false;

    await Promise.all(
      practiceIndex.map(async (id) => {
        const p: any = await practicesStore.get(`practice-${id}`, { type: 'json' });
        if (!p || p.status === 'cancelled') return;
        if (p.date === wednesdayStr) hasWedPractice = true;
        if (p.date === fridayStr) hasFriPractice = true;
      })
    );

    // Check for upcoming fixtures this week
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

    const hasPractice = hasWedPractice || hasFriPractice;
    const hasFixtures = upcomingFixtures.length > 0;

    if (!hasPractice && !hasFixtures) {
      console.log('[schedule-sunday] Nothing to notify about. Skipping.');
      return { statusCode: 200 };
    }

    let body: string;
    if (hasPractice && hasFixtures) {
      body = 'Vote for practice sessions and fixtures for this week. Polls are open.';
    } else if (hasPractice) {
      body = 'Vote for practice sessions for this week. Polls are open.';
    } else {
      body = 'Vote for fixtures for this week. Polls are open.';
    }

    const result = await sendPushToAll({
      title: 'Vote for This Week',
      body,
      url: hasPractice ? '/mypractice' : '/myfixtures',
    });

    console.log(`[schedule-sunday] Notification sent to ${result.sent} players.`);
    return { statusCode: 200 };
  } catch (err) {
    console.error('[schedule-sunday] Error:', err);
    return { statusCode: 500 };
  }
});
