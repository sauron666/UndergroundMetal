import type { Metadata, Viewport } from "next";
import { Inter, Cinzel, UnifrakturMaguntia, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Toaster } from "sonner";

const sans = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const display = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-display",
  display: "swap",
});

const blackletter = UnifrakturMaguntia({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-blackletter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Underground Metal — discover, listen, attend",
    template: "%s · Underground Metal",
  },
  description:
    "AI-curated discovery of mainstream and underground rock & metal bands, concert listings, ticket links, and rigorously sourced editorial.",
  keywords: [
    "metal", "underground metal", "black metal", "death metal",
    "rock", "concerts", "tickets", "metal news", "bg metal",
  ],
  openGraph: {
    type: "website",
    siteName: "Underground Metal",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${blackletter.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Toaster theme="dark" richColors position="top-right" />
      </body>
    </html>
  );
}
