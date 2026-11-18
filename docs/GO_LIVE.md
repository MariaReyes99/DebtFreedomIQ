# Going live: DebtFreedomIQ launch checklist

Work through these in order. Tick each box. Keys and secrets go only in Vercel's settings and your own `.env.local`, never in chat, email or GitHub.

## 1. Apply the latest code
- [ ] Push the latest code to the `main` branch on GitHub. Vercel builds and deploys it automatically.
- [ ] Locally, `npm install` then `npm run build` must finish with "Compiled successfully".
- [ ] Keep the code folder outside OneDrive (for example `C:\dev\dfiq`): syncing locks files while Git works.

## 2. Database (Supabase)
- [ ] Use a **production** Supabase project (separate from testing if you can).
- [ ] SQL Editor → paste all of `supabase/schema.sql` → Run. It is safe to run again; it adds the support inbox, stories and audit log.
- [ ] Authentication → URL configuration: Site URL = your live address; Redirect URLs = `https://debtfreedomiq.com/**`.
- [ ] Authentication → Email: turn on **Confirm email**; set a minimum password length of 10.
- [ ] Authentication → Attack protection: turn on leaked-password protection if your plan offers it. **Leave CAPTCHA off**: the sign-in pages have no CAPTCHA widget, so turning it on would block every login.
- [ ] Database → Backups: check daily backups are on (Pro plan gives point-in-time recovery; recommended once you have paying customers).

## 3. Hosting (Vercel)
- [ ] Project → Settings → Environment Variables (Production). Add every line from `.env.example` that you use, with production values:
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
  - Site: `NEXT_PUBLIC_SITE_URL=https://debtfreedomiq.com`, `ADMIN_EMAILS` = the email(s) you log in with, comma-separated, `NEXT_PUBLIC_COPYRIGHT_TEXT`
  - Payments: `PAYMENTS_MODE=stripe`, `STRIPE_SECRET_KEY` (live, `sk_live_…`), `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; `ALLOW_TEST_SUBSCRIBE` **removed or false**
  - AI and library: `OPENAI_API_KEY`, `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`
  - Limits: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (**required in production**: rate limits and library allowances), `IP_HASH_SALT` (a long random value)
  - Email: `RESEND_API_KEY`, `EMAIL_FROM=DebtFreedomIQ <support@debtfreedomiq.com>`
  - Jobs: `CRON_SECRET` (a long random value)
  - Optional: `OPENAI_MODEL`, `CHAT_MODEL` (default `gpt-4o-mini`), `EMBEDDING_MODEL` (default `text-embedding-3-small`; must match the one used for `npm run seed`), `GOOGLE_PLACES_API_KEY`, `ALERT_WEBHOOK_URL`, `HARDSHIP_WAIVER` (leave unset: on), `PREMIUM_PLUS_ENABLED` (leave unset: on)
- [ ] Redeploy after changing variables.
- [ ] Settings → Domains: add your domain; set the DNS records Vercel shows. HTTPS is automatic.
- [ ] Settings → Deployment Protection: turn **off** "Vercel Authentication" for Production (otherwise visitors see a Vercel login).
- [ ] Check the daily billing job is listed under Settings → Cron Jobs (`/api/billing/run`).

## 4. Payments (Stripe)
- [ ] Activate your Stripe account (business details, bank account, identity).
- [ ] Turn on **Stripe Tax** if you must charge GST/VAT in a country, and register where required (see section 8).
- [ ] Workbench → Webhooks → **Add destination**: events from **Your account**, payload style **Snapshot**, events `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, destination **Webhook endpoint** `https://debtfreedomiq.com/api/stripe/webhook`. Copy its signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`. Test mode and live mode each need their own webhook and secret.
- [ ] Settings → Customer emails: turn on receipts.
- [ ] Settings → Branding: your logo and colours (shown on the payment page).
- [ ] Make one real purchase with your own card, then refund it from the Stripe Dashboard.

## 5. Email (Resend)
- [ ] Add and verify your domain (DNS records), then set `EMAIL_FROM=DebtFreedomIQ <support@debtfreedomiq.com>`.
- [ ] Send yourself a message from **Contact support** and check both emails arrive (yours and the admin alert).

## 6. Research Library
- [ ] If the production Upstash Vector index is new or empty, run `npm run seed` once on your computer with the production keys in `.env.local`.
- [ ] Ask one question on **Explore my future → Ask the library** and check it answers with sources.

## 7. Your admin area (monitoring and customer support)
Log in with an address listed in `ADMIN_EMAILS`. Your name menu (top right) then shows **Admin**:

| Page | What it's for |
|---|---|
| Insights | Funnel from visitors to buyers, situations people are in, help they need |
| Subscribers & payments | Who is paying, on hold or cancelled; revenue this month and all time |
| Customers | Search anyone; their plan, payments, messages; give free access, extend or cancel |
| Support inbox | Messages from Contact support; reply by email, add notes, mark resolved |
| Stories | Approve testimonials before they appear on Pricing |
| Audit log | Every admin change: who, what, when |

Refunds are made in the Stripe Dashboard; then cancel the plan on the customer's page.

## 8. Legal and trust (have these checked by a professional)
- [ ] Privacy policy and terms reviewed for the countries you sell in: NZ Privacy Act 2020, Australian Privacy Principles, UK GDPR, Philippine Data Privacy Act (register with the NPC if required), US state privacy laws.
- [ ] Confirm the "general information, not financial advice" approach is acceptable in each market (e.g. NZ FMA financial advice rules, ASIC in Australia, FCA in the UK). Get advice before offering anything that recommends specific products.
- [ ] Tax: GST registration in NZ once you pass the threshold; check GST/VAT rules for selling digital services to consumers in AU, the UK and the Philippines.
- [ ] Set up a business entity and bank account; keep records of every payment (Stripe exports).
- [ ] Ask each support service you list whether they're happy to be listed, and keep phone numbers up to date (check them every 3 months).
- [ ] Make sure your privacy policy names your company, contact address and how to complain to the privacy regulator.

## 9. Final checks on the live site
- [ ] Do a Financial Health check as a new user, on a phone and a computer.
- [ ] Tick "struggling to afford food" and check Get help shows "Free for you".
- [ ] Buy Premium with a real card; check the plan unlocks and you see the payment in Admin.
- [ ] Download your data and delete a test account (Account → My data).
- [ ] Check https://securityheaders.com shows A or A+ for your domain.
- [ ] Submit `https://debtfreedomiq.com/sitemap.xml` in Google Search Console.

## 10. After launch
- [ ] Check the Support inbox daily; aim to reply within 2 working days.
- [ ] Weekly: Admin → Insights and Subscribers.
- [ ] Monthly: `npm audit` and update packages; review the audit log.
- [ ] Ask happy users to share their story (Home page) and approve the good ones.
- [ ] Run `npm audit` before each release (0 known vulnerabilities as at 18 November 2026, after the AI SDK 6 upgrade). Dependabot pull requests: let Vercel's preview build pass before merging.
