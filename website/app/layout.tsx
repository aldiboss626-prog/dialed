import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dialed - keep your network warm",
  description:
    "Dialed reminds you who to reach out to and drafts the message in your voice. Never let a connection go cold.",
  metadataBase: new URL("https://dialed.app"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Dialed - keep your network warm",
    description:
      "Dialed reminds you who to reach out to and drafts the message in your voice.",
    url: "https://dialed.app",
    siteName: "Dialed",
    type: "website",
    // TODO: add og image at /public/og.png (1200x630: wordmark + one phone + tagline)
  },
  twitter: {
    card: "summary_large_image",
    title: "Dialed - keep your network warm",
    description:
      "Dialed reminds you who to reach out to and drafts the message in your voice.",
  },
  // TODO once App Store ID exists:
  // itunes: { appId: "XXXXXXXXX" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
