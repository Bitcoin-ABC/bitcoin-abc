// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import ContentContainer from "../Atoms/ContentContainer";
import Image from "next/image";
import { cn } from "../../utils/cn";
import { motion, AnimatePresence } from "framer-motion";

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
    text: "Chronik is a high-speed, reliable indexer built into the node, giving developers easy, scalable access to all native eCash network features.",
  },
  {
    name: "Tokens",
    text: "eCash supports tokens that anyone can create in a few clicks. Instantly mint tokens or NFT collections and trade them within your wallet's integrated DEX.",
  },
  {
    name: "CashFusion",
    text: "Privacy is fundamental to sound money. CashFusion offers anonymity comparable to the top privacy coins while maintaining an auditable supply cap.",
  },
];

export default function PoweringPayments() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  type FeatureCardProps = {
    name: string;
    index: number;
    text: string;
    onHover: (index: number | null) => void;
  };

  const FeatureCard = ({ name, index, text, onHover }: FeatureCardProps) => {
    const isHovered = hoveredIndex === index;

    return (
      <div
        onMouseEnter={() => onHover(index)}
        onMouseLeave={() => onHover(null)}
        className="custom-box relative flex h-[160px] w-full max-w-[270px] cursor-pointer items-center rounded-xl bg-gradient-to-br from-[#0E0E21] to-[#19193B] p-8"
      >
        {/* Connection lines */}
        {isHovered && index === 2 && (
          <div className="absolute left-[270px] z-0 h-[3px] w-2/3 bg-[#a77ba8]" />
        )}
        {isHovered && index === 5 && (
          <div className="absolute right-[270px] z-0 h-[3px] w-2/3 bg-[#a77ba8]" />
        )}

        <div className="flex flex-col items-start">
          <span className="text-secondaryText text-sm">0{index}</span>
          <h4 className="text-lg leading-snug font-bold">{name}</h4>
        </div>

        <div className="absolute right-0 bottom-0 h-full w-[60%]">
          <Image
            src={`/${name.toLowerCase()}.png`}
            alt={name}
            fill
            className="object-contain object-bottom"
            sizes="60vw"
          />
        </div>

        <motion.div
          className="absolute inset-0 flex items-center rounded-xl bg-gradient-to-br from-[#130D3F] to-[#7316d1] p-4 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {text}
        </motion.div>
      </div>
    );
  };

  // Memoized scroll handler to prevent unnecessary re-renders
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const child = el.children[0] as HTMLElement;
    const cardWidth = child.offsetWidth + 16; // gap-4 = 1rem = 16px
    const index = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToIndex = useCallback((index: number) => {
    const el = containerRef.current;
    if (!el) return;

    const child = el.children[index] as HTMLElement;
    if (child) {
      child.scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest",
      });
    }
  }, []);

  return (
    <ContentContainer className="mb-30 max-w-[1400px]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        viewport={{ once: true, amount: 0.75 }}
        className="flex flex-col items-center justify-center lg:flex-row"
      >
        <div className="hidden grow basis-0 flex-col items-end justify-center gap-2 self-stretch lg:flex [&>*:nth-child(2)]:self-start">
          {eCashFeatures.slice(0, 3).map((feature, index) => (
            <FeatureCard
              key={index}
              index={index + 1}
              name={feature.name}
              text={feature.text}
              onHover={setHoveredIndex}
            />
          ))}
        </div>

        <div className="relative z-10 aspect-[550/721] w-full lg:h-[721px] lg:w-[550px] lg:shrink-0">
          <Image
            src="/powering-payments-bg.jpg"
            alt="Powering Internet-Scale Payments"
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 550px"
          />

          {/* Overlay image with smooth transitions */}

          {hoveredIndex !== null && (
            <div key={`overlay-${hoveredIndex}`} className="absolute inset-0">
              <Image
                src={`/overlay-${hoveredIndex}.png`}
                alt="Powering Internet-Scale Payments"
                fill
                className="hidden object-contain lg:inline-block"
                sizes="(max-width: 1024px) 0vw, 550px"
              />
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center">
            <div>
              <h2 className="max-w-[330px] text-center">
                Powering{" "}
                <span className="pink-gradient-text">Internet-Scale</span>{" "}
                Payments
              </h2>
            </div>
          </div>
        </div>

        <div className="hidden grow basis-0 flex-col items-start justify-center gap-2 self-stretch lg:flex [&>*:nth-child(2)]:self-end">
          {eCashFeatures.slice(3, 6).map((feature, index) => (
            <FeatureCard
              key={index}
              index={index + 4}
              name={feature.name}
              text={feature.text}
              onHover={setHoveredIndex}
            />
          ))}
        </div>
      </motion.div>

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
                sizes="50px"
              />
            </div>
            <span
              className={cn(
                "text-sm transition-opacity duration-200",
                activeIndex === index ? "opacity-100" : "opacity-40",
              )}
            >
              0{index + 1}
            </span>

            <div className="relative mt-2 aspect-square w-[15px]">
              <AnimatePresence>
                {activeIndex === index && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative h-full w-full"
                  >
                    <Image
                      src="/arrow-up.png"
                      alt="arrow"
                      fill
                      className="object-contain"
                      sizes="15px"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
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
              "w-[85%] shrink-0 snap-start transition-all duration-300 ease-out",
              activeIndex === index ? "opacity-100" : "opacity-40",
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
