// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import Script from "next/script";
import ContentContainer from "../Atoms/ContentContainer";
import { motion } from "motion/react";
import Image from "next/image";
import Button from "../Atoms/Button";
import { Exchange, InstantExchange } from "../../data/scores";

interface GetEcashContentProps {
  exchanges: Exchange[];
  instantExchanges: InstantExchange[];
  hasError: boolean;
}

export default function GetEcashContent({
  exchanges,
  instantExchanges,
  hasError,
}: GetEcashContentProps) {
  return (
    <div className="py-20">
      <ContentContainer className="max-w-[850px]">
        {/* Error Message */}
        {hasError && (
          <div className="mb-8 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-center">
            <p className="text-red-400">
              Unable to load exchange data. Please try again later.
            </p>
          </div>
        )}

        {/* Exchanges Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-20"
        >
          <div className="mb-16 text-center" id="exchanges">
            <h2 className="mb-4 text-3xl font-bold text-white">Exchanges</h2>
            <p className="mx-auto max-w-2xl">
              eCash is currently listed on most major exchanges under the XEC
              ticker.
            </p>
          </div>

          {exchanges.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {exchanges.map((exchange) => {
                const logoSrc = Array.isArray(exchange.attributes.logo.data)
                  ? exchange.attributes.logo.data[0].attributes
                  : exchange.attributes.logo.data.attributes;

                const imageUrl =
                  process.env.NEXT_PUBLIC_STRAPI_SCORECARD_URL + logoSrc.url;

                return (
                  <motion.a
                    key={exchange.id}
                    href={exchange.attributes.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    viewport={{ once: true, amount: 0.3 }}
                    className="transition-bg flex items-center justify-center rounded-xl bg-white/5 p-6 py-10 duration-300 hover:bg-white/10"
                  >
                    <div className="relative h-14 w-full">
                      <Image
                        src={imageUrl}
                        alt={exchange.attributes.name}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-contain"
                        unoptimized={true}
                      />
                    </div>
                  </motion.a>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="mb-4 text-gray-400">
                No exchange data available at the moment.
              </p>
            </div>
          )}
        </motion.div>

        {/* Instant Exchanges Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-20"
        >
          <div className="mb-6 text-center" id="instant-exchanges">
            <h2 className="mb-4 text-3xl font-bold text-white">
              Instant Exchanges
            </h2>
            <p className="mx-auto max-w-2xl">
              Swap your crypto into XEC quickly with the Swapzone or Swapspace
              aggregator — or choose your preferred instant exchange from the
              list below.
            </p>
          </div>

          <div id="swapzone" className="widget-container">
            <div
              id="swapzoneExchangeWidget"
              data-logo="true"
              data-size="full"
              data-refid="68y-3PwW6z"
              data-from="eth"
              data-to="xec"
            />
            <div>
              <iframe
                id="swapspace"
                src="https://swapspace.co/widget/b3fdadc148b1b02f250975eb"
                frameBorder="0"
              />
            </div>
          </div>

          {instantExchanges.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {instantExchanges.map((exchange) => {
                const logoSrc = Array.isArray(exchange.attributes.logo.data)
                  ? exchange.attributes.logo.data[0].attributes
                  : exchange.attributes.logo.data.attributes;

                const imageUrl =
                  process.env.NEXT_PUBLIC_STRAPI_SCORECARD_URL + logoSrc.url;

                return (
                  <motion.a
                    key={exchange.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    href={exchange.attributes.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-bg flex items-center justify-center rounded-xl bg-white/5 p-6 py-10 duration-300 hover:bg-white/10"
                  >
                    <div className="relative h-14 w-full">
                      <Image
                        src={imageUrl}
                        alt={exchange.attributes.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-contain"
                        unoptimized={true}
                      />
                    </div>
                  </motion.a>
                );
              })}
            </div>
          ) : (
            <p className="mb-4 text-gray-400">
              No instant exchanges available at the moment.
            </p>
          )}
        </motion.div>

        {/* Additional Methods Section */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Other ways to get eCash
          </h2>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="grid grid-cols-1 gap-12 lg:grid-cols-2"
        >
          {/* Mining Section */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
            <h3 className="mb-4 text-2xl font-bold text-white">Mining</h3>
            <p className="mb-6 text-gray-300">
              eCash is also available through mining. Join our ever expanding
              community of miners and earn XEC by contributing to the network
              security.
            </p>
            <Button href="/mining" variant="gradient">
              Mine eCash
            </Button>
          </div>

          {/* Staking Section */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
            <h3 className="mb-4 text-2xl font-bold text-white">Staking</h3>
            <p className="mb-6 text-gray-300">
              Stakers power eCash's Avalanche consensus system, and earn staking
              rewards in return. Start earning XEC for running an eCash staking
              node.
            </p>
            <Button href="/staking" variant="gradient">
              Stake eCash
            </Button>
          </div>
        </motion.div>
      </ContentContainer>
      <Script
        src="https://swapzone.io/script/exchange-widget.js"
        id="swapzone"
        strategy="lazyOnload"
      />
    </div>
  );
}
