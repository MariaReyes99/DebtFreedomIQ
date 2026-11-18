# Security policy

## Reporting a vulnerability

Please report security problems privately, not in a public issue.

Use GitHub's private reporting: open the **Security** tab of this repository and choose
**Report a vulnerability**, or email **support@debtfreedomiq.com** with "Security" in the subject.
Include what you found, how to reproduce it, and its possible impact.

You will receive a reply within 5 working days. Please give us reasonable time to fix the
problem before sharing it publicly.

## Scope

- The DebtFreedomIQ web app at https://debtfreedomiq.com and its API routes (health check, plans,
  Explore my future and the Research Library chat, payments, support, account and admin).
- Card details are handled entirely by Stripe and never reach this app.
- Never include real personal or financial information in a report.

## How the app is protected

A summary for reviewers. Details are in `middleware.ts`, `next.config.ts`, `lib/ratelimit.ts` and
`research/lib/security.ts`.

- Security headers on every page: Content Security Policy, HSTS, `X-Frame-Options: DENY`,
  `nosniff`, strict referrer and permissions policies.
- API writes must come from this site (cross-site requests are refused), request sizes are capped,
  and every API has rate limits.
- Database tables use Supabase row-level security; server-only tables are reachable only with the
  server's secret key.
- Stripe webhooks are signature-checked, and a forged one raises an alert (`ALERT_WEBHOOK_URL`).
- Personal details are removed from library questions before they reach OpenAI, search or logs.
- Admin pages are visible only to the addresses in `ADMIN_EMAILS`, and admin actions are logged.
- Users can download or delete all their data from **My account → My data**.
