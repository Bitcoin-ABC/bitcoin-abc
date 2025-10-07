// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import BuildHero from "../components/BuildOnEcash/BuildHero";
import BuildItems from "../components/BuildOnEcash/BuildItems";
import BentoGrid from "../components/Home/BentoGrid";
import { ScrollElement } from "../components/Home/Developers";
import ProductsSection from "../components/BuildOnEcash/ProductsSection";
import FAQ from "../components/Home/FAQ";

export default function Build() {
  return (
    <main>
      <BuildHero />
      <BuildItems />
      <BentoGrid />
      <div className="m-auto mb-10 mt-[-60px] flex w-full select-none items-center overflow-hidden lg:mb-20">
        <div className="srcoll-animation flex items-center gap-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <ScrollElement key={i} />
          ))}
        </div>
      </div>
      <ProductsSection />
      <FAQ />
    </main>
  );
}
