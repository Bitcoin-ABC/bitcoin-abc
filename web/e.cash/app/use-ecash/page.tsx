// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import UseCashHero from "../components/UseCash/UseCashHero";
import UseCashContent from "../components/UseCash/UseCashContent";
import { getScoreCardData, Service } from "../data/scores";

// Length of time to cache the page in seconds
// Value must be a static export to work with Next.js
export const revalidate = 43200;

export default async function UseEcash() {
  let services: Service[] = [];
  let hasError = false;

  try {
    const data = await getScoreCardData();
    services = data.services;
  } catch (error) {
    console.error("Error fetching services:", error);
    hasError = true;
  }

  return (
    <main>
      <div className="bg-gradient-to-br from-[#1F1428] via-[#090916] to-[#0F1528]">
        <UseCashHero />
        <UseCashContent services={services} hasError={hasError} />
      </div>
    </main>
  );
}
