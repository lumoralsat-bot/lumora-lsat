# Security upgrade: what to click, in order

This upgrade moves Lumora to **Supabase Auth with Row-Level Security**. It fixes audit risks R-2, R-4 and R-5:

- **R-2:** the database was open to anyone holding the public key.
- **R-4:** Pro could be granted from the browser.
- **R-5:** passwords used homemade hashing.

The code and SQL are already in this repo. You only need to do the steps below in the Supabase, Vercel and Stripe dashboards.

**Order matters.** Do 1 → 2 → 3 → 4 → 5. Step 5 locks the database, so it must come after the new code is live, or the old site stops saving.

Allow about 30–45 minutes.

---

## Before you start: back up

Supabase → **Database → Backups**. Confirm there is a recent backup, or download one.

Extra safety: **Table Editor → users → Export → CSV**. Keep this file somewhere private: it contains password hashes. Delete it once the upgrade is done.

## Step 0: check for duplicate emails (1 min)

Supabase → **SQL Editor** → run:

```sql
select lower(email) as email, count(*) from public.users group by 1 having count(*) > 1;
```

- **No rows returned:** go on to Step 1.
- **Rows returned:** stop and tell me. Two profiles share an email, and they must be merged first.

## Step 1: Supabase Auth settings (5 min)

1. **Authentication → Sign In / Providers → Email:**
   - Turn **Email** on.
   - Keep **Confirm email ON.** This stops people from registering an address they don't own.
   - Set minimum password length to **8**.
2. **Authentication → URL Configuration:**
   - **Site URL:** `https://YOUR-DOMAIN`
   - **Redirect URLs:** add `https://YOUR-DOMAIN/**`. If you test on Vercel preview links, also add `https://*.vercel.app/**`.
3. **Authentication → Emails → SMTP Settings.** Recommended before real students use it. Supabase's built-in email sender is limited to a few emails per hour, which is fine for testing but not for launch. Any SMTP provider works (Resend, Postmark, SendGrid, …).

## Step 2: run the prepare SQL (1 min, safe while the site is live)

SQL Editor → paste all of [`supabase/migrations/001_prepare_auth.sql`](../supabase/migrations/001_prepare_auth.sql) → **Run**.

This only adds columns, indexes and a server-only lookup function. The current site keeps working.

## Step 3: Vercel environment variables (5 min)

Go to Vercel → your project → **Settings → Environment Variables**.

| Name | Value | Notes |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** (secret) | Mark **Sensitive**. Never put a `VITE_` prefix on it. |
| `SITE_URL` | `https://YOUR-DOMAIN` | Used for safe redirects (checkout, password emails). |
| `ANTHROPIC_API_KEY` | your Anthropic key | From the previous step, if not done yet. |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → your endpoint → **Signing secret** | **Required now.** Unsigned webhook calls are rejected. |
| `PROMO_CODES` | optional, e.g. `EARLYACCESS,BETA2026` | Codes that grant Pro. They are checked on the server; leave unset to disable. |

Keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Those are meant to be public.

**Delete** `VITE_ANTHROPIC_API_KEY` if it is still there.

In Stripe, confirm the webhook endpoint (`https://YOUR-DOMAIN/api/webhook`) sends these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`

## Step 4: deploy the code, then test (10 min)

Commit and push the repo (GitHub Desktop: *Commit to main → Push origin*). Vercel deploys automatically.

On the live site, check each of these:

- [ ] **Existing account:** sign in with your *old* password. You land on Home with your progress intact. This sign-in moves the account to Supabase Auth in the background.
- [ ] Sign out, then sign in again with the same password. It still works.
- [ ] **New account:** sign up with a different email, then click the confirmation email. You are signed in and see the diagnostic.
- [ ] **Forgot password:** use it on an account, follow the email link, and set a new password.
- [ ] Answer one question, refresh the page, and confirm the progress is still there.

## Step 5: lock the database (1 min)

SQL Editor → paste all of [`supabase/migrations/002_lockdown_rls.sql`](../supabase/migrations/002_lockdown_rls.sql) → **Run**.

Then verify:

- [ ] Table Editor → `users` shows **RLS enabled**.
- [ ] Repeat the sign-in and answer-a-question checks from Step 4.
- [ ] Outside check: run this from a terminal (replace the two values). It must return a *permission denied* error, not data.

```bash
curl "https://YOUR-PROJECT.supabase.co/rest/v1/users?select=email" -H "apikey: YOUR-ANON-KEY"
```

## Step 6: in 60–90 days, delete old password hashes

SQL Editor → run [`supabase/migrations/003_cleanup_legacy_passwords.sql`](../supabase/migrations/003_cleanup_legacy_passwords.sql).

Students who never signed in during that window can still use **Forgot password?**. They get an email to set a password, and their progress links back automatically.

---

## If something goes wrong

- **Site can't save after Step 5:** run `alter table public.users disable row level security;` as a temporary emergency switch, then tell me what you saw. Turn it back on (re-run 002) once fixed.
- **Rolling back the code:** you can redeploy the previous commit, but accounts that already migrated no longer have an old password hash. The old code cannot sign them in. Fix forward instead of rolling back.

## What changed for privacy

- **Passwords** are handled only by Supabase Auth, which hashes them with bcrypt. The app never sees stored passwords. Old SHA-256 hashes are erased the moment each account migrates, and the column is dropped in Step 6.
- **Database access:** a signed-in browser can read and change only its own row. Hashes, Stripe IDs and the Pro flag are not writable from the browser. The public key alone reads nothing. This was verified with 26 assertions against a real Postgres (`supabase/tests/rls_test.sql`).
- **Pro and payments:** Pro is granted only by the verified Stripe webhook or a server-checked promo code. Checkout, cancel and delete act only on the signed-in account, never on an email typed into a request. Before, anyone could cancel anyone's subscription by email.
- **No account guessing:** sign-in and reset messages are identical whether or not an email has an account. Attempts are rate-limited.
- **Account deletion:** Profile → **Delete Account** cancels billing, deletes the profile and the login, and clears this device's cached data. The Privacy Policy promised this, but the app didn't offer it until now.
- **Data minimization:** student names are no longer sent to the AI provider. Server logs contain no emails, names, passwords or tokens. The `/api/test` health check no longer reveals key lengths. Signing out clears the cached profile from the device.
- **Privacy Policy** now says plainly that AI features send study content (not names or emails) to Anthropic. *I'm not a lawyer: have the policy reviewed if you serve users in regulated regions (e.g. GDPR/CCPA).*

## Known remaining items (not blockers)

- Mistake Journal, SRS schedule, score history and daily free-tier counters are still stored only in the browser, so free-tier limits can be bypassed. Move them server-side in a later phase.
- `App.jsx` still includes about 1.7 MB of inline images (performance, not security).
