// GET /api/verify?reference=...
// Called by the confirmation page after Paystack redirects back.

import { confirmPayment, json } from './_lib.js';

export async function GET(request) {
  const reference = new URL(request.url).searchParams.get('reference') || '';
  if (!/^JDM2[68]-[0-9A-F]{12}$/.test(reference)) {
    return json({ error: 'Invalid payment reference.' }, 400);
  }

  let reg;
  try {
    reg = await confirmPayment(reference);
  } catch (err) {
    console.error(err);
    return json({ error: 'Could not check your payment. Please refresh in a moment.' }, 500);
  }
  if (!reg) return json({ error: 'Registration not found.' }, 404);

  return json({
    reference: reg.reference,
    status: reg.status,
    payer_name: reg.payer_name,
    payer_email: reg.payer_email,
    tier: reg.tier,
    subtotal: reg.subtotal,
    fee: reg.fee,
    total: reg.total,
    paid_at: reg.paid_at,
    participants: reg.participants.map((p) => ({
      reg_code: p.reg_code,
      full_name: p.full_name,
      category: p.category,
      price: p.price,
    })),
  });
}
