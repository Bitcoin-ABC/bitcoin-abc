// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import ContentContainer from "../Atoms/ContentContainer";
import { motion } from "framer-motion";

export default function DigitalPaymentLandscape() {
  const Chart = () => {
    return (
      <div className="custom-skew relative flex aspect-[120/70] w-full">
        <div className="font-fira-code mr-2 flex h-full shrink-0 flex-col justify-between pb-[14%] pt-4 text-[9px] font-light leading-none tracking-wider lg:text-xs">
          <label>3.0</label>
          <label>2.0</label>
          <label>1.0</label>
        </div>
        <div className="font-fira-code absolute left-[-5px] top-1/2 rotate-[-90deg] text-[8px] font-light uppercase leading-none tracking-widest lg:text-[9px]">
          TRANSACTIONS (BN)
        </div>
        <div className="font-fira-code absolute bottom-[-20px] right-0 flex w-[calc(100%-44px)] items-center justify-between text-[9px] font-light leading-none tracking-wider lg:bottom-[-30px] lg:text-xs">
          <label>2018</label>
          <label>2023</label>
          <label>2028</label>
        </div>
        <div className="relative h-full w-full">
          <svg
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="blueGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#572DE0" />
                <stop offset="100%" stopColor="#392077" />
              </linearGradient>

              <linearGradient
                id="fadeGraphLine"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="60%" stopColor="white" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>

              <linearGradient
                id="fadeXAxis"
                x1="0"
                y1="100"
                x2="100"
                y2="100"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="80%" stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>

              <linearGradient
                id="fadeYAxis"
                x1="0"
                y1="100"
                x2="0"
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="90%" stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>

              <radialGradient id="circleGradient" cx="50%" cy="40%" r="50%">
                <stop offset="50%" stopColor="white" />
                <stop offset="100%" stopColor="#cecece" />
              </radialGradient>

              <filter
                id="dropShadow"
                x="-10%"
                y="-10%"
                width="120%"
                height="120%"
              >
                <feDropShadow
                  dx="0.5"
                  dy="0.5"
                  stdDeviation="0.5"
                  floodColor="black"
                  floodOpacity="0.4"
                />
              </filter>
            </defs>

            <path
              d="M 68.97 0 L 68.97 100"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="0.2"
              strokeDasharray="4 3"
              fill="none"
            />

            <path
              d="M 0.00 84.00 L 3.45 84.08 L 6.90 83.55 L 10.34 82.50 L 13.79 81.01 L 17.24 79.15 L 20.69 76.99 L 24.14 74.62 L 27.59 72.10 L 31.03 69.53 L 34.48 66.96 L 37.93 64.48 L 41.38 62.17 L 44.83 60.10 L 48.28 58.30 L 51.72 56.64 L 55.17 54.91 L 58.62 52.94 L 62.07 50.69 L 65.52 48.13 L 68.97 45.23"
              stroke="url(#blueGradient)"
              fill="none"
              strokeWidth="1"
              filter="url(#dropShadow)"
            />

            <path
              d="M 68.97 45.23 L 72.41 41.97 L 75.86 38.33 L 79.31 34.28 L 82.76 29.79 L 86.21 24.85 L 89.66 19.42 L 93.10 13.49 L 96.55 7.02 L 100.00 0.00"
              stroke="url(#fadeGraphLine)"
              fill="none"
              strokeWidth="0.75"
              filter="url(#dropShadow)"
            />

            <path
              d="M 0 0 L 0 100"
              stroke="url(#fadeYAxis)"
              strokeWidth="0.4"
            />
            <path
              d="M 0 100 L 100 100"
              stroke="url(#fadeXAxis)"
              strokeWidth="1"
            />

            <ellipse
              cx="68.97"
              cy="45.23"
              rx="3"
              ry="4.7"
              fill="url(#circleGradient)"
              filter="url(#dropShadow)"
            />
          </svg>
          <svg
            viewBox="0 0 100 100"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
            preserveAspectRatio="xMidYMid meet"
          >
            <image href="/today.png" x="61" y="22" width="20" height="20" />
          </svg>
        </div>
      </div>
    );
  };
  return (
    <ContentContainer className="my-20 mb-0 mt-10 px-0 lg:mt-20 lg:px-4">
      <div className="custom-box from-white/1 to-white/1 py-15 lg:py-22 flex flex-col items-center rounded-lg border border-white/10 bg-gradient-to-br via-[#15172A] px-6 lg:flex-row lg:gap-6 lg:px-20 lg:pb-20 lg:pr-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.75 }}
          className="order-3 flex w-full flex-col gap-4 self-stretch lg:order-1 lg:w-1/2"
        >
          <h2>
            The digital payment landscape is on the verge of explosive growth.
          </h2>
          <p>
            If current trends continue, we will reach 100 billion daily
            transactions — a scale that would overwhelm today's payment
            infrastructure.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.7 }}
          className="perspective-container text-secondaryText relative order-1 flex w-full items-center gap-4 pb-10 lg:order-2 lg:w-1/2 lg:justify-end lg:pb-12"
        >
          <div className="font-fira-code absolute left-1/2 top-[-10px] ml-5 w-full -translate-x-1/2 text-center text-[8px] font-light uppercase leading-none tracking-widest lg:top-0 lg:w-[calc(100%-34px)] lg:text-xs">
            Number of non-cash payments
          </div>
          <Chart />
        </motion.div>
        <a
          href="https://www.capgemini.com/wp-content/uploads/2024/09/WPR_2025_web.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="font-fira-code text-secondaryText hover:text-accentLight bottom-[30px] right-[30px] order-2 mb-10 text-[8px] lg:absolute lg:mb-0 lg:text-[10px]"
        >
          SOURCE: CAPGEMINI RESEARCH INSTITUTE
        </a>
      </div>
    </ContentContainer>
  );
}
