// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import GridPattern from "../Atoms/GridPattern";
import Image from "next/image";
import { motion } from "motion/react";

export default function TechHero() {
  return (
    <div className="relative w-full overflow-hidden py-20 lg:py-40">
      <GridPattern />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
        className="absolute left-1/2 top-0 aspect-[700/677] w-[90%] max-w-[400px] -translate-x-1/2 lg:w-[580px] lg:max-w-none lg:translate-x-[30px]"
      >
        <Image src="/tech.png" alt="eCash" fill />
      </motion.div>
      <ContentContainer>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 m-auto flex w-full max-w-[550px] flex-col items-center text-center lg:m-0 lg:w-[50%] lg:items-start lg:text-left"
        >
          <div className="pink-gradient-text mb-4 text-sm font-light uppercase tracking-wide">
            TECH
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tighter text-white lg:text-6xl lg:leading-[60px]">
            Enabling instant, low-cost payments across the internet
          </h1>

          <p>
            Welcome to the next generation of crypto. eCash combines the core
            tech behind Bitcoin's success — the same fixed supply, halving
            schedule, and genesis block — with state of the art crypto tech.
          </p>
        </motion.div>
      </ContentContainer>
    </div>
  );
}
