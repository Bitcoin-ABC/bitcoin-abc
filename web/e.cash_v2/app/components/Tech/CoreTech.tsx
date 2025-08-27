// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import Image from "next/image";
import { motion } from "motion/react";

export default function CoreTech() {
  const features = [
    {
      title: "Avalanche",
      description:
        "A revolutionary consensus algorithm integrated with eCash's core Proof-of-Work, enabling instant transactions, enhanced security, and fork-free upgrades.",
      bulletPoints: [
        "Instant transaction finality",
        "Enhanced security through hybrid consensus",
        "Fork-free network upgrades",
      ],
      image: "/avalanche-m.png",
    },
    {
      title: "Chronik",
      description:
        "Chronik is an indexer integrated right into the node. This super fast, reliable and highly scalable indexing solution makes it easy for developers to bootstrap and leverage native support for all available features on the eCash network.",
      bulletPoints: [
        "Fast and reliable blockchain indexing",
        "Built into Bitcoin ABC node software",
        "Highly scalable for developers",
      ],
      image: "/chronik-m.png",
    },
    {
      title: "Tokens",
      description:
        "Create and trade tokens (and NFTs) instantly. Supported features include minting, burning, sending, and trading. Transaction fees are virtually zero. Unlike tokens on ETH or SOL, tokens created on the eCash network can never be frozen by the mint address.",
      bulletPoints: [
        "One-click token creation",
        "Zero-slippage trading on native dex",
        "Ultra-low transaction costs",
      ],
      image: "/tokens-m.png",
    },
    {
      title: "Staking",
      description:
        "Holder-based staking rewards that incentivize network participation while providing governance mechanisms for the eCash ecosystem.",
      bulletPoints: [
        "Earn rewards by staking XEC",
        "Participate in network governance",
        "Incentivized node operation",
      ],
      image: "/staking-m.png",
    },
    {
      title: "Subnets",
      description:
        "Customized networks linked to the main eCash blockchain that allow developers to build protocols with unique properties while maintaining value connection.",
      bulletPoints: [
        "EVM compatibility for DeFi integration",
        "Zero-Knowledge subnet for privacy",
        "Permissionless custom networks",
      ],
      image: "/subnets-m.png",
    },
    {
      title: "Small, Convenient Denomination",
      description:
        "eCash uses 2 decimal places instead of 8, making it more user-friendly and potentially more attractive for price appreciation.",
      bulletPoints: [
        "User-friendly 2 decimal places",
        "Simplified price representation",
        "Enhanced market appeal",
      ],
      image: "/coins.png",
    },
    {
      title: "CashFusion",
      description:
        "Advanced privacy protocol that offers anonymity comparable to top privacy coins while maintaining an auditable supply cap.",
      bulletPoints: [
        "Bank-level privacy protection",
        "Auditable supply cap maintained",
        "Optional privacy features",
      ],
      image: "/cashfusion-m.png",
    },
    {
      title: "UTXO Model",
      description:
        "eCash uses the Unspent Transaction Output (UTXO) model, enabling highly scalable parallel transaction processing with advanced features like pay-to-many and gasless transactions.",
      bulletPoints: [
        "Highly scalable parallel processing",
        "Pay-to-many and gasless transactions",
        "Enhanced security and auditability",
      ],
      image: "/utxo.png",
    },
  ];

  return (
    <div className="relative w-full py-16 lg:py-20">
      <ContentContainer>
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-10">
          {features.map((feature, index) => (
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
              className="pb-10"
            >
              {/* Graphic Container */}
              <div className="bg-white/4 mb-6 flex h-[200px] items-center justify-center rounded-xl border-t border-t-white/10 p-4 shadow-lg lg:h-[300px]">
                <div className="relative h-full w-[60%]">
                  <Image
                    src={feature.image}
                    alt="Feature graphic"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 60vw, (max-width: 1024px) 30vw, 20vw"
                  />
                </div>
              </div>

              <div className="flex flex-col px-4 lg:px-6">
                {/* Title */}
                <h3 className="mb-4 text-xl font-bold text-white lg:text-2xl">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-secondaryText mb-6 text-sm font-light leading-normal lg:text-base">
                  {feature.description}
                </p>

                {/* Bullet Points */}
                <ul className="space-y-3">
                  {feature.bulletPoints.map((point, pointIndex) => (
                    <li
                      key={pointIndex}
                      className="text-accentLight flex items-start text-sm font-light"
                    >
                      <span className="mr-1">
                        <Image
                          src="/check.png"
                          alt="Check"
                          width={20}
                          height={20}
                        />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </ContentContainer>
    </div>
  );
}
