/**
 * Wednesday 9 AM Pacific scheduled job (runs Wed 16:00 UTC).
 *
 * Sends a "voting closes today at 6 PM" reminder if any fixtures
 * exist for the coming weekend (next 5 days).
 */
import { schedule } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { getPacificNow, parseLocalDate } from './_utils';
import { sendPushToAll } from './_push-utils';

export const handler = schedule('0 16 * * 3', async () => {
  console.log('[schedule-wednesday] Starting Wednesday 9 AM job');

  try {
    const now = getPacificNow();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);

    // ── Get active season ─────────────────────────────────────────────────────

    const seasonsStore = getStore({
      name: 'seasons',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const activeSeason: any = await seasonsStore.get('active-season', { type: 'json' });

    if (!activeSeason?.id) {
      console.log('[schedule-wednesday] No active season. Exiting.');
      return { statusCode: 200 };
    }

    // ── Check for weekend fixtures ────────────────────────────────────────────

    const fixturesStore = getStore({
      name: 'fixtures',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const allFixtures: any[] =
      (await fixturesStore.get(`fixtures-${activeSeason.id}`, { type: 'json' })) || [];

    const weekendFixtures = allFixtures.filter((f) => {
      const d = parseLocalDate(f.date);
      d.setHours(0, 0, 0, 0);
      return d >= today && d <= fiveDaysLater;
    });

    if (weekendFixtures.length === 0) {
      console.log('[schedule-wednesday] No weekend fixtures. Skipping reminder.');
      return { statusCode: 200 };
    }

    const result = await sendPushToAll({
      title: 'Fixture Voting Closes Today at 6 PM',
      body: `${weekendFixtures.length} match${weekendFixtures.length > 1 ? 'es' : ''} this weekend — mark your availability before 6 PM today.`,
      url: '/myfixtures',
    });

    console.log(`[schedule-wednesday] Reminder sent to ${result.sent} players.`);
    return { statusCode: 200 };
  } catch (err) {
    console.error('[schedule-wednesday] Error:', err);
    return { statusCode: 500 };
  }
});
