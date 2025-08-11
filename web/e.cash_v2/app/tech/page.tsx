// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import TechHero from "../components/Tech/TechHero";
import TechFeatures from "../components/Tech/TechFeatures";
import CoreTech from "../components/Tech/CoreTech";
import RecentlyBuilt from "../components/Tech/RecentlyBuilt";
import StartBuildingSection from "../components/Atoms/StartBuildingSection";
import FeaturedArticles from "../components/Home/FeaturedArticles";
import GettingStarted from "../components/Home/GettingStarted";
import FAQ from "../components/Home/FAQ";

export default function Tech() {
  return (
    <main>
      <div className="bg-gradient-to-br from-[#1F1428] via-[#090916] to-[#0F1528]">
        <TechHero />
        <TechFeatures />
        <CoreTech />
        <RecentlyBuilt />
        <FeaturedArticles />
        <GettingStarted />
        <div className="mt-30" />
        <FAQ />
        <StartBuildingSection />
      </div>
    </main>
  );
}
