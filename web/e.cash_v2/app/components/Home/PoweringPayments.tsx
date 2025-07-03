// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import { useRef, useState, useEffect } from "react";
import ContentContainer from "../Atoms/ContentContainer";
import Image from "next/image";
import { cn } from "../../utils/cn";

const eCashFeatures = [
  {
    name: "Avalanche",
    text: "Avalanche is a breakthrough consensus algorithm integrated with eCash's Proof-of-Work, enabling instant transaction finality, greater flexibility, and unmatched security.",
  },
  {
    name: "Staking",
    text: "Staking rewards incentivize running eCash Avalanche nodes to improve the security and performance of the network. Anyone can now earn while holding their XEC.",
  },
  {
    name: "Subnets",
    text: "Subnets enable customized networks such as EVM or Zero-Knowledge privacy. Build faster with permissionless subnets powered by eCash Avalanche technology.",
  },
  {
    name: "Chronik",
    text: "Chronik is an indexer integrated right into the node. This super fast, reliable and highly scalable indexing solution makes it easy for developers to bootstrap and leverage native support for all available features on the eCash network.",
  },
  {
    name: "Tokens",
    text: "eCash supports tokens that anyone can create in a few clicks. Instantly mint tokens or NFT collections and trade them within your wallet's integrated DEX.",
  },
  {
    name: "CashFusion",
    text: "Privacy is fundamental to sound money. This is why eCash supports the CashFusion protocol. CashFusion offers anonymity comparable to the top privacy coins while maintaining an auditable supply cap.",
  },
];

export default function PoweringPayments() {
  const [rawHoveredIndex, setRawHoveredIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [prevHoveredIndex, setPrevHoveredIndex] = useState<number | null>(null);
  const [fadeKey, setFadeKey] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  type FeatureCardProps = {
    name: string;
    index: number;
    onHover: (index: number | null) => void;
  };

  const FeatureCard = ({ name, index, onHover }: FeatureCardProps) => {
    return (
      <div
        onMouseEnter={() => onHover(index)}
        onMouseLeave={() => onHover(null)}
        className="custom-box relative flex h-[160px] w-full max-w-[270px] cursor-pointer items-center rounded-xl bg-gradient-to-br from-[#0E0E21] to-[#19193B] p-8 hover:from-[#130D3F] hover:to-[#7316d1]"
      >
        {index === 2 && hoveredIndex === 2 && (
          <div className="absolute left-[270px] z-0 h-[3px] w-2/3 bg-[#a77ba8]" />
        )}
        {index === 5 && hoveredIndex === 5 && (
          <div className="absolute right-[270px] z-0 h-[3px] w-2/3 bg-[#a77ba8]" />
        )}
        <div className="flex flex-col items-start">
          <span className="text-secondaryText text-sm">0{index}</span>
          <h4 className="text-lg font-bold leading-snug">{name}</h4>
        </div>
        <div className="absolute bottom-0 right-0 h-full w-[60%]">
          <Image
            src={`/${name.toLowerCase()}.png`}
            alt={name}
            fill
            className="object-contain object-bottom"
          />
        </div>
      </div>
    );
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const child = el.children[0] as HTMLElement;
      const cardWidth = child.offsetWidth + 16; // gap-4 = 1rem = 16px
      const index = Math.round(el.scrollLeft / cardWidth);
      setActiveIndex(index);
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (hoveredIndex !== prevHoveredIndex) {
      setFadeKey((prev) => prev + 1);
      setPrevHoveredIndex(hoveredIndex);
    }
  }, [hoveredIndex, prevHoveredIndex]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (rawHoveredIndex === null) {
      // Long delay when hovering off all tiles
      timeout = setTimeout(() => {
        setHoveredIndex(null);
      }, 500);
    } else {
      // Short delay between switching tiles
      timeout = setTimeout(() => {
        setHoveredIndex(rawHoveredIndex);
      }, 300);
    }

    return () => clearTimeout(timeout);
  }, [rawHoveredIndex]);

  const scrollToIndex = (index: number) => {
    const el = containerRef.current;
    if (!el) return;

    const child = el.children[index] as HTMLElement;
    if (child) {
      child.scrollIntoView({
        behavior: "smooth",
        inline: "start",
      });
    }
  };

  return (
    <ContentContainer className="mb-30 max-w-[1400px]">
      <div className="flex flex-col items-center justify-center lg:flex-row">
        <div className="hidden grow basis-0 flex-col items-end justify-center gap-2 self-stretch lg:flex [&>*:nth-child(2)]:self-start">
          {eCashFeatures.slice(0, 3).map((feature, index) => (
            <FeatureCard
              key={index}
              index={index + 1}
              name={feature.name}
              onHover={setRawHoveredIndex}
            />
          ))}
        </div>
        <div className="relative z-10 aspect-[550/721] w-full lg:h-[721px] lg:w-[550px] lg:shrink-0">
          <Image
            src="/powering-payments-bg.jpg"
            alt="Powering Internet-Scale Payments"
            fill
            className="object-contain"
          />
          {hoveredIndex !== null && (
            <Image
              key={hoveredIndex}
              src={`/overlay-${hoveredIndex}.png`}
              alt="Powering Internet-Scale Payments"
              fill
              className="hidden object-contain lg:inline-block"
            />
          )}

          <div className="absolute flex h-full w-full items-center justify-center overflow-hidden">
            <div
              key={fadeKey}
              className="animate-fade-in-up absolute inset-0 flex items-center justify-center opacity-0"
            >
              <div>
                {hoveredIndex !== null ? (
                  <p className="bg-background/70 max-w-[330px] rounded border border-white/10 p-6 text-center">
                    {eCashFeatures[hoveredIndex - 1]?.text}
                  </p>
                ) : (
                  <h2 className="max-w-[330px] text-center">
                    Powering{" "}
                    <span className="pink-gradient-text">Internet-Scale</span>{" "}
                    Payments
                  </h2>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="hidden grow basis-0 flex-col items-start justify-center gap-2 self-stretch lg:flex [&>*:nth-child(2)]:self-end">
          {eCashFeatures.slice(3, 6).map((feature, index) => (
            <FeatureCard
              key={index}
              index={index + 4}
              name={feature.name}
              onHover={setRawHoveredIndex}
            />
          ))}
        </div>
      </div>
      <div className="bg-background relative z-20 m-auto mt-[-50px] h-[20px] w-full max-w-[750px] rounded border border-b-0 border-x-[#211a36] border-t-[#211a36] lg:mt-0" />
      <div className="bg-background relative z-20 flex w-full items-center justify-between gap-4 px-2 lg:hidden">
        {eCashFeatures.map((feature, index) => (
          <div
            key={index}
            className="flex w-1/6 cursor-pointer flex-col items-center justify-center text-center"
            onClick={() => {
              setActiveIndex(index);
              scrollToIndex(index);
            }}
          >
            <div className="relative aspect-square w-full max-w-[50px]">
              <Image
                src={`/${feature.name.toLowerCase()}-m.png`}
                alt={feature.name}
                fill
                className="object-contain"
              />
            </div>
            <span
              className={cn(
                "text-sm",
                activeIndex === index ? "opacity-100" : "opacity-40"
              )}
            >
              0{index + 1}
            </span>

            <div className="relative mt-2 aspect-square w-[15px]">
              {activeIndex === index && (
                <Image
                  src="/arrow-up.png"
                  alt="arrow"
                  fill
                  className="object-contain"
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <div
        className="scrollx-container m-auto mt-3 flex w-[95%] snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 lg:hidden"
        ref={containerRef}
      >
        {eCashFeatures.map((feature, index) => (
          <div
            key={index}
            className={cn(
              "w-[85%] shrink-0 snap-start transition-opacity",
              activeIndex === index ? "opacity-100" : "opacity-40"
            )}
          >
            <h4 className="text-lg font-bold">{feature.name}</h4>
            <p>{feature.text}</p>
          </div>
        ))}
      </div>
    </ContentContainer>
  );
}
