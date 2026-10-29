# Junuud Deen Islamic Organization — 28th Annual Mukhayyam (Camp)

Registration website: visitors fill in their details (for themselves and others), pay on Paystack,
and get a confirmation receipt with a Registration ID for each participant (e.g. `JDM28-0001`).

- **Frontend:** plain HTML/CSS/JS (`index.html`, `success.html`)
- **Backend:** Vercel functions in `api/` (start payment, verify payment, Paystack webhook)
- **Database:** Supabase (`supabase/schema.sql`)

## Pricing

| Category                     | Early bird (until 4 Dec 2026) | Regular |
| ---------------------------- | ----------------------------- | ------- |
| Adult                        | ₦20,500                       | ₦25,500 |
| Others (Students & Children) | ₦17,500                       | ₦20,500 |

The Paystack charge (1.5% + ₦100, capped at ₦2,000) is added on top so the organisation receives the
full fee. Prices and the early-bird deadline live in `lib/pricing.js`.

## Setup (one time)

### 1. Create the database tables

Supabase dashboard → **SQL Editor** → **New query** → paste everything from `supabase/schema.sql` → **Run**.

### 2. Get your keys

- **Supabase service role key:** Supabase → Project Settings → API Keys → copy the `service_role`
  (or `secret`) key. Keep it private.
- **Paystack secret key:** Paystack → Settings → API Keys & Webhooks → copy the **Test Secret Key**
  (`sk_test_...`) for testing.

### 3. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repository.
2. Framework preset: **Other**. Leave build settings empty.
3. Under **Environment Variables**, add:

   | Name                        | Value                                        |
   | --------------------------- | -------------------------------------------- |
   | `PAYSTACK_SECRET_KEY`       | your `sk_test_...` key (later `sk_live_...`) |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service role key               |

4. Click **Deploy**.

### 4. Set the Paystack webhook

Paystack → Settings → API Keys & Webhooks → **Test Webhook URL**:
`https://YOUR-SITE.vercel.app/api/webhook`

This confirms registrations even if someone pays and closes the tab before seeing the receipt.

### 5. Test

Register using a [Paystack test card](https://paystack.com/docs/payments/test-payments/)
(e.g. `4084 0840 8408 4081`, any future expiry, CVV `408`).

### 6. Go live

Replace `PAYSTACK_SECRET_KEY` in Vercel with your **live** secret key (`sk_live_...`), set the
**Live Webhook URL** in Paystack to the same `/api/webhook` address, then redeploy
(Vercel → Deployments → ⋯ → Redeploy).

## Viewing registrations

Supabase → **Table Editor** → `paid_participants` shows everyone who has paid, with their
Registration IDs. Use **Export → CSV** to download it. Unpaid attempts stay in `registrations`
with status `pending` or `failed`.
