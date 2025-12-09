// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import Button from "../Atoms/Button";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export type GettingStartedLink = {
  text: string;
  href: string;
};

export type GettingStartedColumn = {
  title?: string;
  links: GettingStartedLink[];
};

const gettingStartedLinks: GettingStartedColumn[] = [
  {
    title: "For developers",
    links: [
      { text: "Phabricator", href: "https://reviews.bitcoinabc.org/" },
      {
        text: "GitHub Mirror",
        href: "https://github.com/Bitcoin-ABC/bitcoin-abc/",
      },
      { text: "Chronik Indexer", href: "https://chronik.cash/" },
      { text: "RPC Documentation", href: "https://www.bitcoinabc.org/doc/" },
      {
        text: "Contribution Guide",
        href: "https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/CONTRIBUTING.md",
      },
    ],
  },
  {
    title: "For users",
    links: [
      { text: "Get eCash", href: "/get-ecash" },
      { text: "XECx", href: "https://stakedxec.com/" },
      { text: "Firma", href: "https://firma.cash/" },
      { text: "PayButton", href: "https://paybutton.org/" },
      { text: "LocaleCash", href: "https://localecash.com/" },
      { text: "Block Explorer", href: "https://explorer.e.cash/" },
    ],
  },
  {
    title: "For observers",
    links: [
      { text: "Blog", href: "/blog" },
      { text: "Avalanche", href: "https://avalanche.cash" },
      { text: "Scorecard", href: "https://scorecard.cash" },
      { text: "X (Twitter)", href: "https://x.com/ecash" },
      { text: "Telegram", href: "https://t.me/ecash" },
      {
        text: "YouTube",
        href: "https://www.youtube.com/@eCashOfficial/featured",
      },
    ],
  },
  {
    title: "For businesses",
    links: [
      { text: "Email", href: "mailto:contact@e.cash" },
      { text: "Brand", href: "/brand" },
    ],
  },
];

export default function GettingStarted() {
  return (
    <ContentContainer className="text-background max-w-[1400px] bg-neutral-100 p-2 py-6 lg:rounded-4xl lg:p-20">
      <div className="flex h-full w-full flex-col items-center gap-2">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className="flex w-full flex-col items-center rounded-2xl bg-white px-10 pt-10"
        >
          <PlusHeader text="Getting started" inverse />
          <h3 className="mt-4 max-w-[450px] text-center text-4xl leading-none font-bold lg:text-6xl">
            Built different
          </h3>
          <div className="mt-4 max-w-xl text-center text-base font-light text-[#4C4C4C] lg:text-lg">
            We’ve made it a snap to send value, create tokens, develop apps, or
            explore the blockchain. You’re welcome to try it out.
          </div>
          <Button className="mt-6" href="https://cashtab.com">
            Create your wallet
          </Button>
          <div className="relative mt-10 h-[140px] w-full lg:h-[260px]">
            <Image
              src="/wallet.png"
              alt="Wallet"
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 100vw"
            />
          </div>
        </motion.div>

        <div className="flex w-full flex-col items-stretch gap-2 lg:h-[300px] lg:flex-row">
          {gettingStartedLinks.map((col: GettingStartedColumn, idx: number) => (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
                delay: idx * 0.1,
              }}
              viewport={{ once: true, amount: 0.7 }}
              key={idx}
              className="flex h-full w-full flex-col lg:w-1/4"
            >
              <div className="str flex w-full flex-1 flex-col rounded-2xl bg-white p-6">
                {col.title && (
                  <div className="mb-3 text-xl font-bold">{col.title}</div>
                )}
                {col.links.map((link: GettingStartedLink, lidx: number) => {
                  const isExternal = /^https?:\/\//.test(link.href);
                  return (
                    <Link
                      key={lidx}
                      href={link.href}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      className="hover:text-accentMedium group flex items-center justify-between py-1 text-lg font-light text-[#4C4C4C] transition"
                    >
                      <span>{link.text}</span>
                      <span className="relative ml-2 inline-block h-[14px] w-[14px]">
                        <Image
                          src="/arrow-dark.png"
                          alt="arrow"
                          fill
                          className="object-contain opacity-50 transition-all group-hover:opacity-100"
                          sizes="14px"
                        />
                      </span>
                    </Link>
                  );
                })}
              </div>
              {idx === gettingStartedLinks.length - 1 && (
                <div className="mt-2 flex w-full items-center justify-between gap-2 rounded-2xl bg-white p-6">
                  <span className="text-xl font-bold">Join the community</span>
                  <Button href="https://t.me/ecash" className="m-0">
                    Chat
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </ContentContainer>
  );
}
