// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import ContentContainer from "../Atoms/ContentContainer";
import Image from "next/image";
import { motion } from "framer-motion";

const Logos = ["bithumb", "upbit", "binance", "coinex", "indodax"];

export default function TrustedBy() {
  return (
    <ContentContainer>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        className="relative m-auto w-full max-w-[300px] text-center text-sm font-light leading-none tracking-wider lg:max-w-none"
      >
        TRUSTED BY BUSINESSES THAT VALUE{" "}
        <span className="font-medium">SPEED</span>,{" "}
        <span className="font-medium">SECURITY</span> AND{" "}
        <span className="font-medium">SCALABILITY</span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
        className="logo-mask-gradient m-auto mb-20 mt-8 flex w-full select-none items-center overflow-hidden lg:max-w-[70%]"
      >
        <div className="srcoll-animation lg:gap-22 flex items-center gap-10">
          {[...Logos, ...Logos].map((item, index) => (
            <div
              key={index}
              className="relative flex h-[30px] w-[100px] shrink-0 items-center lg:h-[30px] lg:w-[130px]"
            >
              <Image
                src={`/${item}.png`}
                fill
                className="object-contain"
                alt={item}
                priority
                sizes="(max-width: 1024px) 100px, 130px"
              />
            </div>
          ))}
        </div>
      </motion.div>
    </ContentContainer>
  );
}
