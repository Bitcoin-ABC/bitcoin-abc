// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import GridPattern from "../Atoms/GridPattern";
import Image from "next/image";
import { motion } from "motion/react";

export default function GetEcashHero() {
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
          className="relative z-10 m-auto flex w-full max-w-[550px] flex-col items-center text-center lg:m-0 lg:w-[50%] lg:items-start lg:text-left"
        >
          <div className="pink-gradient-text mb-4 text-sm font-light tracking-wide uppercase">
            GET ECASH
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tighter text-white lg:text-6xl lg:leading-[60px]">
            Get eCash today
          </h1>

          <p>
            There are several ways to acquire eCash. From exchanges to mining
            and staking, find the perfect method for you.
          </p>
        </motion.div>
      </ContentContainer>
    </div>
  );
}
