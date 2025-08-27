// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React, { useState, useEffect } from "react";
import ContentContainer from "../Atoms/ContentContainer";
import Image from "next/image";
import Link from "next/link";
import GridPattern from "../Atoms/GridPattern";
import Spline from "@splinetool/react-spline";
import Button from "../Atoms/Button";
import { motion } from "motion/react";

// Hook to detect if screen width is 1024px or larger (desktop breakpoint)
// Needed to conditionally render the correct Spline scene
function useLargeScreen() {
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsLargeScreen(!!e.matches);
    onChange(mql);

    // Handle both modern and legacy browser APIs
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    } else {
      // Fallback for older browsers
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, []);
  return isLargeScreen;
}

export default function Hero() {
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
        </div>
      </Link>
    );
  };

  const [loading, setLoading] = useState(true);
  const isLargeScreen = useLargeScreen();

  return (
    <div className="relative w-full py-10 pt-20 lg:pt-12">
      <ContentContainer>
        <div className="flex flex-col items-center lg:flex-row">
          <div className="relative z-10 flex w-full flex-col items-start justify-center self-stretch lg:w-[55%]">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              className="mask-gradient-fade-to-left bg-white/14 absolute top-20 hidden h-[1px] w-full lg:block"
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              className="mask-gradient-fade-to-left top-19.75 absolute hidden h-[1px] w-full bg-black lg:block"
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              className="mask-gradient-fade-to-left bg-white/14 absolute bottom-20 hidden h-[1px] w-full lg:block"
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              className="mask-gradient-fade-to-left bottom-20.25 absolute hidden h-[1px] w-full bg-black lg:block"
            />
            {!isLargeScreen && (
              <div className="relative z-20 m-auto mb-6 h-[150px] w-full max-w-[150px] lg:hidden">
                {loading && (
                  <Image
                    src="/spline-preview.png"
                    alt="eCash"
                    fill
                    className="object-contain"
                  />
                )}

                <Spline
                  scene="/scene-mobile.splinecode"
                  onLoad={() => setLoading(false)}
                />
              </div>
            )}
            <motion.div
              className="relative z-50 m-auto text-center lg:m-0 lg:text-left"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h1 className="m-auto mb-2 w-auto max-w-[200px] text-center text-4xl font-bold tracking-tighter lg:m-0 lg:mb-6 lg:w-96 lg:max-w-none lg:text-left lg:text-6xl lg:leading-[60px]">
                Cash for the Internet
              </h1>
              <p className="lg:w-70 m-auto mb-10 max-w-[280px] text-center lg:m-0 lg:mb-6 lg:text-left">
                Scalable payments to meet the{" "}
                <span className="text-primaryText">demands of tomorrow.</span>
              </p>
              <Button href="#developers">Start Building</Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="relative z-20 mt-8 hidden w-full flex-col items-end lg:my-20 lg:flex lg:w-[45%]"
          >
            <div className="absolute right-0 top-[-2px] h-[2px] w-full bg-black" />

            <div className="_blur border-white/14 hover:bg-white/8 lg:bg-white/2 lg:p-15 group relative w-full border bg-white/5 p-5 last:border-t-0 lg:py-20">
              <div className="absolute left-[-2px] top-0 h-full w-[1px] bg-black" />
              <div className="group-hover:text-background relative mb-4 inline-flex items-center justify-center gap-2 overflow-hidden bg-white/10 p-2 py-1 pr-4 text-sm font-light uppercase transition group-hover:bg-white">
                NAKAMOTO
                <div className="group-hover:border-t-accentMedium absolute right-0 top-0 h-0 w-0 border-l-[10px] border-t-[10px] border-l-transparent border-t-white transition" />
              </div>
              <div className="flex items-end gap-4">
                <p>
                  The trusted Bitcoin Proof-of-Work consensus forms the
                  foundation of the eCash protocol.
                </p>
              </div>
            </div>
            <HeroBox
              title="AVALANCHE"
              href="/#avalanche"
              text="A breakthrough consensus protocol integrated with eCash's core technology."
            />
          </motion.div>
        </div>
      </ContentContainer>
      <GridPattern className="left-1/2 top-16 z-10 hidden -translate-x-[calc(50%+100px)] lg:inline-flex" />
      <GridPattern className="lg:mask-gradient-fade-135 bottom-[-100px] right-0 z-30 inline-flex origin-bottom-right scale-[0.7] lg:bottom-0 lg:right-20 lg:scale-100" />
      <div className="absolute left-0 top-0 z-0 hidden h-[800px] w-[533px] lg:block">
        <Image
          src="/tl-blur.jpg"
          alt="eCash"
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 0vw, 533px"
        />
      </div>
      <div className="absolute right-0 top-0 z-0 h-[800px] w-[600px]">
        <Image
          src="/tr-blur.jpg"
          alt="eCash"
          fill
          className="object-contain"
          sizes="600px"
        />
      </div>
      <div className="absolute left-1/2 top-1/2 z-0 hidden h-[445px] w-[500px] -translate-x-[calc(50%+60px)] -translate-y-[calc(50%-150px)] lg:block">
        <Image
          src="/center-blur.jpg"
          alt="eCash"
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 0vw, 500px"
        />
      </div>
      {isLargeScreen && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 z-10 hidden h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 lg:block"
        >
          <div className="absolute bottom-[-100px] left-1/2 z-0 h-[125px] w-[312px] -translate-x-1/2">
            <Image
              src="/shadow.png"
              alt="eCash"
              fill
              className="object-contain"
              sizes="312px"
            />
          </div>
          {loading && (
            <Image
              src="/spline-preview.png"
              alt="eCash"
              fill
              className="object-contain"
              sizes="400px"
            />
          )}
          <Spline scene="/scene.splinecode" onLoad={() => setLoading(false)} />
        </motion.div>
      )}
    </div>
  );
}
