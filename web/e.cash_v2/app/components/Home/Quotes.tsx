// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import ContentContainer from "../Atoms/ContentContainer";
import { cn } from "@/app/utils/cn";
import { motion } from "framer-motion";

type Quote = {
  quote: string;
  name: string;
  title: string;
  image: string;
};

export const quotes: Quote[] = [
  {
    quote:
      "Of all the cryptocurrency nodes I have integrated into my pool, eCash has proven to be the most active and has the most dedicated team of maintainers.",
    name: "letsmineit",
    title: "Mining Pool Operator",
    image: "/lets-mine-it.png",
  },
  {
    quote:
      "Reading logs has never been so enjoyable. I wish more coin projects were as active to make pool admins' life easier.",
    name: "zpool",
    title: "Mining Pool Operator",
    image: "/zpool.png",
  },
  {
    quote:
      "We're proud to be the only shared RPC provider for eCash. From the very beginning, we believed in its vision, and the Avalanche upgrade only strengthened that belief.",
    name: "NOWNodes",
    title: "Mining Pool Operator",
    image: "/nownodes.png",
  },
];

export default function Quotes() {
  const [activeIndex, setActiveIndex] = useState<number>(2);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticScroll = useRef(false);

  // Helper to pause and schedule resume
  const handleUserInteraction = () => {
    setPaused(true);
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      setPaused(false);
    }, 5000); // 5 seconds of inactivity resumes autocycle
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const containerCenter = el.scrollLeft + el.clientWidth / 2;
      let closest = { idx: 0, dist: Infinity };

      Array.from(el.children).forEach((c, i) => {
        const child = c as HTMLElement;
        const childCenter = child.offsetLeft + child.offsetWidth / 2;
        const d = Math.abs(childCenter - containerCenter);
        if (d < closest.dist) closest = { idx: i, dist: d };
      });

      setActiveIndex(closest.idx);
      if (isProgrammaticScroll.current) {
        isProgrammaticScroll.current = false;
      } else {
        handleUserInteraction();
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    scrollToIndex(2);
  }, []);

  // Autocycle quotes every 4 seconds, unless paused
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % quotes.length;
        scrollToIndex(nextIndex);
        return nextIndex;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

  const scrollToIndex = (index: number) => {
    const el = containerRef.current;
    const child = el?.children[index] as HTMLElement;
    if (!el || !child) return;

    isProgrammaticScroll.current = true;

    // Calculate the target scroll position to center the child horizontally
    const containerWidth = el.clientWidth;
    const childLeft = child.offsetLeft;
    const childWidth = child.offsetWidth;
    const targetScrollLeft = childLeft - (containerWidth - childWidth) / 2;

    // Use scrollTo for horizontal-only scrolling
    el.scrollTo({
      left: targetScrollLeft,
      behavior: "smooth",
    });
  };

  return (
    <ContentContainer className="max-w-[1400px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        viewport={{ once: true, amount: 0.5 }}
        className="scrollx-container scrollx-fade py-15 lg:py-30 m-auto flex w-full snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[20vw] lg:gap-8 lg:px-[calc(50vw-325px)] xl:px-[325px]"
        ref={containerRef}
      >
        {quotes.map((quote, index) => (
          <div
            key={index}
            className={cn(
              "w-[60vw] max-w-[650px] flex-none snap-center transition-opacity lg:min-w-[85%]",
              activeIndex === index ? "opacity-100" : "opacity-40"
            )}
          >
            <div className="mb-5 text-xl font-bold text-white lg:mb-7 lg:text-2xl">
              “{quote.quote}"
            </div>
            <div className="flex items-center gap-3">
              <Image
                src={quote.image}
                alt={quote.name}
                width={35}
                height={35}
              />
              <div className="text-left">
                <div className="m-0 text-sm font-semibold leading-none">
                  {quote.name}
                </div>
                <div className="text-secondaryText text-sm font-light">
                  {quote.title}
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        viewport={{ once: true }}
        className="mt-2 flex justify-center gap-3 lg:mt-4"
      >
        {quotes.map((_, i) => {
          const isActive = activeIndex === i;
          return (
            <div
              key={i}
              onClick={() => {
                scrollToIndex(i);
                handleUserInteraction();
              }}
              className={cn(
                "h-2 w-2 cursor-pointer rounded-[10px] bg-white transition-all lg:h-[10px] lg:w-[10px]",
                isActive ? "opacity-100" : "opacity-30"
              )}
            />
          );
        })}
      </motion.div>
    </ContentContainer>
  );
}
