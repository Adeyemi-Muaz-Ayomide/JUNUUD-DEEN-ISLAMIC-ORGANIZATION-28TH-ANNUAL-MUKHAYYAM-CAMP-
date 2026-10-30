// POST /api/initialize
// Saves the registration as "pending" and returns a Paystack checkout link.

import { randomBytes } from 'node:crypto';
import { db, json, paystack } from './_lib.js';
import { MAX_PARTICIPANTS, validateParticipant } from '../lib/validation.js';
import { PRICES, quote } from '../lib/pricing.js';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const list = Array.isArray(body?.participants) ? body.participants : [];
  if (list.length < 1 || list.length > MAX_PARTICIPANTS) {
    return json({ error: `Register between 1 and ${MAX_PARTICIPANTS} participants.` }, 400);
  }

  const participants = [];
  const errors = [];
  list.forEach((p, i) => {
    const result = validateParticipant(p ?? {}, i === 0);
    participants.push(result.data);
    errors.push(result.errors);
  });
  if (errors.some((e) => Object.keys(e).length)) {
    return json({ error: 'Please correct the highlighted fields.', fieldErrors: errors }, 400);
  }

  const q = quote(participants.map((p) => p.category));
  const payer = participants[0];
  const reference = 'JDM26-' + randomBytes(6).toString('hex').toUpperCase();

  try {
    const [reg] = await db('registrations', {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        reference,
        payer_name: payer.full_name,
        payer_email: payer.email,
        payer_phone: payer.phone,
        tier: q.tier,
        participant_count: participants.length,
        subtotal: q.subtotal,
        fee: q.fee,
        total: q.total,
      },
    });

    await db('participants', {
      method: 'POST',
      body: participants.map((p) => ({
        ...p,
        email: p.email || null,
        phone: p.phone || null,
        medical_notes: p.medical_notes || null,
        price: PRICES[q.tier][p.category],
        registration_id: reg.id,
      })),
    });
  } catch (err) {
    console.error(err);
    return json({ error: 'Could not save your registration. Please try again.' }, 500);
  }

  const origin = process.env.SITE_URL || new URL(request.url).origin;
  const { ok, data } = await paystack('/transaction/initialize', {
    method: 'POST',
    body: {
      email: payer.email,
      amount: q.total * 100, // kobo
      currency: 'NGN',
      reference,
      callback_url: `${origin}/success.html`,
      metadata: {
        payer_name: payer.full_name,
        participants: participants.length,
        custom_fields: [
          { display_name: 'Payer', variable_name: 'payer_name', value: payer.full_name },
          { display_name: 'Participants', variable_name: 'participants', value: String(participants.length) },
        ],
      },
    },
  });

  if (!ok) {
    console.error('Paystack initialize failed', data);
    return json({ error: 'Could not start payment. Please try again.' }, 502);
  }

  return json({ reference, authorization_url: data.data.authorization_url });
}
