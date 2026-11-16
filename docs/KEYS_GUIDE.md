# DebtFreedomIQ: How to create the keys

> You can run the whole app with **only Supabase** first. OpenAI and Stripe are optional: without OpenAI the built-in rules engine is used, and `PAYMENTS_MODE=mock` gives a demo checkout.

You need **5 required values** (about 20 minutes) and a few **optional** ones for ads tracking.
Put them all in a file called `.env.local` inside the `debtfreedomiq` folder. Start by copying `.env.example` and renaming the copy.

> 🔒 **Keep secrets secret.** Never paste keys into chat, email or GitHub. Anything marked *secret* goes only in `.env.local` and in Vercel.
> Create **new** accounts/projects for DebtFreedomIQ. Don't reuse YuWorxIQ's.

---

## Part 1: Supabase (sign-up, login and database)

### 1. Create the project
1. Go to **supabase.com** → **Sign in** → **New project**.
2. Name: `debtfreedomiq`. Choose a strong **database password** and save it in your password manager.
3. Region: **Southeast Asia (Singapore)** or **Oceania (Sydney)**, whichever is closer to most users.
4. Click **Create new project** and wait about 2 minutes.

### 2. Copy the keys → `.env.local`
Go to **Project Settings (⚙️) → API Keys**.

| Put in `.env.local` | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project Settings → Data API** (or the **Connect** button at the top), labelled *Project URL*, like `https://abcd1234.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **API Keys** tab → *Publishable key*, starts with `sb_publishable_` |
| `SUPABASE_SECRET_KEY` 🔒 | **API Keys** tab → *Secret keys* → click to reveal, starts with `sb_secret_` |

If you only see a **Legacy API Keys** tab, click **Create new API keys** to make the new ones. Or use the legacy `anon` key as `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `service_role` as `SUPABASE_SERVICE_ROLE_KEY`. The app accepts either.

### 3. Create the tables
1. Left menu → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` in Notepad, press **Ctrl+A** then **Ctrl+C** to copy **all** of the SQL (not the file name), paste it in and click **Run**. You should see "Success. No rows returned".

### 4. Set the login links
**Authentication → URL Configuration**:
- **Site URL:** `http://localhost:3000` for now. Change it to your real web address after launch.
- **Redirect URLs → Add URL:** `http://localhost:3000/auth/callback`. After launch, also add `https://YOURDOMAIN/auth/callback`.

*(Optional while testing: **Authentication → Sign In / Providers → Email** → turn off "Confirm email" so you can sign up without checking your inbox. Turn it back on before launch.)*

---

## Part 1b: OpenAI (optional, for AI recommendations)
1. Go to **platform.openai.com** → sign in → **API keys** → **Create new secret key** → name it `debtfreedomiq`.
2. Copy it (starts with `sk-`) → `OPENAI_API_KEY=` in `.env.local` 🔒
3. **Settings → Billing**: add a small credit (e.g. US$5–10) and a monthly **usage limit** so costs can't run away.
4. Optional: `OPENAI_MODEL=` to choose a model (default `gpt-5.6-terra`).

---

## Part 2: Stripe (only when you switch to real payments)

Keep `PAYMENTS_MODE=mock` until you're ready. Then set `PAYMENTS_MODE=stripe` and add the keys below.
When Stripe asks what your business does, describe it as **financial education software** (not debt relief or settlement).

### 1. Create a separate account for DebtFreedomIQ
1. Log in at **dashboard.stripe.com**.
2. Top-left account name → **New account** → name it `DebtFreedomIQ` and choose your country (New Zealand).
3. Make sure the **Test mode** switch (top right) is **ON** while you test.

### 2. Secret key → `.env.local`
**Developers → API keys** → *Secret key* → **Reveal** → copy it (`sk_test_...`).
→ `STRIPE_SECRET_KEY=sk_test_...` 🔒

### 3. Webhook secret → `.env.local`
The webhook is how Stripe tells the app "this person has paid".

**For testing on your computer:**
1. Install the Stripe CLI: open PowerShell and run `winget install Stripe.StripeCLI`. If that fails, download it from the Stripe CLI page on docs.stripe.com.
2. Run `stripe login` and approve in the browser.
3. While the app is running (`npm run dev`), open a **second** PowerShell window and run:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. It prints `Your webhook signing secret is whsec_...`. Copy that into `STRIPE_WEBHOOK_SECRET` 🔒 and restart `npm run dev`.

**For the live site (after deploying to Vercel):**
1. **Developers → Webhooks → Add endpoint**.
2. URL: `https://YOURDOMAIN/api/stripe/webhook`.
3. Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`.
4. Copy the endpoint's **Signing secret** (`whsec_...`) into Vercel as `STRIPE_WEBHOOK_SECRET`.

### 4. Settings to fill in before going live
- **Settings → Business → Public details:** business name *DebtFreedomIQ*, support email, website.
- **Settings → Payments → Statement descriptor:** `DEBTFREEDOMIQ` (what customers see on their bank statement).
- When ready: switch **Test mode OFF**, complete account activation, and replace `sk_test_` with the `sk_live_` key and a live webhook secret in Vercel.

**Test card:** `4242 4242 4242 4242`, any future date, any 3-digit CVC.

---

## Part 3: Site settings (no sign-up needed)

| Variable | What to put |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` on your computer. Your real address (e.g. `https://debtfreedomiq.com`) in Vercel |
| `ADMIN_EMAILS` | Your email. Lets you see `/admin` (sales, donations, feedback). Separate several emails with commas |
| `HARDSHIP_WAIVER` | `true` shows the "Can't afford it? Get it free" button. `false` hides it |
| `PAYMENTS_MODE` | `mock` (demo checkout, default) or `stripe` |

---

## Part 5: Your finished `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxx
PAYMENTS_MODE=mock
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_EMAILS=you@example.com
HARDSHIP_WAIVER=true
```

Save the file, stop the app (**Ctrl + C**) and run `npm run dev` again. Keys are only read when the app starts.

### Quick test
1. Open http://localhost:3000/health → **Try with example data** → **See my Financial Health**.
2. Click **Save my results (free)** → create an account → your results are saved.
3. **Pricing → Get Premium → Pay (demo)** → open **My Freedom Plan** → **Generate my Freedom Plan**.
4. Open http://localhost:3000/admin → see your test activity.

### Putting the keys on Vercel
**vercel.com → your project → Settings → Environment Variables** → add each line from `.env.local` (name and value), with `NEXT_PUBLIC_SITE_URL` set to your real address → **Deployments → Redeploy**.
