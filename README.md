# DebtFreedomIQ

**Financial triage and decision support for households under money pressure.**
Live at [debtfreedomiq.com](https://debtfreedomiq.com) · New Zealand, Australia, the Philippines, the United Kingdom and the United States.

DebtFreedomIQ gives people a free financial health check, a clear plan, the right local help, and a way to test big money decisions before they make them. It is financial education software, not financial advice or debt settlement.

## What's in the app

| Menu | Route | Access | What it does |
|---|---|---|---|
| Home | `/dashboard` | Logged in | Latest scores, today's actions, journey tracker, progress |
| Check my finances | `/health` | Free, no account | Income, spending, debts and assets → health, stress and emergency-fund scores, the moves to make first, charts |
| Get help | `/help` | Free | Triage by urgency, crisis lines, free government and community services, a free hardship letter. Premium adds the support-team plan, referral package and readiness checklist (free for anyone in crisis) |
| My plan | `/plan` | Premium | The Freedom Plan: dated steps in three stages (stabilise, buffer, pay down), ratings for each option, progress |
| Explore my future | `/whatif` | Free preview, Premium / Premium Plus | What-if simulator and decision dashboard; sub-pages for **My retirement picture** (`/whatif/retirement`) and **Ask the library** (`/whatif/library`) with cited answers |
| Pricing | `/pricing` | | Free · Premium one-time (NZ$19) · Premium Plus yearly (NZ$59), with local prices in each country and a hardship waiver |
| About & privacy | `/about`, `/privacy`, `/terms` | | Who we are, how data is used, terms |
| Contact support | `/support` | | Support form; messages go to the admin inbox |
| For organisations | `/partners` | | Partner and referral programme |
| Admin | `/admin` | `ADMIN_EMAILS` only | Subscribers and payments, customers, support inbox, stories, audit log |

## Tech stack

Next.js 15 (App Router, server actions) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth, Postgres, row-level security) · Stripe · OpenAI (`gpt-4o-mini` by default) with the Vercel AI SDK · Upstash Vector (library search) and Redis (rate limits) · Resend (email) · Recharts · Vercel hosting.

## Running it locally

```bash
npm install
cp .env.example .env.local    # fill in the values (see docs/KEYS_GUIDE.md)
npm run dev                   # http://localhost:3000
```

1. **Supabase:** in the SQL Editor, run all of `supabase/schema.sql` (safe to run again after every update).
2. **Payments:** locally use `PAYMENTS_MODE=mock` and `ALLOW_TEST_SUBSCRIBE=true` to unlock Premium with a demo checkout. Never set `ALLOW_TEST_SUBSCRIBE` in production.
3. **OpenAI** is optional: without a key, recommendations and plans come from the built-in rules engine.
4. **Library:** load the research documents once with `npm run seed` (needs the Upstash Vector keys).
5. Open `/health` → **Try with example data** to see a full result.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (run before pushing) |
| `npm run typecheck` | TypeScript check |
| `npm run test:research` | Calculation, guardrail, privacy and security tests |
| `npm run seed` / `seed:check` | Load (or dry-run) the library documents into Upstash Vector |
| `npm run eval` | Re-ask the library's test questions and check the answers |
| `npm run check:sources` | Fail if any library source is overdue for review |

## Deploying

Pushing to `main` on GitHub deploys to Vercel automatically. Production settings are in Vercel → Settings → Environment Variables; the full launch checklist is in [`docs/GO_LIVE.md`](docs/GO_LIVE.md). A daily job (`/api/billing/run`, scheduled in `vercel.json`) handles Premium Plus renewals and reminders.

## Project structure

```
app/                     Pages and API routes (Next.js App Router)
  health/ help/ plan/ whatif/ dashboard/ pricing/ account/ support/ partners/ admin/
  api/                   assessment, plan, help, checkout, stripe/webhook, billing, support,
                         stories, account (export/delete), library (chat, fx, research, usage)
components/              UI: wizard, results, plan, simulator, decision dashboard, charts
lib/                     DebtFreedomIQ logic
  finance.ts plan.ts freedom.ts   scores, scenarios, staged Freedom Plan
  scorecard.ts whatif.ts          option ratings and what-if maths
  longview.ts library.ts          10-year and retirement figures (uses the research engine)
  help.ts supportteam.ts crisis.ts help matching, support team, crisis access
  payments.ts billing.ts          Stripe / mock checkout, renewals
  ai.ts                           OpenAI calls with guardrails and rule-based fallbacks
  ratelimit.ts support.ts         rate limits, support desk
research/                The Research Library and retirement planner (part of Explore my future)
  lib/finance/           household projection, analysis, fund and platform comparisons
  lib/guardrails/        personal-advice and personal-details protection
  components/            retirement planner, library chat, charts
  data/corpus/           the cited research documents
  tests/                 tests and the question set for npm run eval
supabase/schema.sql      Tables, row-level security and grants
middleware.ts            Sessions, protected routes, same-origin checks, size caps, rate limits
next.config.ts           Security headers
docs/                    Go-live checklist, keys guide, email setup, compliance, marketing copy
```

The library code imports `zod/v3` because AI SDK v4 expects zod 3; `.npmrc` sets `legacy-peer-deps=true` for the same reason. Library styles live in `app/research.css`, scoped to `.research`.

## How the scores work

- **Debt-to-income** = monthly debt repayments ÷ monthly take-home income.
- **Emergency fund** = cash savings ÷ (essential costs + debt repayments), in months; full marks at 6 months.
- **Financial health (0–100)** = 30% debt-to-income · 20% savings rate · 20% emergency fund · 15% leverage · 15% high-interest debt share, minus penalties for missed payments, collections or essentials at risk.
- **Stress (0–100)** combines the monthly gap, repayment burden, buffer, high-interest debt and the hardship situations people tick.
- **Comparing options** (Explore my future): overall = 40% cash flow · 30% risk · 20% wealth · 10% ease.

## Responsible design

- Free help is never paywalled. Crisis lines appear on every page, and anyone in crisis (can't afford food, lost income, collections or court, housing or utilities at risk) gets the Premium support team free.
- The AI gives general information only: no product picks, payday loans or fee-charging debt settlement; essentials come before debt.
- "Can't afford it?" hardship waiver (`HARDSHIP_WAIVER`).
- Users can download or delete all their data from **My account → My data**.
- Disclaimers are drafts for legal review in each country: see [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md).

## Security

See [`SECURITY.md`](SECURITY.md) to report a problem and for a summary of the protections.

## Licence

See [`LICENSE`](LICENSE).
