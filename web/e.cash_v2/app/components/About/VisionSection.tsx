// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import { motion } from "motion/react";
import Image from "next/image";

export default function VisionSection() {
  return (
    <div className="lg:py-26 py-10">
      <ContentContainer>
        <div>
          <div className="flex flex-col items-start gap-12 lg:flex-row">
            {/* Left Content Area - Text */}
            <motion.div
              className="flex-1 space-y-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              viewport={{ once: true, amount: 0.5 }}
            >
              <PlusHeader text="Our vision" />

              <h2 className="text-2xl font-bold leading-tight text-white lg:text-4xl">
                The road to 1 billion daily transactions
              </h2>

              <h3 className="my-4 text-xl font-bold lg:my-8 lg:text-3xl">
                Powering the internet economy of tomorrow as a truly scalable
                payments network.
              </h3>
              <p>
                The goal of eCash is to create sound money that is usable by
                everyone in the world. We see cryptocurrency as a
                civilization-changing technology which can dramatically increase
                human flourishing, freedom, and prosperity. Trustless digital
                cash at mankind scale is an ambitious goal, but eCash has the
                capabilities to achieve it.
              </p>
            </motion.div>

            {/* Right Content Area - 3D Graphic */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.3 }}
              viewport={{ once: true }}
              className="custom-box relative flex h-[400px] min-h-[400px] w-full flex-1 items-center justify-center rounded-2xl bg-white/5 lg:h-[500px] lg:min-h-[500px]"
            >
              <div className="relative flex h-[200px] w-[200px] items-center justify-center lg:h-[300px] lg:w-[300px]">
                <Image
                  src="/spline-preview.png"
                  alt="eCash"
                  fill
                  className="object-contain"
                  sizes="200px lg:300px"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </ContentContainer>
    </div>
  );
}
