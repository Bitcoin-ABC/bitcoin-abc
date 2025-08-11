// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import AboutHero from "../components/About/AboutHero";
import AboutSection from "../components/About/AboutSection";
import VisionSection from "../components/About/VisionSection";
import FAQ from "../components/Home/FAQ";
import StartBuildingSection from "../components/Atoms/StartBuildingSection";

export default function About() {
  return (
    <main>
      <div className="bg-gradient-to-br from-[#1F1428] via-[#090916] to-[#0F1528]">
        <AboutHero />
        <AboutSection />
        <VisionSection />
        <FAQ />
      </div>
      <StartBuildingSection />
    </main>
  );
}
