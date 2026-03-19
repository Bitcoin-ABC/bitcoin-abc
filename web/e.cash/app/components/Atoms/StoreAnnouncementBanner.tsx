// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import Link from "next/link";

export default function StoreAnnouncementBanner() {
  return (
    <Link
      href="https://store.e.cash"
      target="_blank"
      rel="noopener noreferrer"
      className="from-accentDark to-accentLight hover:from-accentLight hover:to-accentDark flex h-[40px] w-full items-center justify-center bg-gradient-to-tl px-4 text-center text-xs leading-none font-medium transition-all duration-300 sm:h-[30px] lg:text-sm"
    >
      The eCash Merch Store is now live! Shop at store.e.cash
    </Link>
  );
}
