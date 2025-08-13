// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import MiningHero from "../components/Mining/MiningHero";
import MiningContent from "../components/Mining/MiningContent";

import StartBuildingSection from "../components/Atoms/StartBuildingSection";
import FAQ from "../components/Home/FAQ";

export default function Mining() {
  return (
    <main>
      <div className="bg-gradient-to-br from-[#1F1428] via-[#090916] to-[#0F1528]">
        <MiningHero />
        <MiningContent />
        <FAQ />
        <StartBuildingSection />
      </div>
    </main>
  );
}
