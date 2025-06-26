// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
"use client";
import { useState } from "react";
import Image from "next/image";
import ContentContainer from "./ContentContainer";
import { cn } from "../utils/cn";

interface Feature {
  feature: string;
  details: string;
}

const features: Feature[] = [
  {
    feature: "51% Attack Protection",
    details:
      "Other networks with low hash rates are vulnerable to mining attacks. With Avalanche, eCash is protected. An attacker would need not only most of the hash rate, but also most of the staked eCash. Avalanche consensus selects the chain miners will mine on, and the nodes that make up the network are weighted by their stake.",
  },
  {
    feature: "1-block Finality",
    details:
      "Avalanche Post-consensus provides certainty that transactions with 1 confirmation are final, allowing businesses to credit payments much faster (and with confidence).",
  },
  {
    feature: "Staking Rewards",
    details:
      "Staking Rewards strengthen the network by incentivizing honest nodes. Each additional coin staked makes the network more invulnerable to attacks. Staking Rewards also fuels eCash’s economic engine, allowing XEC holders to earn passive income, incentivizing holding, and supporting the price by reducing available supply.",
  },
  {
    feature: "Consistent Block Times",
    details:
      "Minority networks suffer from erratic block times due to abrupt hash switching. Avalanche makes it possible to enforce a much more steady stream of blocks by penalizing blocks that come in too early. Regular block times are also useful for legacy businesses that opt to continue relying on blocks in their business logic.",
  },
  {
    feature: "Real-time Transaction Processing",
    details:
      "Since the network will not have to wait for a block to validate transactions, transaction throughput increases. Real-time Transaction Processing allows eCash nodes to prepare for each block before confirmation, significantly reducing the amount of work required when a block comes in.",
  },
  {
    feature: "Instant Finality",
    details:
      "Post-consensus finalizes transactions after a single block is found, due to reorg being prevented by the Avalanche consensus. Pre-consensus validates individual transactions before they are included in a block, reducing confirmation time for a transaction from 10 minutes to a few seconds - that’s more than 100 times faster than Proof of Work-only cryptos like Bitcoin.",
  },
  {
    feature: "Dynamic Block Size",
    details:
      "The maximum block size can be decided by Avalanche consensus to allow the network to scale gradually based on the number of transactions. The eCash network will be able to scale with market demand while mitigating spam attacks, and keeping the bandwidth under control.",
  },
  {
    feature: "Dynamic Transaction Fees",
    details:
      "eCash fees can be adjusted dynamically depending on demand, making it possible to send transactions with very minimal or even no fee at all.",
  },
  {
    feature: "Subnets",
    details:
      "Subnet validation enables unlimited second layer protocols with virtually no impact on the main chain. Privacy, smart contracts, and other popular features proven out by other chains would be supported on eCash.",
  },
  {
    feature: "Fork-Free Upgrades",
    details:
      "The introduction of Avalanche consensus on eCash allows network upgrades to take place quickly and behind the scenes without disrupting users or builders. Avalanche is able to take responsibility for network policy rules, rather than being hard-coded and requiring node operators to upgrade before the changes go live.",
  },
];

export default function AvalancheEnhanced() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <ContentContainer className="mb-50 pb-30 max-w-[1200px] rounded-[44px] bg-zinc-950/40 pt-10">
      <div className="flex flex-col text-center">
        <div className="relative m-auto mb-[-20px] h-[150px] w-[150px] lg:mb-[-40px] lg:h-[220px] lg:w-[220px]">
          <Image
            src="/avalanche2.png"
            alt="avalanche"
            fill
            className="object-contain"
          />
        </div>
        <h3 className="pink-gradient-text z-20 m-auto mb-6 max-w-[300px] text-4xl font-bold tracking-[-1.4px] lg:max-w-none lg:text-6xl">
          Avalanche enhanced
        </h3>
        <div className="m-auto max-w-[300px] text-xl font-bold leading-7 lg:max-w-[550px] lg:text-2xl">
          The unique Avalanche/PoW hybrid consensus allows nodes to make
          decisions in real-time without sacrificing decentralization
          principles.
        </div>
        <div className="m-auto mt-10 w-full max-w-[600px]">
          {features.map(({ feature, details }, index) => {
            const isOpen = index === openIndex;
            return (
              <div
                key={index}
                className="border-white/15 group cursor-pointer border-b py-5 transition-all hover:border-white/100"
                onClick={() => toggleItem(index)}
              >
                <div className="flex w-full items-center justify-between focus:outline-none">
                  <h4 className="select-none text-lg font-bold lg:text-xl">
                    {feature}
                  </h4>
                  <span
                    className={cn(
                      "relative flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1px] border-white text-current group-hover:bg-white group-hover:text-black",
                      "before:absolute before:h-[1px] before:w-[8px] before:bg-current before:transition-all before:duration-200 before:content-['']",
                      "after:absolute after:h-[8px] after:w-[1px] after:origin-center after:bg-current after:transition-all after:duration-200 after:content-['']",
                      isOpen
                        ? "after:scale-y-0"
                        : "opacity-30 after:scale-y-100 group-hover:opacity-100"
                    )}
                  />
                </div>

                <p
                  className={cn(
                    "text-secondaryText duration-800 mt-4 select-none overflow-hidden text-left font-light transition-all ease-in-out",
                    isOpen
                      ? "max-h-[600px] opacity-100"
                      : "mt-0 max-h-0 opacity-0"
                  )}
                >
                  {details}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </ContentContainer>
  );
}
