# DebtFreedomIQ

**From financial stress to financial freedom.**
DebtFreedomIQ is an AI-powered financial decision platform that helps households move from financial stress to financial freedom through personalised assessment, action planning and guided access to support services.

> *The Intelligence Behind Every Debt Decision.*

## Product

| Page | Access | What it does |
|---|---|---|
| **Financial Health** (`/health`) | Free, no account needed | Income, expenses, debts, assets, savings and situation give **Net Worth, Debt-to-Income, Financial Health Score (0–100), Stress Score, Emergency Fund Score**, charts, AI top-5 recommendations and next steps |
| **Find Help** (`/help`) | Free: help categories + free community/government directory. **Premium:** AI matching, personalised referral brief, contact and hardship-letter templates, "where to find & verify" | Financial Adviser · Mortgage Adviser · Debt Coach · Budget Adviser · Accountant · Lawyer |
| **My Freedom Plan** (`/plan`) | **Premium** (preview for everyone) | Conservative / Balanced / Aggressive scenarios, debt-free & mortgage-free timeline, monthly milestones, payoff strategy (avalanche/snowball), savings targets, goals tracker, AI "what-if" questions, save & regenerate, PDF export |
| Dashboard (`/dashboard`) | Logged in | Latest scores, progress over time, plan & goals |
| Pricing (`/pricing`) | | **Free** · **Premium NZ$19 one-time** (local equivalents) · **Premium Plus NZ$9.99/month** (coming soon; waitlist) |
| Admin (`/admin`) | `ADMIN_EMAILS` | Funnel and insights for your **first 100 users**: debt types, situations, help needed, conversion |

Countries: New Zealand, Philippines, Australia, United Kingdom, United States. Currency, crisis lines and the free-help directory adapt to the user's location (Vercel IP country), and users can change their country in their profile.

## Tech stack
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres + RLS) · OpenAI Responses API (structured outputs) · Recharts · Stripe-ready payments (mocked by default) · Vercel.

## Quick start

```bash
npm install
cp .env.example .env.local    # then fill in the values (see docs/KEYS_GUIDE.md)
npm run dev                   # http://localhost:3000
```

1. **Supabase:** create a project → **SQL Editor** → paste the *contents* of `supabase/schema.sql` → **Run**.
   Then **Authentication → URL Configuration**: add `http://localhost:3000/auth/callback` (and your production URL later) to Redirect URLs.
2. **OpenAI (optional):** add `OPENAI_API_KEY`. Without it, recommendations, plans and briefs come from the built-in rules engine. Everything still works.
3. **Payments:** leave `PAYMENTS_MODE=mock` to test Premium end-to-end with the demo checkout (no money taken).
   For real payments set `PAYMENTS_MODE=stripe` + `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` and add a webhook to `/api/stripe/webhook` (events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`).
4. Visit `/health` → **Try with example data** to see a full result instantly.

### Try Premium locally
Create an account → **Pricing → Get Premium** → **Pay (demo)** → My Freedom Plan and Find Help unlock.

## Deploy to Vercel
1. Push this repo to GitHub → **vercel.com → Add New Project → Import**.
2. Add every variable from `.env.local` in **Settings → Environment Variables** (set `NEXT_PUBLIC_SITE_URL` to your domain).
3. Deploy. Add the production `/auth/callback` URL in Supabase and (for Stripe) the production webhook.

## Project structure

```
app/
  page.tsx                 Landing page
  health/                  Financial Health (free)
  help/                    Find Help (free + premium)
  plan/                    My Freedom Plan (premium + preview)
  dashboard/  account/  pricing/  checkout/  admin/
  login/  signup/  reset-password/  auth/ (callback, signout, server actions)
  api/
    assessment/            POST calculate + AI recommendations (+ save when logged in)
    plan/                  POST generate & save plan · plan/goals · plan/ask
    help/brief/            POST AI referral brief
    checkout/  waiver/  waitlist/  stripe/webhook/
components/                UI kit (ui.tsx), charts (Recharts), wizard, results, plan view…
lib/
  finance.ts               Scores & rule-based recommendations
  plan.ts                  Scenario simulator (avalanche/snowball, milestones, savings)
  ai.ts                    OpenAI calls with guardrails + JSON schemas (falls back to rules)
  help.ts                  Help categories, matching, templates
  countries.ts             Per-country currency, pricing, crisis lines, free-help directory
  payments.ts              Mock / Stripe provider abstraction
  mock-data.ts             Example household
  session.ts  events.ts  assessment.ts  plan-server.ts  supabase/
supabase/schema.sql        8 tables + RLS + profile trigger
docs/KEYS_GUIDE.md         Step-by-step: getting every key
docs/EMAIL_SETUP.md        Branded emails from your own domain (no "Supabase Auth")
middleware.ts              Session refresh, protected routes, anonymous id
```

## Database
`auth.users` (Supabase Auth) · `profiles` · `financial_assessments` · `assets` · `debts` · `expenses` · `financial_plans` · `subscriptions` · `events`. Row-level security means users can only read and write their own rows. Subscriptions and events are written by the server only.

## How the scores work
- **Debt-to-income** = monthly debt repayments ÷ monthly take-home income.
- **Emergency fund** = cash savings ÷ (essential expenses + debt repayments), in months. The score reaches 100 at 6 months.
- **Financial Health (0–100)** = 30% debt-to-income · 20% savings rate · 20% emergency fund · 15% leverage (debts ÷ assets) · 15% high-interest debt share, minus penalties for missed payments, collections or essentials at risk.
- **Stress (0–100)** combines cash-flow gap, repayment burden, buffer, high-interest debt and the hardship flags people tick.

## Responsible design
- Free help is never paywalled. Crisis lines appear on every page and lead the results when stress is high.
- The AI is instructed to give general information only: no product recommendations, payday loans or fee-charging debt settlement, and essentials before debt.
- "Can't afford it?" free Premium option (`HARDSHIP_WAIVER`), tracked separately from sales.
- Positioned as **financial education software**, not debt relief/settlement (matters for Stripe, Google Ads and regulators).
- Have Privacy/Terms reviewed per country before launch.

## Roadmap
- Premium Plus monthly tracking and recalculation (Stripe subscriptions are already supported)
- Bank-statement CSV import · reminders · multi-language (Filipino, Māori, Samoan)
- Referral partnerships (mortgage brokers, advisers) only with clear disclosure and licensing checks

## Billing: unsubscribe, saved cards, renewals

- **My Account → Plan & billing**: see your plan, **Unsubscribe** (Premium switches off immediately), add/delete cards, payment history.
- **Renewals (Premium Plus)**: a daily job (`/api/billing/run`, scheduled in `vercel.json`) charges the saved card and extends 30 days.
  No card → the subscription goes **on hold** (Premium locked, red banner site-wide), a reminder email is sent, again after 3 and 7 days, and it ends after 30 days unpaid. **Pay now** restores access instantly.
- Only Premium is suspended. The free Financial Health check and the free hardship help always stay open.
- Stripe mode: Stripe stores cards and renews; webhooks `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted` keep the status in sync. Add `invoice.payment_failed` to your Stripe CLI `--events` list.
- Testing: Admin page → **Run billing now** / **Test: treat every Premium Plus as due today**.
- Run the new SQL at the bottom of `supabase/schema.sql` in the Supabase SQL editor (safe to run again).

## What-if & Retirement (Premium) + Investment Research Library

- `/whatif`: the person chooses what to do with each property (keep, sell, sell & buy smaller, rent out, interest-only, 30-year term), investments (sell %), a KiwiSaver/retirement hardship withdrawal and spending changes. Before/after table, cash runway, and up to 3 saved scenarios to compare. Logic: `lib/whatif.ts`.
- **Retirement picture**: `lib/library.ts` converts the numbers into the Library's `HouseholdInput` and opens `NEXT_PUBLIC_LIBRARY_URL/?tab=numbers&view=full#plan=…`. The numbers travel in the URL fragment, so no server sees them, and nothing is typed twice. Age and retirement age are asked once (health check step 5, or on the What-if page).
- Deploying both: two Vercel projects. Simplest: Library on a subdomain (e.g. `library.yourdomain.com`) and set `NEXT_PUBLIC_LIBRARY_URL` to it.

### Financial Simulator (Premium Plus, yearly)
- Premium (one-time): Freedom Plan + one what-if at a time (property and investment choices).
- Premium Plus (`plusPrice` per year in `lib/countries.ts`; `PREMIUM_PLUS_ENABLED=false` hides it): refinance / extra repayments / new term, buy a property, invest or use savings as a lump sum, point released money at a chosen debt, interest saved and debt-free dates, net worth in 10 years and at retirement (Library engine copied to `lib/projection/`), up to 3 saved scenarios side by side.

### Freedom Plan (staged) + Simulator analysis
- `/plan` = dated steps in three stages: **Stabilise** (close the monthly gap: essential calls, number checks, the person's Simulator choices, then suggested options until the gap is covered, with deadlines tightened by the cash-runway date), **Buffer** (3 months of costs), **Pay down** (the 3 scenarios, built from the numbers *after* the chosen moves; hidden until there is spare money). Steps are ticked off and saved (`financial_plans.steps_done`); choices are stored in `financial_plans.choices`. Logic: `lib/freedom.ts`.
- Simulator → "Use these choices in my Freedom Plan".
- Simulator (Premium Plus): strengths, weaknesses & risks now vs with choices (`lib/projection/analysis.ts`, from the Library) and an investment platform fee comparison (`lib/projection/platforms.ts`).
- Run the latest `supabase/schema.sql` (adds `financial_plans.choices` and `steps_done`).
