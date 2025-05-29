// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <div className="fixed z-50 flex w-full items-center justify-center px-4 py-4">
      <div className="flex w-full max-w-[1400px] items-center">
        <Link className="relative h-8 w-32" href="/">
          <Image
            src="/ecash-logo.png"
            alt="eCash"
            fill
            className="object-contain"
          />
        </Link>
      </div>
    </div>
  );
}
