// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import PlusHeader from "../Atoms/PlusHeader";
import Button from "../Atoms/Button";
import ContentContainer from "../Atoms/ContentContainer";
import Image from "next/image";
import { motion } from "motion/react";

export default function AboutSection() {
  return (
    <div className="py-10 lg:py-16">
      <ContentContainer className="lg:mb-30 mb-24 max-w-[600px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut", delay: 0.3 }}
          viewport={{ once: true }}
        >
          <PlusHeader text="XEC" />

          <h2 className="mb-4 mt-4 text-4xl font-bold text-white lg:text-5xl">
            Cash... Optimized
          </h2>

          <div className="mb-12">
            <p>
              eCash integrates the revolutionary Avalanche protocol with its
              core Nakamoto Proof-of-Work. This hybrid-consensus enables
              unmatched capacity, speed, and security that pushes crypto
              technology forward and makes it a viable alternative to legacy
              finance and looming CBDCs.
              <br />
              <br />
              The eCash network is at the forefront of Layer 1 blockchain
              technology, delivering on the promise that set off this entire new
              crypto-industry: A censorship-resistant electronic cash system at
              mass scale.
              <br />
              <br />
              This alternative Bitcoin implementation outshines crypto and
              legacy finance alike with record-breaking throughput capacity,
              lowest fees in the space, instant transaction finality, and
              bullet-proof security guarantees. No other network can match its
              feature-set and properties.
            </p>
          </div>

          <div className="flex justify-start gap-4">
            <Button href="/roadmap" variant="white" className="m-0">
              Roadmap
            </Button>
            <Button href="/tech" variant="outline" className="m-0">
              Tech
            </Button>
          </div>
        </motion.div>
      </ContentContainer>
      <ContentContainer>
        {/* Quote Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className="rounded-4xl flex items-center justify-center overflow-hidden bg-gradient-to-l from-[#0D0F37] via-[#50059A] to-[#0D0F37] p-8 shadow-[inset_0px_2px_5px_0px_#50059A,inset_0px_1px_33px_0px_rgba(111,123,232,0.40)] lg:p-24"
        >
          <div className="flex max-w-[850px] flex-col items-start justify-start gap-8">
            <blockquote className="text-2xl font-bold text-white lg:text-4xl">
              “I think that the internet is going to be one of the major forces
              for reducing the role of government. The one thing that's missing,
              but that will soon be developed, is a reliable e-cash.”
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full">
                <Image
                  src="/milton-friedman.png"
                  alt="Milton Friedman"
                  fill
                  className="object-contain"
                  sizes="48px"
                />
              </div>
              <div className="flex flex-col items-start justify-start">
                <span className="text-sm font-medium">Milton Friedman</span>
                <span className="text-secondaryText text-sm font-light">
                  Nobel Prize Economist
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </ContentContainer>
    </div>
  );
}
