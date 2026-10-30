# Junuud Deen Islamic Organization — 28th Annual Mukhayyam (Camp)

Registration website: visitors fill in their details (for themselves and others), pay on Paystack,
and get a confirmation receipt with a Registration ID for each participant (e.g. `JDM26-0001`).

- **Frontend:** plain HTML/CSS/JS (`index.html`, `success.html`)
- **Backend:** Vercel functions in `api/` (start payment, verify payment, Paystack webhook)
- **Database:** Supabase (`supabase/schema.sql`)

## Pricing

| Category                     | Early bird (until 4 Dec 2026) | Regular |
| ---------------------------- | ----------------------------- | ------- |
| Adult                        | ₦20,500                       | ₦25,500 |
| Others (Students & Children) | ₦17,500                       | ₦20,500 |

The payer pays exactly these amounts; Paystack's charge is deducted from what the organisation
receives. Up to 5 participants can be registered in one payment. Prices and the early-bird deadline
live in `lib/pricing.js`; the participant limit is `MAX_PARTICIPANTS` in `lib/validation.js`.

## Go-live guide

Do these in order. Steps 1–6 use **test** keys (no real money); step 7 switches to **live**.

### 1. Database (Supabase)
1. Open your project at supabase.com → **SQL Editor** → **New query**.
2. Paste everything from `supabase/schema.sql` → **Run**. It is safe to run again; re-run it
   whenever this file changes (e.g. the `JDM26-` ID change).
3. Check **Table Editor** shows `registrations`, `participants` and `paid_participants`.

### 2. Supabase key
Project Settings → **API Keys** → copy the **`service_role`** key (legacy tab) or a **secret key**
(`sb_secret_...`). Never put this key in the website code or share it.

### 3. Paystack keys
Paystack dashboard → **Settings → API Keys & Webhooks**. For now copy the **Test Secret Key**
(`sk_test_...`). The public keys (`pk_...`) are not needed by this site.

### 4. Vercel
1. [vercel.com/new](https://vercel.com/new) → import this GitHub repository.
2. Framework preset: **Other**. Leave build/output settings empty.
3. **Environment Variables** (apply to Production, Preview and Development):

   | Name                        | Value                                    |
   | --------------------------- | ---------------------------------------- |
   | `PAYSTACK_SECRET_KEY`       | `sk_test_...` now, `sk_live_...` at step 7 |
   | `SUPABASE_SERVICE_ROLE_KEY` | the key from step 2                      |

4. **Deploy**.
5. Settings → **Git** → make sure **Production Branch** is the branch that holds this code
   (or merge it into `main`). Only production deployments are public; preview deployments are
   password-protected by Vercel, which would block visitors and Paystack.
6. Optional: Settings → **Domains** to add your own domain. If you do, also add the variable
   `SITE_URL` = `https://your-domain` so Paystack returns people to that address.

### 5. Paystack webhook (test)
Settings → API Keys & Webhooks → **Test Webhook URL** → `https://YOUR-SITE.vercel.app/api/webhook` → Save.

### 6. Test end to end
1. Open the site, register 2 participants, click **Pay**.
2. Use a [Paystack test card](https://paystack.com/docs/payments/test-payments/):
   `4084 0840 8408 4081`, any future expiry, CVV `408`.
3. You should land on the receipt with `JDM26-` IDs.
4. Supabase → `paid_participants` should list both people.
5. Also try: closing the tab right after paying (the webhook should still mark it paid), and
   cancelling on Paystack (status should become `failed`).

### 7. Go live (real money)
1. Paystack must have your business **activated for live payments** (Paystack → Settings →
   Business / Compliance: business details, bank account for settlements, ID). Until approved,
   live keys will not accept payments.
2. Copy the **Live Secret Key** (`sk_live_...`).
3. Vercel → Settings → Environment Variables → edit `PAYSTACK_SECRET_KEY` → paste the live key → Save.
4. Paystack → **Live Webhook URL** → `https://YOUR-SITE.vercel.app/api/webhook` → Save.
5. Clear the test data so real IDs start at `JDM26-0001`. In Supabase SQL Editor run:

   ```sql
   truncate public.participants, public.registrations restart identity cascade;
   alter sequence public.reg_code_seq restart with 1;
   ```

6. Vercel → **Deployments** → latest → ⋯ → **Redeploy** (environment variable changes only
   apply after a redeploy).
7. Make one real payment yourself to confirm, then refund it from Paystack → Transactions if you
   wish (refunds are not reflected in the database; delete that row manually).

## Viewing registrations

Supabase → **Table Editor** → `paid_participants` shows everyone who has paid, with their
Registration IDs. Use **Export → CSV** to download it. Unpaid attempts stay in `registrations`
with status `pending` or `failed`.
