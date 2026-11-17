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
  description: "Free Financial Health check with your score, net worth and debt-to-income ratio, plus step-by-step action plans and guided access to the right help.",
  openGraph: { title: "DebtFreedomIQ", description: "See the result of every move before you make it.", images: ["/logo.png"] },
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
