// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import ContentContainer from "../Atoms/ContentContainer";
import Image from "next/image";
import PlusHeader from "../Atoms/PlusHeader";
import { motion } from "framer-motion";
import Button from "../Atoms/Button";
import { cn } from "../../utils/cn";

export default function WhatWeDo() {
  type CardProps = {
    text: string;
    image: string;
    href: string;
    buttonText: string;
    imageText: string;
  };
  const Card = ({ text, image, href, buttonText, imageText }: CardProps) => {
    return (
      <div className="relative flex w-full self-stretch overflow-hidden rounded-lg border border-white/10 lg:flex-col">
        <div className="to-background from-background relative flex w-1/3 items-center self-stretch bg-gradient-to-br via-[#101026] p-4 lg:w-full lg:p-10">
          <div className="relative h-[100px] w-full lg:h-[160px]">
            <Image
              src={image}
              alt={image}
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 33vw, 160px"
            />
            <div
              className={cn(
                "from-accentLight to-accentDark absolute left-1/2 top-0 ml-10 flex -translate-x-1/2 items-center rounded bg-gradient-to-b px-1 py-0.5 text-[10px] tracking-wider [text-shadow:_0px_-1px_0px_rgb(0_0_0_/_0.36)] lg:left-auto lg:translate-x-0 lg:px-2 lg:text-sm",
                imageText === "HOW" ? "lg:right-4" : "lg:right-0"
              )}
            >
              {imageText}
            </div>
          </div>
        </div>
        <div className="border-t-white/14 w-2/3 p-6 lg:w-full lg:border-t">
          <div className="mb-4 text-lg font-bold tracking-tight text-white lg:mb-6 lg:text-xl">
            {text}
          </div>
          <Button href={href} variant="outline">
            {buttonText}
          </Button>
        </div>
      </div>
    );
  };
  return (
    <ContentContainer>
      <div className="absolute left-20 top-40 z-0 hidden h-[800px] w-[533px] lg:block">
        <Image
          src="/long-blur.jpg"
          alt="eCash"
          fill
          className="-rotate-[36deg] object-contain"
          sizes="(max-width: 1024px) 0vw, 533px"
        />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        viewport={{ once: true, amount: 0.5 }}
        className="relative z-10 flex w-full flex-col gap-10 py-14 lg:flex-row lg:items-start lg:justify-between"
      >
        <div className="flex w-full max-w-[270px] flex-col items-start gap-6 lg:w-1/2 lg:max-w-[380px]">
          <PlusHeader text="What we do" />

          <h2>
            Building a public payments network{" "}
            <span className="gradient-text">at mass scale</span>
          </h2>
          <p>
            eCash provides the bandwidth for every economic transaction in the
            world, at any size.
          </p>
        </div>
        <div className="flex w-full flex-col items-start gap-2 lg:w-1/2 lg:flex-row">
          <Card
            text="The Road to 1 Billion Daily Transactions"
            image="/how.png"
            href="/roadmap"
            buttonText="Our Vision"
            imageText="HOW"
          />
          <Card
            text="With The Internet's Native Currency"
            image="/vision.png"
            href="/tech"
            buttonText="Our Tech"
            imageText="VISION"
          />
        </div>
      </motion.div>
    </ContentContainer>
  );
}
