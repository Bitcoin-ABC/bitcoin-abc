// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import GetEcashHero from "../components/GetEcash/GetEcashHero";
import GetEcashContent from "../components/GetEcash/GetEcashContent";
import { getScoreCardData, Exchange, InstantExchange } from "../data/scores";

// Length of time to cache the page in seconds
// Value must be a static export to work with Next.js
export const revalidate = 43200;

export default async function GetEcash() {
  let exchanges: Exchange[] = [];
  let instantExchanges: InstantExchange[] = [];
  let hasError = false;

  try {
    const data = await getScoreCardData();
    exchanges = data.exchanges;
    instantExchanges = data.instantExchanges;
  } catch (error) {
    console.error("Error fetching exchanges:", error);
    hasError = true;
  }

  return (
    <main>
      <div className="bg-gradient-to-br from-[#1F1428] via-[#090916] to-[#0F1528]">
        <GetEcashHero />
        <GetEcashContent
          exchanges={exchanges}
          instantExchanges={instantExchanges}
          hasError={hasError}
        />
      </div>
    </main>
  );
}
