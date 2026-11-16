import { Button, Card } from "@/components/ui";

export const metadata = { title: "Welcome to Premium" };

export default async function Success({ searchParams }: { searchParams: Promise<{ tier?: string; mock?: string }> }) {
  const { mock } = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <Card>
        <div className="text-5xl" aria-hidden>🎉</div>
        <h1 className="mt-3 text-3xl font-bold">You&apos;re Premium!</h1>
        <p className="mt-2 text-navy-600">Your Freedom Plan, Find Help matching and referral brief are unlocked.{mock && " (Demo payment: no money was taken.)"}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2"><Button href="/plan" size="lg">Build my Freedom Plan</Button><Button href="/help" variant="secondary" size="lg">Get matched to help</Button></div>
      </Card>
    </div>
  );
}
