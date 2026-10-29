// Server-only helpers. Files starting with "_" are not exposed as API routes by Vercel.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://loylprtgfvxrxqyidber.supabase.co';

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

// Minimal Supabase REST (PostgREST) client using the service role key.
export async function db(path, { method = 'GET', body, prefer } = {}) {
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  // Legacy keys are JWTs and go in Authorization; new sb_secret_ keys only go in apikey.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  if (prefer) headers.Prefer = prefer;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path} failed (${res.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

export async function paystack(path, { method = 'GET', body } = {}) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${requireEnv('PAYSTACK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.status === true, data };
}

export async function getRegistration(reference) {
  const rows = await db(
    `registrations?reference=eq.${encodeURIComponent(reference)}` +
      '&select=*,participants(reg_code,full_name,category,gender,price,id)'
  );
  const reg = rows?.[0];
  if (reg) reg.participants.sort((a, b) => a.id - b.id);
  return reg ?? null;
}

// Checks the payment with Paystack and, if it is genuinely successful for the
// right amount, marks the registration as paid. Returns the updated registration.
export async function confirmPayment(reference) {
  const reg = await getRegistration(reference);
  if (!reg || reg.status === 'paid') return reg;

  const { ok, data } = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (!ok) return reg;

  const tx = data.data;
  if (tx.status === 'success' && tx.currency === 'NGN' && tx.amount === reg.total * 100) {
    await db('rpc/mark_paid', {
      method: 'POST',
      body: { p_reference: reference, p_paystack_id: tx.id },
    });
    return getRegistration(reference);
  }

  if (['failed', 'abandoned', 'reversed'].includes(tx.status)) {
    await db(`registrations?reference=eq.${encodeURIComponent(reference)}&status=eq.pending`, {
      method: 'PATCH',
      body: { status: 'failed' },
    });
    return { ...reg, status: 'failed' };
  }
  return reg;
}
