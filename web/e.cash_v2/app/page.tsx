// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import Hero from "./components/Hero";
import TrustedBy from "./components/TrustedBy";
import WhatWeDo from "./components/WhatWeDo";
import DigitalPaymentLandscape from "./components/DigitalPaymentLandscape";
import PoweringPayments from "./components/PoweringPayments";
import BentoGrid from "./components/BentoGrid";
import AvalancheEnhanced from "./components/AvalancheEnhanced";
import Developers from "./components/Developers";

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
