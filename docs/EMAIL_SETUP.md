# Branded, secure sign-up emails (no "Supabase Auth", no supabase.co links)

By default Supabase sends emails **from "Supabase Auth"** with links to **your-project.supabase.co**.
Do these two things so emails come from DebtFreedomIQ and links go to your own website.

## 1. Send from your own name and address (custom SMTP)
Supabase's built-in email is for testing only (very low limits, "Supabase Auth" sender).

1. Create a free account with an email service, e.g. **Resend** (resend.com), Brevo or SendGrid.
2. Verify your domain there (they give you DNS records to add), e.g. `debtfreedomiq.com`.
3. Supabase → **Authentication → Emails → SMTP Settings** → **Enable custom SMTP**:
   - Sender email: `hello@debtfreedomiq.com`
   - Sender name: `DebtFreedomIQ`
   - Host / port / username / password: from your email service (Resend: `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key)

## 2. Make links go to your website, not supabase.co
Supabase → **Authentication → Emails → Templates**.

**Confirm sign up**. Subject: `Confirm your DebtFreedomIQ account`

```html
<h2>Welcome to DebtFreedomIQ</h2>
<p>Thanks for signing up. Please confirm your email address to save your Financial Health results:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/health">Confirm my email</a></p>
<p>If you didn't create an account, you can ignore this email.</p>
<p>DebtFreedomIQ: The Intelligence Behind Every Debt Decision.</p>
```

**Reset password**. Subject: `Reset your DebtFreedomIQ password`

```html
<h2>Reset your password</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Choose a new password</a></p>
<p>If you didn't ask for this, you can ignore this email.</p>
```

**Authentication → URL Configuration → Site URL** must be your real address once live (e.g. `https://debtfreedomiq.com`). While testing on your computer it is `http://localhost:3000`, and **the link only works on the same computer while `npm run dev` is running**.

## Is the Supabase address a security risk?
No. The project URL and publishable key are designed to be public (they're in every page of the app anyway). Your data is protected by **Row Level Security** in `supabase/schema.sql`: each user can only read and write their own rows, and the **secret key** is only ever on the server. Hiding the address from emails is about trust and branding, not security. Do keep the secret key private, and never turn RLS off.

## While testing
To skip emails altogether: Supabase → **Authentication → Sign In / Providers → Email** → turn off **Confirm email**. Turn it back on before launch.
