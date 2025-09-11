// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { Metadata } from "next";
import { Space_Grotesk, Fira_Code } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Atoms/NavBar";
import Footer from "./components/Atoms/Footer";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
});

const siteMeta = {
  title: "eCash | Cash for the Internet",
  description:
    "eCash is a fast, secure, and scalable cryptocurrency designed for the internet. Offering staking, non-custodial solutions, fixed supply, and support for NFTs and etokens, eCash is the future of decentralized digital cash. Look for the ticker symbol XEC, and take your first step towards true financial freedom.",
  socialImage: "https://e.cash/ecash-social-card.jpg",
  url: "https://e.cash",
};

export const metadata: Metadata = {
  title: siteMeta.title,
  description: siteMeta.description,
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: siteMeta.title,
    description: siteMeta.description,
    url: siteMeta.url,
    type: "website",
    images: [
      {
        url: siteMeta.socialImage,
        width: 1200,
        height: 630,
        alt: siteMeta.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteMeta.title,
    description: siteMeta.description,
    images: [siteMeta.socialImage],
  },
};

function shouldShowBanner(endTime: string): boolean {
  const now = new Date();
  const endDate = new Date(endTime);
  return now < endDate;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Endtime timestamp for the top banner
  // Banner is shown if the current time is before the endtime.
  // We need to set it here so we apply the extra padding to the main content when banner is active.
  const bannerEndTime = "2025-10-05T05:23:59Z";
  const showBanner = shouldShowBanner(bannerEndTime);

  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${firaCode.variable} antialiased`}
      >
        <Navbar showBanner={showBanner} />
        <div className={showBanner ? "pt-[30px]" : ""}>{children}</div>
        <Footer />
      </body>
    </html>
  );
}
