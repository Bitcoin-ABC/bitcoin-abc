// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import Image from "next/image";
import Link from "next/link";
import GridPattern from "./components/GridPattern";
import ContentContainer from "./components/ContentContainer";
import TrustedBy from "./components/TrustedBy";
import WhatWeDo from "./components/WhatWeDo";
import DigitalPaymentLandscape from "./components/DigitalPaymentLandscape";

export default function Home() {
  type HeroBoxProps = {
    title: string;
    text: string;
    href: string;
  };
  const HeroBox = ({ title, text, href }: HeroBoxProps) => {
    return (
      <Link
        className="_blur border-white/14 hover:bg-white/8 lg:bg-white/2 lg:p-15 group relative w-full border bg-white/5 p-5 last:border-t-0 lg:py-20"
        href={href}
      >
        <div className="absolute left-[-2px] top-0 h-full w-[1px] bg-black" />
        <div className="group-hover:text-background relative mb-4 inline-flex items-center justify-center gap-2 overflow-hidden bg-white/10 p-2 py-1 pr-4 text-sm font-light uppercase transition group-hover:bg-white">
          {title}
          <div className="group-hover:border-t-accentMedium absolute right-0 top-0 h-0 w-0 border-l-[10px] border-t-[10px] border-l-transparent border-t-white transition" />
        </div>
        <div className="flex items-end gap-4">
          <p>{text}</p>
          <div className="relative h-4 w-4 shrink-0">
            <Image
              src="/arrow-up-right.png"
              alt="arrow"
              fill
              className="object-contain"
            />
          </div>
        </div>
      </Link>
    );
  };
  return (
    <main>
      <div className="relative w-full py-10 pt-20 lg:pt-12">
        <ContentContainer>
          <div className="flex flex-col items-center lg:flex-row">
            <div className="relative z-10 flex w-full flex-col items-start justify-center self-stretch lg:w-[55%]">
              <div className="mask-gradient-fade-to-left bg-white/14 absolute top-20 hidden h-[1px] w-full lg:block" />
              <div className="mask-gradient-fade-to-left top-19.75 absolute hidden h-[1px] w-full bg-black lg:block" />
              <div className="mask-gradient-fade-to-left bg-white/14 absolute bottom-20 hidden h-[1px] w-full lg:block" />
              <div className="mask-gradient-fade-to-left bottom-20.25 absolute hidden h-[1px] w-full bg-black lg:block" />
              <h1 className="mb-2 w-auto text-5xl font-bold tracking-tighter lg:mb-6 lg:w-96 lg:text-6xl lg:leading-[60px]">
                Cash for the Internet
              </h1>
              <p className="lg:w-70 text-lg">
                Scalable payments to meet the{" "}
                <span className="text-primaryText">demands of tomorrow.</span>
              </p>
            </div>
            <div className="relative z-20 mt-6 h-[220px] w-[220px] lg:hidden">
              <div className="absolute bottom-[-100px] left-1/2 z-0 h-[125px] w-[312px] -translate-x-1/2">
                <Image
                  src="/shadow.png"
                  alt="eCash"
                  fill
                  className="object-contain"
                />
              </div>
              <Image
                src="/logo-hero.png"
                alt="eCash"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative z-20 mt-8 flex w-full flex-col items-end lg:my-20 lg:w-[45%]">
              <div className="absolute right-0 top-[-2px] h-[2px] w-full bg-black" />

              <HeroBox
                title="NAKAMOTO"
                href="https://avalance.cash"
                text="The trusted Bitcoin Proof-of-Work consensus forms the foundation
              of the eCash protocol."
              />
              <HeroBox
                title="AVALANCHE"
                href="https://avalance.cash"
                text="A breakthrough consensus protocol integrated with eCash's core technology."
              />
            </div>
          </div>
        </ContentContainer>
        <GridPattern className="left-1/2 top-16 z-10 -translate-x-[calc(50%+100px)]" />
        <GridPattern className="mask-gradient-fade-135 bottom-0 right-20 z-30 hidden lg:inline-flex" />
        <div className="absolute left-0 top-0 z-0 hidden h-[800px] w-[533px] lg:block">
          <Image
            src="/tl-blur.jpg"
            alt="eCash"
            fill
            className="object-contain"
          />
        </div>
        <div className="absolute right-0 top-0 z-0 h-[800px] w-[600px]">
          <Image
            src="/tr-blur.jpg"
            alt="eCash"
            fill
            className="object-contain"
          />
        </div>
        <div className="absolute left-1/2 top-1/2 z-0 hidden h-[445px] w-[500px] -translate-x-[calc(50%+60px)] -translate-y-[calc(50%-150px)] lg:block">
          <Image
            src="/center-blur.jpg"
            alt="eCash"
            fill
            className="object-contain"
          />
        </div>
        <div className="absolute left-1/2 top-1/2 z-10 hidden h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 lg:block">
          <div className="absolute bottom-[-100px] left-1/2 z-0 h-[125px] w-[312px] -translate-x-1/2">
            <Image
              src="/shadow.png"
              alt="eCash"
              fill
              className="object-contain"
            />
          </div>
          <Image
            src="/logo-hero.png"
            alt="eCash"
            fill
            className="object-contain"
          />
        </div>
      </div>
      <TrustedBy />
      <WhatWeDo />
      <DigitalPaymentLandscape />
    </main>
  );
}
