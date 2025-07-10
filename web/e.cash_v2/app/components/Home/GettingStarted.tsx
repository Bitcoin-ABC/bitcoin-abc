// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import Button from "../Atoms/Button";
import Image from "next/image";
import Link from "next/link";

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
      {
        text: "Contributing",
        href: "https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/CONTRIBUTING.md",
      },
      { text: "Documentation", href: "https://www.bitcoinabc.org/doc/" },
      { text: "Github", href: "https://github.com/Bitcoin-ABC/bitcoin-abc/" },
    ],
  },
  {
    title: "For users",
    links: [
      { text: "Get XEC", href: "/get-xec" },
      {
        text: "XECx",
        href: "https://cashtab.com/#/token/c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4",
      },
      {
        text: "Firma",
        href: "https://cashtab.com/#/token/0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0",
      },
      { text: "PayButton", href: "https://paybutton.org/" },

      { text: "eLPS", href: "https://elpstoken.com/" },
      { text: "LocaleCash", href: "https://localecash.com/" },
    ],
  },
  {
    title: "For observers",
    links: [
      { text: "Blog", href: "/blog" },
      { text: "X (Twitter)", href: "https://x.com/ecash" },
      { text: "Telegram", href: "https://t.me/ecash" },
    ],
  },
  {
    title: "For businesses",
    links: [
      { text: "TixTown", href: "https://www.tixtown.com/" },
      { text: "PayButton", href: "https://paybutton.org/" },
    ],
  },
];

export default function GettingStarted() {
  return (
    <ContentContainer className="text-background lg:rounded-4xl max-w-[1400px] bg-neutral-100 p-2 py-6 lg:p-20">
      <div className="flex h-full w-full flex-col items-center gap-2">
        <div className="flex w-full flex-col items-center rounded-2xl bg-white px-10 pt-10">
          <PlusHeader text="Getting started" inverse />
          <h3 className="mt-4 max-w-[450px] text-center text-4xl font-bold leading-none lg:text-6xl">
            The wallet that’s different
          </h3>
          <div className="mt-4 max-w-xl text-center text-base font-light text-[#4C4C4C] lg:text-lg">
            We’ve made it a snap to send value, create your own eTokens, develop
            apps, or explore the blockchain.
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
            />
          </div>
        </div>

        <div className="flex w-full flex-col items-stretch gap-2 lg:h-[300px] lg:flex-row">
          {gettingStartedLinks.map((col: GettingStartedColumn, idx: number) => (
            <div key={idx} className="flex h-full w-full flex-col lg:w-1/4">
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
                        />
                      </span>
                    </Link>
                  );
                })}
              </div>
              {idx === gettingStartedLinks.length - 1 && (
                <div className="mt-2 flex w-full items-center justify-between gap-2 rounded-2xl bg-white p-6">
                  <span className="text-xl font-bold">
                    Get in touch with eCash
                  </span>
                  <Button href="https://t.me/ecash" className="m-0">
                    Contact
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ContentContainer>
  );
}
