// POST /api/webhook
// Paystack calls this after a payment, so registrations are confirmed even if the
// payer closes the tab before reaching the confirmation page.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { confirmPayment, json } from './_lib.js';

export async function POST(request) {
  const raw = await request.text();
  const signature = request.headers.get('x-paystack-signature') || '';
  const expected = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '').update(raw).digest('hex');

  const valid =
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return json({ error: 'Invalid signature' }, 401);

  const event = JSON.parse(raw);
  if (event.event === 'charge.success' && event.data?.reference) {
    try {
      await confirmPayment(event.data.reference);
    } catch (err) {
      console.error(err);
      return json({ error: 'Failed to process' }, 500); // Paystack will retry
    }
  }
  return json({ received: true });
}
