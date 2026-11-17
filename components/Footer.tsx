import Link from "next/link";
import Image from "next/image";
import { Disclaimer } from "./ui";

export default function Footer() {
  return (
    <footer className="mt-16 bg-navy-950 text-navy-200">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="inline-block rounded-xl bg-white px-3 py-2"><Image src="/logo.png" alt="DebtFreedomIQ" width={160} height={35} className="h-8 w-auto" /></div>
          <p className="mt-3 max-w-md text-sm">From financial stress to financial freedom. Personalised assessment, action planning and guided access to support.</p>
          <Disclaimer className="mt-4 max-w-md !text-navy-300" />
        </div>
        <nav aria-label="Product" className="text-sm"><p className="mb-2 font-semibold text-white">Product</p>
          <ul className="space-y-1.5"><li><Link href="/health" className="hover:text-white">Financial Health (free)</Link></li><li><Link href="/help" className="hover:text-white">Find Help</Link></li><li><Link href="/plan" className="hover:text-white">My Freedom Plan</Link></li><li><Link href="/whatif" className="hover:text-white">Explore my future</Link></li><li><Link href="/pricing" className="hover:text-white">Pricing</Link></li></ul></nav>
        <nav aria-label="Company" className="text-sm"><p className="mb-2 font-semibold text-white">Company</p>
          <ul className="space-y-1.5"><li><Link href="/privacy" className="hover:text-white">Privacy</Link></li><li><Link href="/terms" className="hover:text-white">Terms</Link></li></ul>
          <p className="mt-4 text-xs text-navy-400">Not affiliated with or endorsed by any organisation listed in our directory.</p></nav>
      </div>
      <div className="border-t border-navy-800 py-4 text-center text-xs text-navy-400">
        <p>{process.env.NEXT_PUBLIC_COPYRIGHT_TEXT || `Copyright © ${new Date().getFullYear()} DebtFreedomIQ. All rights reserved.`}</p>
        <p className="mt-1"><Link href="/privacy" className="hover:text-white">Privacy Policy</Link> · <Link href="/terms" className="hover:text-white">Terms of Use</Link></p>
      </div>
    </footer>
  );
}
