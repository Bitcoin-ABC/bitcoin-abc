// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import Image from "next/image";
import { cn } from "../../utils/cn";
import GridPattern from "../Atoms/GridPattern";
import { motion } from "framer-motion";

export default function BentoGrid() {
  type CardProps = {
    title: string;
    text: string;
    icon: string;
    image: string;
    children?: React.ReactNode;
    className?: string;
    imageStyles?: string;
    imagePosition?: string;
  };

  const Card = ({
    title,
    text,
    icon,
    image,
    children,
    className,
    imageStyles,
    imagePosition,
  }: CardProps) => {
    return (
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        viewport={{ once: true, amount: 0.5 }}
        className={cn(
          "from-white/1 to-white/1 relative w-full overflow-hidden rounded-2xl via-[#21173B] p-5 lg:p-8",
          className
        )}
      >
        <div className="relative z-30 flex w-full flex-col lg:max-w-[250px]">
          <div className="relative h-[50px] w-[50px] lg:h-[60px] lg:w-[60px]">
            <Image src={icon} alt={title} fill />
          </div>
          <h4 className="py-1 text-xl font-bold lg:text-2xl">{title}</h4>
          <p>{text}</p>
        </div>
        {children}
        <div className={cn(imageStyles)}>
          <Image
            src={image}
            alt={title}
            fill
            className={cn(imagePosition, "object-contain")}
          />
        </div>
      </motion.div>
    );
  };
  const cardHeight = "h-unset lg:h-[350px]";
  return (
    <ContentContainer className="mb-20 max-w-[1300px] lg:mb-40">
      <h2 className="m-auto max-w-[300px] text-center lg:max-w-[500px]">
        The faster, more efficient and developer-friendly payment network
      </h2>
      <div className="mt-20 flex w-full flex-col gap-2 overflow-hidden">
        <div
          className={cn(
            cardHeight,
            "flex w-full flex-col items-stretch gap-2 lg:flex-row"
          )}
        >
          <Card
            title="Hybrid Consensus"
            text="Trustless PoW with Avalanche security and speed"
            icon="/brain-icon.png"
            image="/galaxy.png"
            className="bg-gradient-to-bl pb-[250px] lg:w-2/3 lg:pb-0"
            imageStyles="absolute right-0 lg:right-[20px] bottom-0 lg:h-[90%] lg:w-[70%] w-full h-[230px]"
            imagePosition="object-bottom lg:object-bottom-right"
          />
          <Card
            title="Minimal Fees"
            text="Transactions for less than $0.001"
            icon="/coins-icon.png"
            image="/fees.png"
            className="bg-gradient-to-bl pb-[250px] lg:w-1/3 lg:pb-0"
            imageStyles="absolute left-0 lg:left-1/2 lg:-translate-x-1/2 bottom-5 lg:h-[80%] lg:w-[80%] w-full h-[230px]"
            imagePosition="object-bottom"
          >
            <GridPattern className="left-30 scale-70 top-[40%]" />
          </Card>
        </div>

        <div
          className={cn(
            cardHeight,
            "flex w-full flex-col items-stretch gap-2 lg:flex-row"
          )}
        >
          <Card
            title="Scaling to Billions"
            text="Building the foundation for global payment adoption"
            icon="/gauge-icon.png"
            image="/tps.png"
            className="bg-gradient-to-br pb-[250px] lg:w-1/2 lg:pb-0"
            imageStyles="absolute right-0 lg:right-8 lg:top-0 lg:h-full lg:w-[50%] w-full h-[180px] bottom-5"
            imagePosition="object-bottom lg:object-center"
          >
            <GridPattern className="scale-60 right-[-40px] top-0" />
            <GridPattern className="scale-60 right-[-40px] top-1/2" />
          </Card>
          <Card
            title="Fork-free Evolution"
            text="Seamless upgrades without disruption"
            icon="/fork-icon.png"
            image="/globe.png"
            className="bg-gradient-to-bl pb-[250px] lg:w-1/2 lg:pb-0"
            imageStyles="absolute right-0 bottom-0 h-[230px] lg:h-full w-full"
            imagePosition="object-bottom-right"
          />
        </div>

        <div
          className={cn(
            cardHeight,
            "flex w-full flex-col items-stretch gap-2 lg:flex-row"
          )}
        >
          <Card
            title="Developer First"
            text="Robust Infrastructure and tools. Built by developers, for developers."
            icon="/airdrop-icon.png"
            image="/blue-glow.png"
            className="lg:h-unset flex h-[350px] flex-col justify-between bg-gradient-to-bl lg:w-1/2"
            imageStyles="absolute left-0 left-0 bottom-0 h-[70%] w-full opacity-80"
            imagePosition="object-bottom-left"
          >
            <div className="z-30 mb-4 flex w-full items-center justify-between self-baseline border-b border-dashed border-white/50 pb-[17px]">
              <div>
                &gt;&nbsp;npm install{" "}
                <span className="font-bold">ecash-lib</span>
              </div>
            </div>
          </Card>
          <Card
            title="Enhanced Security"
            text="Trustless security guarantees for instant transaction finality"
            icon="/finger-print-icon.png"
            image="/shield.png"
            className="flex flex-col justify-between bg-gradient-to-br pb-[250px] lg:w-1/2 lg:pb-0"
            imageStyles="absolute right-0 bottom-0 h-[230px] lg:h-full w-full"
            imagePosition="object-bottom lg:object-right"
          />
        </div>
      </div>
    </ContentContainer>
  );
}
