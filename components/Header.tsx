import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/session";
import UserMenu from "./UserMenu";
import NavLinks from "./NavLinks";

export default async function Header() {
  const { user, country, displayName, isPremium } = await getSession();
  return (
    <>
      <div className="bg-navy-950 text-[13px] text-navy-100">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-1.5 text-center">
          <span>Feeling overwhelmed? You&apos;re not alone.</span>
          {country ? (
            <span>{country.crisis.name.replace(/\s+–.*$/, "")}: <a className="font-semibold text-white underline" href={`tel:${country.crisis.phone?.replace(/[^\d+]/g, "")}`}>{country.crisis.phone}</a> · Emergency: <a className="font-semibold text-white underline" href={`tel:${country.emergency}`}>{country.emergency}</a></span>
          ) : <span>In danger? Call your local emergency number.</span>}
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b border-navy-100 bg-white/95 backdrop-blur">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-3" aria-label="DebtFreedomIQ home">
            <Image src="/logo.png" alt="DebtFreedomIQ" width={170} height={37} priority className="h-8 w-auto sm:h-9" />
            <span className="hidden border-l-2 border-teal-400 pl-3 text-xs font-medium leading-tight text-navy-500 xl:block">The Intelligence Behind<br />Every Debt Decision.</span>
          </Link>
          <NavLinks loggedIn={Boolean(user)} />
          <div className="flex items-center gap-2">
            {country && <span className="hidden rounded-full bg-navy-50 px-3 py-1.5 text-sm font-semibold text-navy-700 md:inline">📍 {country.name}</span>}
            <UserMenu name={displayName} premium={isPremium} />
          </div>
        </div>
      </header>
    </>
  );
}
