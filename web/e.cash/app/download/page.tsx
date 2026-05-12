// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { Metadata } from "next";
import DownloadHero from "../components/Download/DownloadHero";
import DownloadSummary from "../components/Download/DownloadSummary";
import StartBuildingSection from "../components/Atoms/StartBuildingSection";

export const metadata: Metadata = {
  title: "Download | eCash",
  description:
    "Download Bitcoin ABC eCash node software, Cashtab, Marlin, Electrum ABC, and other official wallet builds.",
};

export default function DownloadPage() {
  return (
    <main>
      <div className="bg-gradient-to-br from-[#1F1428] via-[#090916] to-[#0F1528]">
        <DownloadHero />
        <DownloadSummary />
        <StartBuildingSection />
      </div>
    </main>
  );
}
