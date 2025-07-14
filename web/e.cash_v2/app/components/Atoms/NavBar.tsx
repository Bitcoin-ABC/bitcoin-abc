// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "../../utils/cn";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed z-50 flex w-full items-center justify-center px-4 py-4 transition-all duration-300",
        isScrolled && "bg-background/30 shadow-sm backdrop-blur-sm"
      )}
    >
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
