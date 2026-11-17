import "../../research.css";
import { getSession } from "@/lib/session";
import { loadLatest } from "@/lib/assessment";
import { libraryLink } from "@/lib/library";
import { PageHeader } from "@/components/ui";
import ExploreTabs from "@/components/ExploreTabs";
import LibraryWorkspace from "@/research/components/LibraryWorkspace";
import IntroAvatar from "@/research/components/IntroAvatar";

export const metadata = { title: "My retirement picture" };

export default async function RetirementPage() {
  const { user } = await getSession();
  const latest = user ? await loadLatest(user.id).catch(() => null) : null;
  const age = latest?.input.age;
  const fill = latest && !latest.incomplete && age ? libraryLink(latest.input, { age, retireAge: latest.input.retireAge }) : null;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader eyebrow="Explore my future" title="My retirement picture">
        See where your money could take you, on your own or as a couple, all the way to retirement. Your answers stay on this device; while "Include my retirement picture" is on, Ask the library uses them to explain what they mean and how you could improve them.
      </PageHeader>
      <ExploreTabs />
      {fill && (
        <p className="no-print mb-4 rounded-2xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
          Start from your Financial Health numbers? <a href={fill} className="font-semibold underline">Fill in my retirement picture from my check →</a>
        </p>
      )}
      <LibraryWorkspace view="numbers" />
      <div className="research"><IntroAvatar /></div>
    </div>
  );
}
