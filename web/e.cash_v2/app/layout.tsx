// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "./components/NavBar";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
