// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import { useState } from "react";
import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import { motion } from "motion/react";
import Image from "next/image";
import Spline from "@splinetool/react-spline";

export default function VisionSection() {
  const [loading, setLoading] = useState(true);
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
              <PlusHeader text="Our Vision" />

              <h2 className="text-2xl font-bold leading-tight text-white lg:text-4xl">
                The Road to 1 Billion Daily Transactions
              </h2>

              <h3 className="my-4 text-xl font-bold lg:my-8 lg:text-3xl">
                Powering the internet economy of tomorrow, we are a truly
                scalable digital payment network for everyone.
              </h3>

              <p>
                The digital payment landscape is on the verge of explosive
                growth. If current trends continue, we could reach 100 billion
                daily transactions — a scale that would cripple today's payment
                infrastructure.
              </p>
            </motion.div>

            {/* Right Content Area - 3D Graphic */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.3 }}
              viewport={{ once: true, amount: 0.5 }}
              className="custom-box relative flex h-[700px] w-full flex-1 items-center justify-center rounded-2xl bg-white/5"
            >
              <div className="relative flex h-[300px] w-[300px] items-center justify-center">
                {loading && (
                  <Image
                    src="/spline-preview.png"
                    alt="eCash"
                    fill
                    className="object-contain"
                  />
                )}
                <div className="block lg:hidden">
                  <Spline
                    scene="/scene-mobile.splinecode"
                    onLoad={() => setLoading(false)}
                  />
                </div>
                <div className="hidden lg:block">
                  <Spline
                    scene="/logo300p.splinecode"
                    onLoad={() => setLoading(false)}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </ContentContainer>
    </div>
  );
}
