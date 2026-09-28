/**
 * Quick test script — triggers the reminder service immediately.
 * Usage: node test-reminder.js
 *
 * Requires gateway to be running (locally or on server).
 * Set GATEWAY_URL and INTERNAL_API_KEY env vars or edit the defaults below.
 */
'use strict';

const GATEWAY_URL    = process.env.GATEWAY_URL    || 'http://localhost:8080';
const INTERNAL_KEY   = process.env.INTERNAL_API_KEY || 'gw_secure_2024_x9m8n7b6v5c4x3z2a1s9d8f7g6h5j4k3l2';

async function main() {
  console.log(`📅 Triggering reminder test on ${GATEWAY_URL} …`);

  const res = await fetch(`${GATEWAY_URL}/api/reminder/test`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INTERNAL_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json().catch(() => ({}));

  if (res.ok) {
    console.log('✅ Triggered:', data.message);
    console.log('👀 Check gateway logs for "📅 Sending reminder" or "no schedules matched"');
  } else {
    console.error('❌ Failed:', res.status, data);
  }
}

main().catch(console.error);
