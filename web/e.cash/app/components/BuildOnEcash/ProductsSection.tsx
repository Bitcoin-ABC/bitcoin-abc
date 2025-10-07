// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import { motion } from "framer-motion";

interface Product {
  name: string;
  description: string;
  url: string;
}

const products: Product[] = [
  {
    name: "Cashtab",
    description:
      "The official eCash wallet - a secure, user-friendly web wallet for managing XEC and tokens",
    url: "https://cashtab.com/",
  },
  {
    name: "Electrum ABC",
    description: "Desktop eCash wallet with advanced features for power users",
    url: "https://www.bitcoinabc.org/electrum/",
  },
  {
    name: "PayButton",
    description: "The easiest way to accept eCash on any website",
    url: "https://www.paybutton.org/",
  },
  {
    name: "XECX",
    description: "Staking protocol token for eCash. Earn XEC by holding XECX",
    url: "https://stakedxec.com/",
  },
  {
    name: "Firma",
    description:
      "Fully backed stablecoin on the eCash Network with daily native yield and instant liquidity",
    url: "https://firma.cash/",
  },
  {
    name: "BlitzChips",
    description:
      "Provably fair game of chance with instant payouts using Firma",
    url: "https://blitzchips.com/",
  },
  {
    name: "Marianas Stablecoin",
    description:
      "The first fully-reserved, fiat-backed stable token issued by a public entity in the United States",
    url: "https://dollar.mp/",
  },
  {
    name: "eLPS",
    description:
      "Powering the digital economy in the world's #1 Charter City, the eLempira (eLPS) is a stabletoken built on eCash",
    url: "https://elpstoken.com/",
  },
  {
    name: "TixTown",
    description:
      "The fastest, safest, and fairest private event ticketing app, powered by eCash",
    url: "https://www.tixtown.com/",
  },
  {
    name: "LocaleCash",
    description:
      "Trade XEC against fiat, crypto, or goods using a non-custodial escrow",
    url: "https://localecash.com/",
  },
  {
    name: "eCash Explorer",
    description:
      "Blockchain explorer for viewing transactions, blocks, and addresses on the eCash network",
    url: "https://explorer.e.cash/",
  },
  {
    name: "eCash Herald",
    description:
      "Real-time notifications and alerts for eCash network activity",
    url: "https://t.me/eCashHerald",
  },
  {
    name: "Agora.Cash",
    description:
      "eToken DEX UI built on Cashtab Agora, offering exchange-style charts and analytics",
    url: "https://agora.cash/",
  },
  {
    name: "MetaChronik",
    description:
      "Indexes eCash blockchain data from Chronik into a PostgreSQL database for analytics and chart generation",
    url: "https://github.com/Bitcoin-ABC/bitcoin-abc/tree/master/apps/metachronik",
  },
  {
    name: "Cashtab Faucet",
    description:
      "Server to manage Cashtab rewards tokens. May be modified to support other token back-end tasks.",
    url: "https://github.com/Bitcoin-ABC/bitcoin-abc/tree/master/apps/cashtab-faucet",
  },
  {
    name: "Faucet",
    description:
      "Simple and fully configurable faucet application that is suitable for sending testnet coins",
    url: "https://github.com/Bitcoin-ABC/bitcoin-abc/tree/master/apps/faucet",
  },
];

export default function ProductsSection() {
  return (
    <div className="relative w-full py-20" id="products">
      <ContentContainer>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className="mb-16 flex flex-col items-center gap-4 text-center"
        >
          <PlusHeader text="Builders" />
          <h2 className="text-4xl font-bold tracking-tighter lg:text-5xl">
            Products built with <span className="gradient-text">XEC</span>
          </h2>
          <p className="text-secondaryText mx-auto max-w-[500px] text-center text-base lg:text-lg">
            Discover the ecosystem of applications and tools built on the eCash
            network
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.2 }}
        >
          {products.map((product) => (
            <motion.a
              key={product.name}
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{
                once: true,
                amount: 0.3,
                margin: "0px 0px -50px 0px",
              }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className="hover:to-white/15 group cursor-pointer rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-6 transition-all duration-200 hover:border-white/20 hover:from-white/10"
            >
              <h3 className="mb-1 text-xl font-bold transition-colors duration-200 group-hover:text-purple-500">
                {product.name}
              </h3>

              <p className="text-secondaryText text-sm leading-relaxed transition-colors duration-300 group-hover:!text-white">
                {product.description}
              </p>
            </motion.a>
          ))}
        </motion.div>
      </ContentContainer>
    </div>
  );
}
