// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import { motion } from "motion/react";
import Image from "next/image";

interface RoadmapItem {
  title: string;
  description: string;
  status: "complete" | "underway" | "planning";
}

interface RoadmapCategory {
  title: string;
  description: string;
  items: RoadmapItem[];
}

const roadmapData: RoadmapCategory[] = [
  {
    title: "Scaling",
    description:
      "Enable eCash to scale from ~100 tx/s to over 5,000,000 tx/s. Mass-parallelization is necessary to achieve mankind scale.",
    items: [
      {
        title: "UTXO Commitments",
        description: "Blockchain pruning, faster initial sync",
        status: "underway",
      },
      {
        title: "Faster Block Propagation",
        description: "Graphene or other",
        status: "planning",
      },
      {
        title: "Merklix-Metadata Tree",
        description: "Scalable block processing",
        status: "planning",
      },
      {
        title: "Adaptive Block Size",
        description: "Market driven growth to 1TB blocks",
        status: "planning",
      },
      {
        title: "Canonical Transaction Ordering",
        description: "Scalable block processing",
        status: "complete",
      },
      {
        title: "Schnorr Signatures",
        description: "Batched signature validation",
        status: "complete",
      },
    ],
  },
  {
    title: "Usability",
    description:
      "Improve the eCash payment experience to ensure that it is instant and reliable. Transactions must be received instantly and be completely secure within seconds.",
    items: [
      {
        title: "Avalanche Pre-consensus",
        description: "Instant transactions & real-time processing",
        status: "underway",
      },
      {
        title: "Zero-Knowledge Subnet",
        description: "Bulletproof privacy",
        status: "planning",
      },
      {
        title: "Fractional Satoshis",
        description: "Fees low forever",
        status: "planning",
      },
      {
        title: "CashAddr",
        description: "Easier & safer to use",
        status: "complete",
      },
      {
        title: "Sighash",
        description: "Hardware wallet security",
        status: "complete",
      },
      {
        title: "Convenient Units",
        description: "2 decimal places",
        status: "complete",
      },
      {
        title: "Avalanche Post-consensus",
        description: "Enhanced security & 1-block finality",
        status: "complete",
      },
      {
        title: "CashFusion",
        description: "Opt-in privacy",
        status: "complete",
      },
      {
        title: "Blockchain Indexer",
        description: "Powerful application API",
        status: "complete",
      },
      {
        title: "Regular Heartbeat",
        description: "More consistent block times",
        status: "complete",
      },
    ],
  },
  {
    title: "EXTENSIBILITY",
    description:
      "Make eCash extensible. An extensible protocol makes future improvements less disruptive, providing a solid base for businesses and developers to build on.",
    items: [
      {
        title: "EVM Subnet",
        description: "Scalable smart contracts & improved privacy",
        status: "planning",
      },
      {
        title: "Advanced Opcodes",
        description: "Enhanced script capability",
        status: "planning",
      },
      {
        title: "New Transaction Format",
        description: "More capable & compact",
        status: "planning",
      },
      {
        title: "Foundational Opcodes",
        description: "Functional script capability",
        status: "complete",
      },
      {
        title: "Larger OP_RETURN",
        description: "Tokens on chain",
        status: "complete",
      },
      {
        title: "OP_CHECKDATASIG",
        description: "Oracles and covenants",
        status: "complete",
      },
    ],
  },
];

const improvements = [
  {
    icon: "/share.png",
    title: "Transaction Throughput",
    description:
      "Scaling transaction throughput (from about 100 transactions per second to more than 5 million transactions per second).",
  },
  {
    icon: "/users-check.png",
    title: "Payment Experience",
    description:
      "Improving the payment experience. Instant and reliable is the baseline. All transactions should arrive instantly and be secure within 3 seconds",
  },
  {
    icon: "/code-snippet.png",
    title: "Protocol & Upgrades",
    description:
      "Extending the protocol & establishing fork-free future upgrades to support tomorrow's economy.",
  },
];
interface RoadmapItemProps {
  item: RoadmapItem;
}

const RoadmapItem = ({ item }: RoadmapItemProps) => {
  const getStatusColor = (status: RoadmapItem["status"]) => {
    switch (status) {
      case "planning":
        return "from-white/10 to-white/20";
      case "underway":
        return "from-[#51039B] to-[#0d082c]";
      case "complete":
        return "from-[#005898] to-[#040f25]";
      default:
        return "bg-white/10";
    }
  };

  return (
    <div
      className={`flex h-[260px] w-[90%] max-w-[300px] shrink-0 flex-col justify-between gap-2 rounded-lg bg-gradient-to-b p-4 lg:h-[280px] lg:w-[220px] lg:max-w-none ${getStatusColor(
        item.status
      )}`}
    >
      <span className="inline-block w-fit rounded-full bg-white/20 px-3 py-0.5 text-xs capitalize">
        {item.status}
      </span>
      <div>
        <div className="mb-2 text-lg font-bold leading-tight">{item.title}</div>
        <p className="text-sm">{item.description}</p>
      </div>
    </div>
  );
};

interface RoadmapCategoryProps {
  category: RoadmapCategory;
}

const RoadmapCategory = ({ category }: RoadmapCategoryProps) => (
  <div className="mb-16 flex flex-col">
    <div className="mb-4 flex w-full max-w-[500px] flex-col gap-2">
      <h3 className="text-2xl font-bold lg:text-3xl">{category.title}</h3>
      <p className="pr-6 lg:pr-0">{category.description}</p>
    </div>
    <div className="scrollx-container relative mt-3 flex w-full snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-4 pr-10">
      {category.items.map((item, index) => (
        <RoadmapItem key={index} item={item} />
      ))}
    </div>
  </div>
);

export default function RoadmapGrid() {
  return (
    <div className="py-10">
      <ContentContainer>
        <div className="flex w-full flex-col gap-4 text-center">
          <h3 className="mb-6 text-2xl font-bold lg:text-3xl">
            Main areas of improvement
          </h3>
          <div className="mb-30 flex w-full flex-col justify-between gap-4 lg:flex-row">
            {improvements.map((improvement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 0.6,
                  delay: 0.2,
                  ease: "easeOut",
                }}
                className="m-auto mb-10 flex max-w-[300px] flex-col items-center text-center lg:m-0 lg:mb-0"
              >
                {/* Icon Container */}
                <div className="bg-white/4 mb-2 flex items-center justify-center rounded-full border-t border-t-white/10 p-6 shadow-lg lg:mb-6 lg:p-8">
                  <div className="relative h-6 w-6 lg:h-10 lg:w-10">
                    <Image
                      src={improvement.icon}
                      alt={improvement.title}
                      fill
                      sizes="(max-width: 1024px) 24px, 40px"
                    />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white lg:mb-4">
                  {improvement.title}
                </h3>

                {/* Description */}
                <p className="text-secondaryText text-sm leading-relaxed lg:text-base">
                  {improvement.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </ContentContainer>
      <ContentContainer className="pr-0">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full"
        >
          {roadmapData.map((category, index) => (
            <RoadmapCategory key={index} category={category} />
          ))}
        </motion.div>
      </ContentContainer>
    </div>
  );
}
