// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import GridPattern from "../Atoms/GridPattern";
import Image from "next/image";
import { motion } from "motion/react";

export default function AboutHero() {
  return (
    <div className="relative w-full overflow-hidden py-20 lg:py-40">
      <GridPattern />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
        className="lg:translate-x-[30px relative top-0 m-auto mt-[-80px] aspect-[900/913] w-[90%] max-w-[400px] lg:absolute lg:left-1/2 lg:mt-0 lg:w-[580px] lg:max-w-none"
      >
        <Image
          src="/about.png"
          alt="eCash"
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 90vw, 580px"
        />
      </motion.div>
      <ContentContainer>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 m-auto flex w-full max-w-[300px] flex-col items-center text-center lg:m-0 lg:w-[50%] lg:max-w-[550px] lg:items-start lg:text-left"
        >
          <div className="pink-gradient-text mb-4 text-sm font-light uppercase tracking-wide">
            ABOUT XEC
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tighter text-white lg:text-6xl lg:leading-[60px]">
            The future of payments requires new technology
          </h1>

          <p>
            Digital payments are on the verge of explosive growth. If current
            trends continue, we could reach 100 billion daily transactions — a
            scale that would cripple today's payment infrastructure.
          </p>
        </motion.div>
      </ContentContainer>
    </div>
  );
}
