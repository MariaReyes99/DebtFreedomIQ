import CloseButton from "@/components/CloseButton";
import { SUPPORT_EMAIL } from "@/lib/site";
export const metadata = { title: "Privacy" };
export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-navy-700">
      <div className="flex items-start justify-between gap-4"><h1 className="text-3xl font-bold text-navy-900">Privacy</h1><CloseButton /></div>
      <p><strong>What we collect:</strong> your email, name, country, the financial figures you enter (income, expenses, debts, assets, savings, goals) and basic usage events. We record the country your connection comes from to show local currency and services.</p>
      <p><strong>What we never collect:</strong> bank logins, card numbers, PINs or one-time codes. Payments (when enabled) are handled by Stripe.</p>
      <p><strong>AI processing:</strong> to generate recommendations and plans, your figures (not your name or email) may be sent to our AI provider (OpenAI) under its API data policies. They are not used to train models.</p>
      <p><strong>How we use it:</strong> to calculate your scores, generate your plans and improve the service. We do not sell your data or share it with lenders or debt companies.</p>
      <p><strong>Library questions:</strong> questions you ask the Research Library are sent to OpenAI after we remove emails, phone numbers, tax and account numbers and addresses. Messages with card details are blocked. Question counts are kept per account, or per anonymised (hashed) internet address if you aren&apos;t logged in.</p>
      <p><strong>Support messages and stories:</strong> if you contact support we keep your message and email to reply, and our team can see your plan and payment history (not your full financial details) to help you. Stories you share are published only with your permission, after review, and removed whenever you ask.</p>
      <p><strong>Security:</strong> your data is encrypted in transit, each account can only read its own records (row-level security), admin access is limited to named staff and every admin change is logged.</p>
      <p><strong>Your rights:</strong> download a copy of your data or delete your account at any time from <a href="/account?tab=data" className="font-semibold text-teal-700 underline">Account → My data</a>. Deleting your account stops renewals and removes your checks, plans and records. To correct anything, or for any privacy question, <a href="/support" className="font-semibold text-teal-700 underline">contact support</a> or email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal-700 underline">{SUPPORT_EMAIL}</a>.</p>
      <p className="text-sm text-navy-500">Have this policy reviewed for the NZ Privacy Act 2020, Australian Privacy Principles, UK GDPR, the Philippine Data Privacy Act and US state laws before launch.</p>
      <div className="pt-4"><CloseButton /></div>
    </div>
  );
}
