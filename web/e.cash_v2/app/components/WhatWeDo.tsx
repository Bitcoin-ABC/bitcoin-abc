// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import ContentContainer from "./ContentContainer";
import Image from "next/image";
import PlusHeader from "./PlusHeader";

export default function WhatWeDo() {
  type CardProps = {
    text: string;
    image: string;
  };
  const Card = ({ text, image }: CardProps) => {
    return (
      <div className="flex w-full items-center self-stretch overflow-hidden rounded-lg border border-white/10 lg:flex-col">
        <div className="to-background from-background w-1/3 bg-gradient-to-br via-[#101026] p-4 lg:w-full lg:p-10">
          <div className="relative h-[80px] w-full lg:h-[160px]">
            <Image src={image} alt={image} fill className="object-contain" />
          </div>
        </div>
        <div className="border-t-white/14 w-2/3 p-6 lg:w-full lg:border-t">
          <div className="text-lg font-bold tracking-tight text-white lg:text-xl">
            {text}
          </div>
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
        />
      </div>
      <div className="relative z-10 flex w-full flex-col gap-10 py-14 lg:flex-row lg:items-center lg:justify-between">
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
          />
          <Card
            text="With The Internet's Native Currency"
            image="/vision.png"
          />
        </div>
      </div>
    </ContentContainer>
  );
}
