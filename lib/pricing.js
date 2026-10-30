// Shared by the browser (for display) and the server (which is the source of truth).

// Early-bird prices apply until the end of 4th December 2026, Lagos time.
export const EARLY_BIRD_ENDS = new Date('2026-12-05T00:00:00+01:00');

export const PRICES = {
  early: { adult: 20500, others: 17500 },
  // early: { adult: 100, others: 100 },
  regular: { adult: 25500, others: 20500 },
};

export const CATEGORY_LABELS = {
  adult: 'Adult',
  others: 'Others (Students & Children)',
};

export function currentTier(now = new Date()) {
  return now < EARLY_BIRD_ENDS ? 'early' : 'regular';
}

// Paystack Nigeria local fee: 1.5% + ₦100 (₦100 waived under ₦2,500), capped at ₦2,000.
// Returns the amount to charge so that the organisation still receives the full subtotal.
// export function amountWithPaystackFee(subtotal) {
//   const flat = subtotal >= 2500 ? 100 : 0;
//   let total = Math.ceil((subtotal + flat) / (1 - 0.015));
//   if (total - subtotal > 2000) total = subtotal + 2000;
//   return total;
// }

// categories: array like ['adult', 'others', ...]
export function quote(categories, now = new Date()) {
  const tier = currentTier(now);
  const counts = { adult: 0, others: 0 };
  for (const c of categories) counts[c] += 1;
  const subtotal = counts.adult * PRICES[tier].adult + counts.others * PRICES[tier].others;
  return { tier, counts, subtotal, fee: 0, total: subtotal };
}

export function naira(n) {
  return '₦' + Number(n).toLocaleString('en-NG');
}
