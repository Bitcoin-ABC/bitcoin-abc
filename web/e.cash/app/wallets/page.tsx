// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import WalletsHero from "../components/Wallets/WalletsHero";
import WalletsContent from "../components/Wallets/WalletsContent";

export default function Wallets() {
  return (
    <main>
      <div className="bg-gradient-to-br from-[#1F1428] via-[#090916] to-[#0F1528]">
        <WalletsHero />
        <WalletsContent />
      </div>
    </main>
  );
}
