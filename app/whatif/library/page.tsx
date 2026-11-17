import "../../research.css";
import { PageHeader } from "@/components/ui";
import ExploreTabs from "@/components/ExploreTabs";
import LibraryWorkspace from "@/research/components/LibraryWorkspace";
import IntroAvatar from "@/research/components/IntroAvatar";

export const metadata = { title: "Ask the library" };

export default function AskLibraryPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader eyebrow="Explore my future" title="Ask the library">
        Investing and retirement questions, answered from a library of guides, with the sources shown. Education, not financial advice.
      </PageHeader>
      <ExploreTabs />
      <LibraryWorkspace view="ask" />
      <div className="research research-chat-page"><IntroAvatar /></div>
    </div>
  );
}
