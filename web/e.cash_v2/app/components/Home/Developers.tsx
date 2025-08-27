// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import CodeSnippet from "../Atoms/CodeSnippet";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export const ScrollElement = () => {
  return (
    <div className="flex shrink-0 items-center">
      <div className="text-background mx-2 bg-gradient-to-br from-[#BBEBFD] to-[#F9B2EF] px-[6px] py-0 text-sm tracking-wide lg:mx-4 lg:px-2 lg:text-lg">
        API
      </div>
      <div className="pink-gradient-text mr-1 text-xs uppercase tracking-wide lg:mr-0 lg:text-base">
        Empowering Developers
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="ml-2 h-[14px] w-[1px] rotate-[45deg] bg-white lg:ml-4 lg:h-[20px]"
        />
      ))}
    </div>
  );
};

export default function Developers() {
  interface DevLinkProps {
    text: string;
    href: string;
  }

  const DevLink = ({ text, href }: DevLinkProps) => {
    return (
      <Link
        className="border-borderLight hover:text-accentLight lg:nth-[2]:border-t-0 flex flex-1 shrink-0 items-center justify-between border-b px-8 text-sm transition-all hover:bg-white/10 lg:border lg:border-l-0 lg:text-base"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>{text}</span>
        <div className="relative h-[12px] w-[12px] lg:h-[18px] lg:w-[18px]">
          <Image
            src="/arrow-up-right.png"
            alt="eCash Developers"
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 12px, 18px"
          />
        </div>
      </Link>
    );
  };

  const Lines = () => {
    return Array.from({ length: 80 }).map((_, i) => (
      <div
        key={i}
        className="bg-white/15 mb-[10px] mr-[2px] h-[1px] w-[15px] rotate-[45deg]"
      />
    ));
  };

  return (
    <div className="py-30 lg:pb-30 relative m-auto mt-[-160px] w-full max-w-[2000px] pb-20 pt-60">
      <div className="from-background absolute top-0 h-[100px] w-full bg-gradient-to-b to-transparent" />
      <div className="m-auto mb-10 flex w-full select-none items-center overflow-hidden lg:mb-20">
        <div className="srcoll-animation flex items-center gap-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <ScrollElement key={i} />
          ))}
        </div>
      </div>
      <div className="relative m-auto w-full lg:px-[35px]" id="developers">
        <ContentContainer className="relative max-w-[1400px]">
          <div className="absolute left-[-15px] top-[-5%] hidden h-[110%] w-[30px] flex-col items-center border-l border-white/10 lg:flex">
            <Lines />
          </div>
          <div className="absolute right-[-15px] top-[-5%] hidden h-[110%] w-[30px] flex-col items-center border-r border-white/10 lg:flex">
            <Lines />
          </div>
          <div className="flex w-full flex-col items-center overflow-hidden lg:flex-row">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              viewport={{ once: true, amount: 0.5 }}
              className="border-borderLight mb-10 flex w-full flex-col items-start justify-center gap-6 self-stretch lg:mb-0 lg:w-[40%] lg:border lg:border-b-0 lg:p-10"
            >
              <PlusHeader text="For Developers" />
              <h2>The ongoing development that powers our ecosystem</h2>
              <p>
                Fast WebSocket APIs, native libraries, and thorough
                documentation for high-throughput payment processing. Includes
                flexible hooks for custom implementations, backed by
                comprehensive test coverage and dedicated developer support.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              viewport={{ once: true, amount: 0.5 }}
              className="border-borderLight w-full lg:w-[60%] lg:border lg:border-b-0 lg:border-l-0"
            >
              <CodeSnippet />
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            viewport={{ once: true, amount: 0.5 }}
            className="flex w-full flex-col items-stretch lg:h-[230px] lg:flex-row"
          >
            <div className="border-borderLight hidden w-1/4 items-center justify-center lg:flex lg:border">
              <div className="relative h-[60%] w-full">
                <Image
                  src="/logo-hero.png"
                  alt="eCash"
                  fill
                  className="object-contain"
                  sizes="25vw"
                />
              </div>
            </div>
            <div className="flex h-[160px] w-full flex-col lg:h-auto lg:w-1/4">
              <DevLink
                text="ABC RELEASES"
                href="https://www.bitcoinabc.org/releases/"
              />
              <DevLink text="CASHTAB" href="https://cashtab.com/" />
            </div>
            <div className="flex h-[160px] w-full flex-col lg:h-auto lg:w-1/4">
              <DevLink text="CHRONIK INDEXER" href="https://chronik.cash/" />
              <DevLink
                text="LIBRARIES"
                href="https://github.com/Bitcoin-ABC/bitcoin-abc"
              />
            </div>
            <Link
              href="https://t.me/eCashBuilders"
              className="hover:text-accentLight border-borderLight flex w-full items-center justify-center gap-4 border border-t-0 py-10 transition-all hover:bg-white/10 lg:w-1/4 lg:flex-col lg:border lg:border-l-0 lg:py-0"
            >
              <div className="relative h-[50px] w-[50px] lg:h-[60px] lg:w-[60px]">
                <Image
                  src="/telegram.png"
                  alt="eCash Telegram"
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 50px, 60px"
                />
              </div>
              <span className="max-w-[200px] text-sm uppercase tracking-wide lg:text-center">
                ecash developer telegram group
              </span>
            </Link>
          </motion.div>
        </ContentContainer>
      </div>
    </div>
  );
}
