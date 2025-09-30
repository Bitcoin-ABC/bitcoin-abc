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
        "A breakthrough consensus algorithm integrated with eCash’s core Proof-of-Work, improving scalability, security, speed, and extensibility.",
      bulletPoints: [
        "Instant transaction finality",
        "Enhanced security through hybrid consensus",
        "Fork-free network upgrades",
        "Real-time processing for higher throughput",
      ],
      image: "/avalanche-m.png",
    },
    {
      title: "Chronik",
      description:
        "A super fast, reliable, and future-proof indexing solution built right into the node. Developers can easily bootstrap and leverage native support for all features available on eCash.",
      bulletPoints: [
        "Fast and reliable blockchain indexing",
        "Built into Bitcoin ABC node software",
        "Highly scalable for developers",
        "Memory safe",
      ],
      image: "/chronik-m.png",
    },
    {
      title: "Tokens",
      description:
        "Create and trade tokens instantly. Supported features include minting, burning, airdrops, and atomic swaps. Unlike on smart chains, tokens can never be frozen by the mint address, and fees are virtually zero",
      bulletPoints: [
        "One-click token and NFT creation",
        "Zero-slippage trading on native dex",
        "Ultra-low transaction costs",
        "Optional gasless protocols",
      ],
      image: "/tokens-m.png",
    },
    {
      title: "Staking",
      description:
        "Holder-based staking rewards that incentivize network participation while providing protocol governance mechanisms. Earn eCash for making the network more robust and efficient by running an Avalanche-enabled staking node.",
      bulletPoints: [
        "Earn rewards by staking XEC",
        "Participate in network governance",
        "Incentivized node operation",
        "Increase protocol security and efficiency",
      ],
      image: "/staking-m.png",
    },
    {
      title: "Subnets",
      description:
        "Customized networks directly linked to the base layer allow developers to build extended features and protocols with unique properties.",
      bulletPoints: [
        "EVM compatibility for DeFi integration",
        "Zero-Knowledge subnet for privacy",
        "Permissionless custom networks",
        "Agile feature development",
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
        "An optional CoinJoin protocol that offers high degrees of privacy at scale while maintaining an auditable supply cap.",
      bulletPoints: [
        "Bank-level privacy protection",
        "Non-custodial",
        "One-click activation",
      ],
      image: "/cashfusion-m.png",
    },
    {
      title: "UTXO Model",
      description:
        "eCash uses an Unspent Transaction Output (UTXO) architecture, enabling highly scalable parallel transaction processing with advanced features like pay-to-many and gasless transactions.",
      bulletPoints: [
        "Enables parallel processing for mass-scale",
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
