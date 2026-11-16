import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "DebtFreedomIQ — From Financial Stress to Financial Freedom", template: "%s · DebtFreedomIQ" },
  description: "Free Financial Health check with your score, net worth and debt-to-income ratio, plus AI-powered action plans and guided access to the right help.",
  openGraph: { title: "DebtFreedomIQ", description: "Know your next best financial move.", images: ["/logo.png"] },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#06112a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <a href="#main" className="sr-only sr-only-focusable">Skip to content</a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
