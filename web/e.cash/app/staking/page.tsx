// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import StakingHero from "../components/Staking/StakingHero";
import StakingContent from "../components/Staking/StakingContent";
import StartBuildingSection from "../components/Atoms/StartBuildingSection";

export default function Staking() {
  return (
    <main>
      <div className="bg-gradient-to-br from-[#1F1428] via-[#090916] to-[#0F1528]">
        <StakingHero />
        <StakingContent />
        <StartBuildingSection />
      </div>
    </main>
  );
}
