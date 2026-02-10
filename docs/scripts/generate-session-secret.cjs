#!/usr/bin/env node

/**
 * Generate a secure random session secret for JWT signing
 * Usage: node scripts/generate-session-secret.js
 */

const crypto = require('crypto');

const secret = crypto.randomBytes(64).toString('hex');

console.log('\n=================================');
console.log('Generated Session Secret:');
console.log('=================================\n');
console.log(secret);
console.log('\n=================================');
console.log('Add this to your .env file:');
console.log('=================================\n');
console.log(`SESSION_SECRET=${secret}`);
console.log('\n');
