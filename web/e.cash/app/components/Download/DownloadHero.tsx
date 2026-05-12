// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import GridPattern from "../Atoms/GridPattern";
import { motion } from "motion/react";

export default function DownloadHero() {
  return (
    <div className="relative w-full overflow-hidden py-20 lg:py-32">
      <GridPattern className="top-24 left-1/2 -translate-x-1/2 lg:top-32" />
      <ContentContainer>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 mx-auto flex max-w-[720px] flex-col items-center text-center"
        >
          <div className="pink-gradient-text mb-4 text-sm font-light tracking-wide uppercase">
            Bitcoin ABC
          </div>
          <h1 className="mb-5 text-4xl font-bold tracking-tighter text-white lg:text-5xl lg:leading-tight">
            Download
          </h1>
          <p className="text-secondaryText max-w-[540px] font-light">
            Official Bitcoin ABC node releases plus eCash wallets — Cashtab,
            Marlin, Electrum ABC, and more.
          </p>
        </motion.div>
      </ContentContainer>
    </div>
  );
}
