// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import BuildHero from "../components/BuildOnEcash/BuildHero";
import BuildItems from "../components/BuildOnEcash/BuildItems";
import BentoGrid from "../components/Home/BentoGrid";
import { ScrollElement } from "../components/Home/Developers";
import ProductsSection from "../components/BuildOnEcash/ProductsSection";
import FAQ from "../components/Home/FAQ";
import { getProducts } from "../data/products";

// Length of time to cache the page in seconds
// Value must be a static export to work with Next.js
export const revalidate = 7200;

export default async function Build() {
  const products = await getProducts();

  return (
    <main>
      <BuildHero />
      <BuildItems />
      <BentoGrid />
      <div className="m-auto mt-[-60px] mb-10 flex w-full items-center overflow-hidden select-none lg:mb-20">
        <div className="srcoll-animation flex items-center gap-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <ScrollElement key={i} />
          ))}
        </div>
      </div>
      <ProductsSection products={products} />
      <FAQ />
    </main>
  );
}
