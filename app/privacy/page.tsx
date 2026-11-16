import CloseButton from "@/components/CloseButton";
export const metadata = { title: "Privacy" };
export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-navy-700">
      <div className="flex items-start justify-between gap-4"><h1 className="text-3xl font-bold text-navy-900">Privacy</h1><CloseButton /></div>
      <p><strong>What we collect:</strong> your email, name, country, the financial figures you enter (income, expenses, debts, assets, savings, goals) and basic usage events. We record the country your connection comes from to show local currency and services.</p>
      <p><strong>What we never collect:</strong> bank logins, card numbers, PINs or one-time codes. Payments (when enabled) are handled by Stripe.</p>
      <p><strong>AI processing:</strong> to generate recommendations and plans, your figures (not your name or email) may be sent to our AI provider (OpenAI) under its API data policies. They are not used to train models.</p>
      <p><strong>How we use it:</strong> to calculate your scores, generate your plans and improve the service. We do not sell your data or share it with lenders or debt companies.</p>
      <p><strong>Your rights:</strong> you can request a copy or deletion of your data at any time.</p>
      <p className="text-sm text-navy-500">Have this policy reviewed for the NZ Privacy Act 2020, Australian Privacy Principles, UK GDPR, the Philippine Data Privacy Act and US state laws before launch.</p>
      <div className="pt-4"><CloseButton /></div>
    </div>
  );
}
