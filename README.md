# RecordIn — record every penny

A private, dark-mode expense tracker for a few people. Log monthly income and daily expenses, see this month's report and an all-time report, and let one super admin keep an eye on every account.

Built with Next.js 16, shadcn/ui, Tailwind CSS 4 and Supabase. Works on phones (add it to your Home Screen) and laptops.

---

## What it does

| | |
|---|---|
| **Home** | Banking-style home: a balance card, quick actions, budget meter, spending insights, recent transactions, borrow & lend and daily spending |
| **Transactions** | One feed of every movement of money — expenses, income, borrowed, lent and settled — with Money in / Money out / Borrow & lend filters, search and a statement download |
| **Budgets** | An overall monthly budget plus per-category limits, with "safe to spend per day" and On track / Close to limit / Over budget status |
| **Privacy** | The eye button blurs every amount (remembered per device) |
| **Welcome & tour** | First sign-in shows intro slides and a currency picker, then a spotlight tour of Home. Replay it any time from the ? button, the More menu or Profile |
| **Accounts** | Email + password or Google sign-in, sign-up, password reset, profile page, sign-out |
| **Roles** | The **first account ever created becomes super admin**. Everyone after that is a regular user |
| **Income** | Multiple income entries per month (salary, freelance…) |
| **Expenses** | Amount, category, description, date, payment method. Search and filter by category |
| **Edit window** | Entries can be edited or deleted for **30 minutes** after adding. After that they're locked. Users see a reminder before saving |
| **Reports** | This-month report (daily chart, categories, highlights, payment methods) and an overall report (month-by-month, all-time categories) |
| **Super admin** | Sees every account (read-only), downloads CSVs per person or for everyone, can deactivate an account. **Can't edit anyone else's entries** |
| **Notifications** | The super admin is notified when someone adds, edits, settles or deletes an entry or joins. A toast appears right after signing in |
| **Borrow & lend** | Record money you borrowed (you owe) or lent (you're owed), with an optional return date. Mark entries as paid back / received at any time — even after the 30-minute lock — and see overdue ones |
| **Currencies** | Every user picks a main currency on first sign-in (changeable in Profile). Any entry can be added in another currency (USD, EUR, AED…) and is converted with the day's exchange rate; totals and reports are always in the main currency |
| **Aims** | Save for something: give it a cost, a date and a rhythm (daily, weekly, monthly or yearly). RecordIn works out the instalment — *what's left ÷ periods left* — and asks for it each period. Money you set aside leaves your available balance and waits in the **aims wallet**; taking it back puts it straight back. Miss a period and it asks one question: add time, or keep the date and save a bit more |
| **Install** | A full progressive web app: install it on a phone or desktop from Profile → Install, launch it full-screen, and see a proper offline page instead of a browser error |

---

### The one rule about money

Nothing can be spent, lent or set aside beyond what you actually have:

```
available = income − spending + money borrowed − money lent out − money in aims
```

That total is all-time, not monthly, because next month's income often arrives on the 25th and what you don't spend carries forward. Months are only a reporting lens: each month's report shows what was **carried in**, what came **in**, what went **out**, what went **into aims**, and what was **left at the end**.

---

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   Already ran an earlier version? Run the updated file again — it upgrades the database in place and keeps your data. **Do this before deploying a new version of the app**, since new screens depend on new database functions.
   It creates the tables, Row Level Security policies, triggers and RPC functions. It's safe to run again.
3. **Authentication → Sign In / Providers → Email**: keep *Confirm email* on and set the minimum password length to **8**.

## 2. Fill in `.env.local`

`.env.local` already has every key with comments. You only need to paste two values:

| Key | Where to find it |
|---|---|
| `SUPABASE_URL` | Project Settings → Data API → Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → Publishable key (the legacy *anon* key also works) |
| `APP_URL` | `http://localhost:3000` locally, your Vercel URL in production |
| `APP_START_MONTH` | First month shown in month pickers (default `2026-09`) |
| `APP_CURRENCY` / `APP_LOCALE` / `APP_TIMEZONE` | Default `PKR` / `en-PK` / `Asia/Karachi`. `APP_CURRENCY` is only the suggestion on the welcome screen — each user picks their own main currency |

> Never use the `service_role` / secret key. The app doesn't need it.

## 3. Allow the sign-in redirects

In Supabase → **Authentication → URL Configuration**:

- **Site URL:** your `APP_URL`
- **Redirect URLs:** add
  - `http://localhost:3000/auth/callback`
  - `https://YOUR-APP.vercel.app/auth/callback`

## 4. Turn on Google sign-in (optional)

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an **OAuth client ID → Web application**.
2. Add this **Authorized redirect URI**: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
3. In Supabase → **Authentication → Sign In / Providers → Google**, enable it and paste the Client ID and Client Secret.

## 5. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 and **sign up first** — that account becomes the super admin.

## 6. Deploy to Vercel

1. Push the project to a GitHub repository and import it in Vercel.
2. Add the same environment variables in **Vercel → Settings → Environment Variables** (set `APP_URL` to the Vercel URL).
3. Deploy, then update the Supabase **Site URL** and **Redirect URLs** to the production address.

On iPhone: open the site in Safari → Share → **Add to Home Screen** for a full-screen app.

## 7. Lock down sign-ups when everyone has joined

Once your 2–3 people have accounts, go to **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**. Nobody else can create an account after that. You can also deactivate any account from **All accounts**.

---

## How the security works

- **Keys stay on the server.** There are no `NEXT_PUBLIC_` variables. Every Supabase call runs in Server Components, Server Actions or Route Handlers, so the project URL and key never ship in browser JavaScript. The browser only talks to your own domain.
- **Row Level Security on every table.** Signed-in users can only read their own rows; the super admin can read all rows. The `anon` role has no access at all.
- **Writes only through RPC functions.** There are no insert/update/delete grants on the tables. Functions like `add_expense` check sign-in, account status, ownership, input and the edit window, and raise friendly errors.
- **Triggers double-check the rules** at table level: the edit window, immutable columns (`user_id`, `created_at`, `editable_until`), and roles that can't be changed from the app. `editable_until` is set from the database clock, never from the client.
- **First-user super admin** is decided inside the sign-up trigger with an advisory lock, so two simultaneous sign-ups can't both win. The role is never read from user-supplied metadata.
- **Abuse guards:** duplicate double-taps are skipped, and each account can add at most 150 entries per hour.
- **Headers:** a per-request nonce-based Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, no `X-Powered-By`, no production source maps, and `noindex` so search engines skip the site.
- **Safer exports:** CSV cells that start with `=`, `+`, `-` or `@` are escaped so spreadsheets can't run them as formulas.
- **Open-redirect protection** on every `?next=` parameter.

About "obfuscation": production builds are already minified and ship without source maps. The real protection is that the keys and database calls never reach the browser, and the database enforces every rule by itself.

## Customizing

- **Edit window:** change `private.edit_window()` in `supabase/schema.sql` and run the file again. The app reads the value from the database.
- **Categories:** edit the seed list in `supabase/schema.sql` and the icon map in `src/lib/categories.ts`.
- **App name:** `src/lib/constants.ts`.
- **Currencies:** the supported list is in `src/lib/currencies.ts`. Rates come from [open.er-api.com](https://open.er-api.com) (free, no key), are fetched on the server only and cached for 6 hours. Each entry stores the amount as typed, the rate used and the converted amount; switching main currency re-converts with fresh rates.
- **Confirmation links opened on another device:** by default a link only works in the browser that requested it. To allow any device, change the Supabase email templates to link to
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` (use `type=recovery` in the reset-password template).

## Project structure

```
supabase/schema.sql          Tables, RLS, triggers, RPC functions (run in SQL Editor)
src/proxy.ts                 Session refresh, route protection, CSP nonce
src/lib/data.ts              Server-side data access (RPC calls)
src/lib/validation.ts        Zod schemas shared by forms and server actions
src/app/actions/             Server actions (auth, expenses, incomes, account)
src/app/api/export/          CSV download
src/app/(app)/               Dashboard, expenses, income, reports, admin, profile, notifications
src/app/login, signup, …     Auth screens
src/components/              App UI built on shadcn/ui (blocks: dashboard-01, login-02, signup-02)
```
