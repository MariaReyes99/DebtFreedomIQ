import Image from "next/image";
import type { ReactNode } from "react";

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2 lg:py-16">
      <div className="relative hidden overflow-hidden rounded-3xl lg:block">
        <Image src="/images/family-outside-home.jpg" alt="A family standing together in front of their home" fill className="object-cover" sizes="50vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/30 to-transparent" />
        <div className="absolute bottom-0 p-8 text-white">
          <p className="text-2xl font-bold leading-snug">From financial stress<br />to financial freedom.</p>
          <ul className="mt-4 space-y-1.5 text-sm text-navy-100"><li>✓ Free Financial Health score</li><li>✓ Personalised next steps</li><li>✓ Your data stays private</li></ul>
        </div>
      </div>
      <div className="mx-auto w-full max-w-md self-center">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mb-6 mt-2 text-navy-600">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
