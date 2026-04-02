// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { Metadata } from "next";
import { Suspense } from "react";
import { Space_Grotesk, Fira_Code } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Atoms/NavBar";
import Footer from "./components/Atoms/Footer";
import Analytics from "./components/Analytics";
import { ChronikProvider } from "./context/ChronikContext";

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
  socialImage: process.env.NEXT_PUBLIC_SITE_URL + "/ecash-social-card.jpg",
  url: process.env.NEXT_PUBLIC_SITE_URL,
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
  // Endtime timestamps for the top banners.
  // Each banner is shown if the current time is before its endtime.
  // We need to set these here so we apply the extra padding to the main content when banners are active.
  const storeBannerEndTime = "2026-07-01T00:00:00Z";
  const upgradeBannerEndTime = "2026-06-01T00:00:00Z";
  const showStoreBanner = shouldShowBanner(storeBannerEndTime);
  const showUpgradeBanner = shouldShowBanner(upgradeBannerEndTime);

  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${firaCode.variable} antialiased`}
      >
        <ChronikProvider>
          <Suspense fallback={null}>
            <Analytics />
          </Suspense>
          <Navbar
            showStoreBanner={showStoreBanner}
            showUpgradeBanner={showUpgradeBanner}
          />
          <div
            className={
              showStoreBanner || showUpgradeBanner
                ? "pt-[40px] sm:pt-[30px]"
                : ""
            }
          >
            {children}
          </div>
          <Footer />
        </ChronikProvider>
      </body>
    </html>
  );
}
