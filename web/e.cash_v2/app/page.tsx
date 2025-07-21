// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import Hero from "./components/Home/Hero";
import TrustedBy from "./components/Home/TrustedBy";
import WhatWeDo from "./components/Home/WhatWeDo";
import DigitalPaymentLandscape from "./components/Home/DigitalPaymentLandscape";
import PoweringPayments from "./components/Home/PoweringPayments";
import BentoGrid from "./components/Home/BentoGrid";
import AvalancheEnhanced from "./components/Home/AvalancheEnhanced";
import Developers from "./components/Home/Developers";
import CardCarousel from "./components/Home/CardCarousel";
import Quotes from "./components/Home/Quotes";
import FeaturedArticles from "./components/Home/FeaturedArticles";
import GettingStarted from "./components/Home/GettingStarted";
import FAQ from "./components/Home/FAQ";

export default function Home() {
  return (
    <main>
      <Hero />
      <TrustedBy />
      <WhatWeDo />
      <DigitalPaymentLandscape />
      <PoweringPayments />
      <BentoGrid />
      <AvalancheEnhanced />
      <div className="pb-30 bg-[linear-gradient(-135deg,_#1F1428,_#090916,_#0F1528,_#090916)]">
        <Developers />
        <CardCarousel />
        <Quotes />
      </div>
      <GettingStarted />
      <FeaturedArticles />
      <FAQ />
    </main>
  );
}
