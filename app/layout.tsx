import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BackBar, ScrollButtons } from "@/components/PageTools";
import JourneyBar from "@/components/JourneyBar";
import BottomNavServer from "@/components/BottomNavServer";
import { textSizeScript } from "@/components/TextSize";
import NavProgress from "@/components/NavProgress";
import { Suspense } from "react";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "DebtFreedomIQ — From Financial Stress to Financial Freedom", template: "%s · DebtFreedomIQ" },
  description: "Your financial triage and decision-support platform. A free Financial Health check, the free help near you, a dated plan to get debt-free, and side-by-side comparisons before big money decisions. NZ, Australia, Philippines, US and UK.",
  openGraph: { type: "website", siteName: "DebtFreedomIQ", title: "DebtFreedomIQ — clarity, options and a pathway to help", description: "Free Financial Health check, free local help, and decision support for big money choices.", images: ["/logo.png"] },
  twitter: { card: "summary_large_image", title: "DebtFreedomIQ", description: "Clarity, options and a pathway to help when money is tight." },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#06112a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: textSizeScript }} /></head>
      <body className="min-h-screen font-sans">
        <a href="#main" className="sr-only sr-only-focusable">Skip to content</a>
        <Suspense fallback={null}><NavProgress /></Suspense>
        <Header />
        <JourneyBar />
        <main id="main" className="pb-20 lg:pb-0"><BackBar />{children}</main>
        <ScrollButtons />
        <Footer />
        <BottomNavServer />
      </body>
    </html>
  );
}
