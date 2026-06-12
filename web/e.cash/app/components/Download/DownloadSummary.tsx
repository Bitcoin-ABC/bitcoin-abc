// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import Image from "next/image";
import ContentContainer from "../Atoms/ContentContainer";

const NODE_RELEASES_URL = "https://www.bitcoinabc.org/releases/";
const CASHTAB_ANDROID_URL =
  "https://play.google.com/store/apps/details?id=com.cashtab.app";
const CASHTAB_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/cashtab/obldfcmebhllhjlhjbnghaipekcppeag";
const MARLIN_ANDROID_URL =
  "https://play.google.com/store/apps/details?id=com.marlinwallet.app";
const ELECTRUM_URL = "https://www.bitcoinabc.org/electrum/";

const sectionTitleClass =
  "mb-6 text-center text-2xl font-bold tracking-tight text-white md:text-left";

const cardClass =
  "group hover:border-accentLight/40 flex flex-col gap-5 rounded-2xl border border-white/15 bg-white/5 p-6 transition-all hover:bg-white/8 md:p-8";

function DownloadCardLink(props: {
  href: string;
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string;
  cta: string;
}) {
  const { href, imageSrc, imageAlt, title, description, cta } = props;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cardClass}
    >
      <div className="relative mx-auto h-20 w-20 shrink-0 md:mx-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-contain"
          sizes="80px"
        />
      </div>
      <div className="flex flex-1 flex-col text-center md:text-left">
        <h3 className="mb-2 text-xl font-bold text-white md:text-2xl">
          {title}
        </h3>
        <p className="text-secondaryText mb-4 flex-1 font-light">
          {description}
        </p>
        <span className="text-accentLight group-hover:text-accentLight inline-flex items-center justify-center gap-2 font-medium md:justify-start">
          {cta}
          <Image
            src="/arrow-up-right.png"
            alt=""
            width={16}
            height={16}
            className="opacity-90"
          />
        </span>
      </div>
    </a>
  );
}

export default function DownloadSummary() {
  return (
    <ContentContainer className="pb-24 lg:pb-32">
      <div className="mx-auto max-w-[900px] space-y-16 md:space-y-20">
        <section aria-labelledby="download-node-heading">
          <h2 id="download-node-heading" className={sectionTitleClass}>
            Node
          </h2>
          <DownloadCardLink
            href={NODE_RELEASES_URL}
            imageSrc="/chronik-m.png"
            imageAlt="eCash node software"
            title="eCash node software"
            description="Bitcoin ABC full node for Linux, macOS, and Windows — mine, stake, and stay in sync with the eCash network."
            cta="View releases"
          />
        </section>

        <section aria-labelledby="download-wallets-heading">
          <h2 id="download-wallets-heading" className={sectionTitleClass}>
            Wallets
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <DownloadCardLink
              href={CASHTAB_ANDROID_URL}
              imageSrc="/cashtab.png"
              imageAlt="Cashtab"
              title="Cashtab (Android)"
              description="Non-custodial eCash (XEC) wallet on Android — tokens, NFTs, and payments with mobile integrations."
              cta="Google Play"
            />
            <DownloadCardLink
              href={CASHTAB_EXTENSION_URL}
              imageSrc="/cashtab-extension.png"
              imageAlt="Cashtab Extension"
              title="Cashtab (Extension)"
              description="Browser wallet for Chrome and Brave — no account required. MetaMask-style flow for eCash."
              cta="Chrome Web Store"
            />
            <DownloadCardLink
              href={MARLIN_ANDROID_URL}
              imageSrc="/marlin-wallet.png"
              imageAlt="Marlin Wallet"
              title="Marlin (Android)"
              description="Simple eCash wallet for Android and Wear OS — QR, NFC, and Firma Alpha stablecoin support."
              cta="Google Play"
            />
            <DownloadCardLink
              href={ELECTRUM_URL}
              imageSrc="/electrum.png"
              imageAlt="Electrum ABC"
              title="Electrum ABC"
              description="Desktop wallet for Windows, macOS, and Linux — seeds, hardware wallets, and multi-sig."
              cta="Electrum ABC downloads"
            />
          </div>
        </section>
      </div>
    </ContentContainer>
  );
}
