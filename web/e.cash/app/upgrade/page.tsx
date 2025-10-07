// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import UpgradeHero from "../components/Upgrade/UpgradeHero";
import UpgradeContent from "../components/Upgrade/UpgradeContent";
import StartBuildingSection from "../components/Atoms/StartBuildingSection";

const oldVersion = "0.31.13";

async function getLatestVersion(): Promise<string> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/Bitcoin-abc/bitcoin-abc/releases?per_page=1",
      {
        headers: {
          accept: "application/vnd.github.v3+json",
        },
        // Add cache revalidation
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch releases: ${response.status}`);
    }

    const releases = await response.json();
    return releases[0].name;
  } catch (error) {
    console.error("Failed to fetch latest version:", error);
    // Fallback to a default version if API fails
    return "0.32.0";
  }
}

export default async function Upgrade() {
  const latestVersion = await getLatestVersion();
  const latestMajor = latestVersion.split(".", 2).join(".").concat(".x");

  return (
    <main>
      <div className="bg-gradient-to-br from-[#1F1428] via-[#090916] to-[#0F1528]">
        <UpgradeHero />
        <UpgradeContent
          oldVersion={oldVersion}
          latestVersion={latestVersion}
          latestMajor={latestMajor}
        />
        <StartBuildingSection />
      </div>
    </main>
  );
}
