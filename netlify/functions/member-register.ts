import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../../src/middleware/auth';
import type { Player } from '../../src/types/player';

export default async (req: Request, context: Context) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse request body
    const { email, password, firstName, lastName, phone } = await req.json();

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, firstName, lastName' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength (min 8 characters)
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate name lengths
    if (firstName.length < 1 || firstName.length > 100) {
      return new Response(
        JSON.stringify({ error: 'First name must be 1-100 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (lastName.length < 1 || lastName.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Last name must be 1-100 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Normalize email (lowercase)
    const normalizedEmail = email.toLowerCase().trim();

    // Validate phone format if provided (expecting: "+1 1234567890")
    if (phone && phone.trim()) {
      const phoneRegex = /^\+\d{1,4}\s\d{7,15}$/;
      if (!phoneRegex.test(phone.trim())) {
        return new Response(
          JSON.stringify({ error: 'Invalid phone format. Expected format: +1 1234567890' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Load existing players
    const playersStore = getStore({
      name: 'players',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const playersData = await playersStore.get('players-all', { type: 'json' });
    const players: Player[] = (playersData as Player[]) || [];

    // Check if email already exists (case-insensitive)
    const emailExists = players.some(
      (p) => p.email?.toLowerCase() === normalizedEmail
    );

    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'Email already registered' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create new player record with pending registration
    const now = new Date().toISOString();
    const newPlayer: Player = {
      id: uuidv4(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone && phone.trim() ? phone.trim() : undefined,
      role: '', // Empty - will be set during approval
      isActive: false, // Becomes true on approval
      createdAt: now,
      updatedAt: now,
      createdBy: 'member-registration',
      updatedBy: 'member-registration',

      // Authentication fields
      passwordHash,
      registrationStatus: 'pending',
      role_auth: 'member',
      registeredAt: now,
    };

    // Add to players array
    players.push(newPlayer);

    // Save to Blobs
    await playersStore.setJSON('players-all', players);

    console.log('Member registered successfully:', {
      id: newPlayer.id,
      email: newPlayer.email,
      hasPasswordHash: !!newPlayer.passwordHash,
      registrationStatus: newPlayer.registrationStatus,
      role_auth: newPlayer.role_auth
    });

    // Create audit log entry
    const auditLogsStore = getStore({
      name: 'audit-logs',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });
    const auditLogs = (await auditLogsStore.get('logs', { type: 'json' })) || [];

    auditLogs.push({
      id: uuidv4(),
      timestamp: now,
      action: 'MEMBER_REGISTRATION',
      username: normalizedEmail,
      details: `New member registration: ${firstName} ${lastName} (${normalizedEmail})`,
      entityType: 'player',
      entityId: newPlayer.id,
    });

    await auditLogsStore.setJSON('logs', auditLogs);

    // Return success (do NOT log in automatically - must be approved first)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Registration submitted. An admin will review your request.',
        email: normalizedEmail,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Member registration error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process registration' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
