// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from "react";
import Button from "./Button";
import Image from "next/image";

export default function StartBuildingSection() {
  return (
    <section className="rounded-t-4xl relative overflow-hidden bg-gradient-to-tl from-[#11192d] to-[#040409] px-4 py-20">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#331d3d] to-transparent opacity-30" />

      <div className="mx-auto text-center">
        {/* Logo/Icon */}
        <div className="h-25 w-25 relative m-auto mb-[-30px] lg:mb-[-40px] lg:h-40 lg:w-40">
          <Image
            src="/logo-fade.png"
            alt="eCash"
            className="object-contain"
            fill
            sizes="(max-width: 1024px) 100px, 160px"
          />
        </div>

        {/* Heading */}
        <h2 className="relative z-20 text-3xl font-bold leading-tight text-white md:text-4xl">
          Start building with XEC
        </h2>

        {/* Description */}
        <p className="m-auto my-4 mb-8 max-w-[400px]">
          Discover the ecosystem of applications and tools built on the eCash
          network. Start building the future of cash for the internet.
        </p>

        {/* Call-to-action button */}
        <div className="flex justify-center">
          <Button href="/build" variant="gradient">
            Start building
          </Button>
        </div>
      </div>
    </section>
  );
}
