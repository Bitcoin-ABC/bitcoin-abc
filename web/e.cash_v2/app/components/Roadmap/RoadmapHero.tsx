// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import GridPattern from "../Atoms/GridPattern";
import { motion } from "motion/react";

export default function RoadmapHero() {
  return (
    <div className="relative w-full overflow-hidden py-20 lg:py-40">
      <GridPattern />
      <ContentContainer>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 m-auto flex w-full max-w-[600px] flex-col items-center text-center"
        >
          <h1 className="mb-6 text-4xl font-bold tracking-tighter text-white lg:text-6xl lg:leading-[60px]">
            Our release roadmap
          </h1>

          <p>
            The goal for eCash is to become sound money that is usable by
            everyone in the world. This is a civilization-changing technology
            which will dramatically increase human freedom and prosperity.
          </p>
        </motion.div>
      </ContentContainer>
    </div>
  );
}
