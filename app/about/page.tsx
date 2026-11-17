import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "About & privacy" };

const H = ({ children }: { children: React.ReactNode }) => <h2 className="text-xl font-bold text-navy-900">{children}</h2>;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader eyebrow="DebtFreedomIQ" title="About & privacy">How DebtFreedomIQ works, what it is and isn&apos;t, and how we look after your information.</PageHeader>
      <div className="space-y-6 text-[15px] leading-relaxed text-navy-700">
        <Card as="section" className="space-y-3">
          <H>What this is</H>
          <p>DebtFreedomIQ helps households under money pressure in New Zealand, Australia, the Philippines, the United States and the United Kingdom see where they stand and what to do next:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Check my finances</strong>: a free Financial Health check with scores and next steps.</li>
            <li><strong>Get help</strong>: free, local support services, ranked for your situation.</li>
            <li><strong>My plan</strong>: a dated Freedom Plan you can tick off.</li>
            <li><strong>Explore my future</strong>: the what-if simulator, My retirement picture, and the Research Library, which answers investing and retirement questions from a library of guides and shows its sources.</li>
          </ul>
        </Card>

        <Card as="section" className="space-y-3">
          <H>Not financial advice</H>
          <p>DebtFreedomIQ gives general information and education. It does not take your full circumstances into account and does not recommend what you personally should buy, sell, borrow or hold.</p>
          <p>Scores, scenarios and projections are illustrations, not predictions, and returns are not guaranteed. Tax rules, pensions and retirement-savings settings change: check the official source before you act. For personal advice, talk to a licensed financial adviser or a free financial mentor. <Link href="/help" className="font-semibold text-teal-700 underline">Find free help</Link>.</p>
        </Card>

        <Card as="section" className="space-y-3">
          <H>Your privacy</H>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>What we keep:</strong> your email, name, country, the figures you enter in your Financial Health check and plans, and basic usage events.</li>
            <li><strong>What we never collect:</strong> bank logins, card numbers, PINs or one-time codes. Payments are handled on the payment provider&apos;s own secure page; we store only which plan you are on.</li>
            <li><strong>My retirement picture</strong> runs in your browser. The numbers you enter there stay on your device unless you choose to include them in a library question.</li>
            <li><strong>AI processing:</strong> library questions, and figures used to write explanations and plans, are sent to our AI provider (OpenAI). Before a question is sent we remove details such as email addresses, phone numbers, tax numbers, bank account numbers and street addresses. Messages containing card details are blocked and never processed.</li>
            <li><strong>Question allowances</strong> are counted per account, or per anonymised (hashed) internet address for visitors who aren&apos;t logged in.</li>
            <li>We don&apos;t sell your data, show ads, or share it with lenders or debt companies.</li>
            <li>You can ask for a copy of your data, correct it, or delete your account at any time.</li>
          </ul>
          <p className="text-sm">Read the full <Link href="/privacy" className="font-semibold text-teal-700 underline">Privacy policy</Link> and <Link href="/terms" className="font-semibold text-teal-700 underline">Terms</Link>.</p>
        </Card>

        <Card as="section" className="space-y-3">
          <H>Sources</H>
          <p>Support services are checked against each organisation&apos;s own website. Library answers cite the documents they rely on and the date their facts were checked. See the <Link href="/whatif/library/sources" className="font-semibold text-teal-700 underline">library&apos;s sources</Link>. We are not affiliated with or endorsed by any organisation listed.</p>
        </Card>
      </div>
    </div>
  );
}
