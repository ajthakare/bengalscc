import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

/**
 * Submit a password reset request
 * POST /api/password-reset-request
 * Body: { email }
 * Public endpoint (no auth required)
 * Returns: Success message
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { email } = body;

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid email format' }),
      };
    }

    // Get players store to verify email exists
    const playersStore = getStore({
      name: 'players',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    const playersData = await playersStore.get('players-all', { type: 'json' }) as any[] | null;
    const players = playersData || [];

    // Find user by email (case-insensitive)
    const user = players.find((p: any) =>
      p.email && p.email.toLowerCase() === email.toLowerCase()
    );

    // Always return success message for security (don't reveal if email exists)
    // But only create request if user exists
    if (user && user.passwordHash) {
      // Get password reset requests store
      const requestsStore = getStore({
        name: 'password-reset-requests',
        siteID: process.env.SITE_ID || '',
        token: process.env.NETLIFY_AUTH_TOKEN || '',
      });

      const requestsData = await requestsStore.get('requests', { type: 'json' }) as any[] | null;
      const requests = requestsData || [];

      // Check if there's already a pending request for this email
      const existingRequest = requests.find(
        (r: any) => r.email === email && r.status === 'pending'
      );

      if (!existingRequest) {
        // Create new request
        const newRequest = {
          id: `reset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          email: email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: 'pending', // pending, completed, rejected
          requestedAt: new Date().toISOString(),
          completedAt: null,
          completedBy: null,
        };

        requests.push(newRequest);

        // Save to store
        await requestsStore.set('requests', JSON.stringify(requests));
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Password reset request submitted. An admin will review your request and contact you with a temporary password.',
      }),
    };
  } catch (error) {
    console.error('Error submitting password reset request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to submit password reset request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
