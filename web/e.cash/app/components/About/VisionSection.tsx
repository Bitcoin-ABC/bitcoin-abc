// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import Button from "../Atoms/Button";
import { motion } from "motion/react";

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

            {/* Right Content Area - YouTube Video */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.3 }}
              viewport={{ once: true }}
              className="flex w-full flex-1 flex-col items-center justify-center gap-6 self-stretch"
            >
              <div
                className="relative w-full overflow-hidden rounded-2xl"
                style={{ paddingBottom: "56.25%" }}
              >
                <iframe
                  className="absolute left-0 top-0 h-full w-full"
                  src="https://www.youtube.com/embed/9mMMloxbwRg?si=-tjWTc3KsMRXe14q"
                  title="Why Crypto - Final Episode: Money"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <Button
                href="https://www.youtube.com/@eCashOfficial/videos"
                variant="ghost"
              >
                More Videos
              </Button>
            </motion.div>
          </div>
        </div>
      </ContentContainer>
    </div>
  );
}
