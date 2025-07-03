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
      <Developers />
    </main>
  );
}
