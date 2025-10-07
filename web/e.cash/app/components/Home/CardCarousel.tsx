// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import Link from "next/link";
import ContentContainer from "../Atoms/ContentContainer";
import Image from "next/image";
import PlusHeader from "../Atoms/PlusHeader";
import { motion } from "framer-motion";

export default function CardCarousel() {
  type CardProps = {
    text: string;
    image: string;
    href: string;
  };
  const Card = ({ text, image, href }: CardProps) => {
    const isExternal = /^(https?:)?\/\//.test(href);
    return (
      <Link
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="bg-white/3 hover:from-white/2 flex w-full min-w-[250px] flex-col items-center self-stretch overflow-hidden rounded-lg border-t-2 border-t-white/10 p-8 transition-all hover:bg-gradient-to-tr hover:to-[#21173B]"
      >
        <div className="relative mb-10 aspect-[4/3] w-full">
          <Image
            src={image}
            alt={image}
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 33vw"
          />
        </div>

        <div className="flex w-full items-center justify-between">
          <div className="text-lg font-bold tracking-tight text-white lg:text-xl">
            {text}
          </div>
          <div className="relative ml-4 h-[20px] w-[20px]">
            <Image
              src="/arrow-up-right.png"
              alt="arrow"
              fill
              className="object-contain"
              sizes="20px"
            />
          </div>
        </div>
      </Link>
    );
  };
  return (
    <ContentContainer className="max-w-[1400px]">
      <div className="flex w-full flex-col rounded-2xl bg-[#070712] p-8 lg:p-14">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className="flex w-full max-w-[270px] flex-col items-start gap-6 lg:w-1/2 lg:max-w-[380px]"
        >
          <PlusHeader text="Build different" />
          <h2>
            Shape the future of{" "}
            <span className="gradient-text">digital cash</span>
          </h2>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className="scrollx-container mt-12 flex w-full snap-x snap-mandatory items-center gap-4 overflow-x-auto scroll-smooth lg:gap-8"
        >
          <Card
            text="Join the developer community"
            image="/developer-community.png"
            href="https://t.me/eCashBuilders"
          />
          <Card
            text="Follow the scaling Roadmap"
            image="/roadmap.png"
            href="/roadmap"
          />
          <Card
            text="Live transactions"
            image="/live-transactions.png"
            href="https://explorer.e.cash/"
          />
        </motion.div>
      </div>
    </ContentContainer>
  );
}
