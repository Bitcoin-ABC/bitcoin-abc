// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import Link from "next/link";
import Image from "next/image";
import { Tx } from "chronik-client";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useChronik } from "../../context/ChronikContext";

const MAX_TRANSACTIONS = 4;

/**
 * Helper function to calculate total amount from outputs
 */
function calculateAmount(tx: Tx): bigint {
  return tx.outputs.reduce((sum, output) => sum + output.sats, BigInt(0));
}

/**
 * Helper function to format time since sent
 */
function formatTimeSince(timeFirstSeen: number): string {
  if (!timeFirstSeen || timeFirstSeen === 0) {
    return "--";
  }
  const now = Math.floor(Date.now() / 1000);
  const secondsAgo = now - timeFirstSeen;

  if (secondsAgo < 60) {
    return `${secondsAgo}s ago`;
  }
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`;
  }
  const daysAgo = Math.floor(hoursAgo / 24);
  return `${daysAgo}d ago`;
}

/**
 * Helper function to format XEC amount (1 XEC = 100 satoshis)
 */
function formatAmount(sats: bigint): string {
  const xec = Number(sats) / 100;
  return `${xec.toLocaleString(undefined, { maximumFractionDigits: 2 })} XEC`;
}

/**
 * Animated ellipsis component that cycles through 1, 2, 3 dots
 */
function AnimatedEllipsis() {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return <span>{".".repeat(dots)}</span>;
}

export default function LiveCard() {
  const { mempool, isLoadingMempool } = useChronik();

  // Get the most recent MAX_TRANSACTIONS transactions
  const transactions = useMemo(() => {
    return mempool.slice(0, MAX_TRANSACTIONS);
  }, [mempool]);

  const isLoading = isLoadingMempool;
  return (
    <div className="flex w-full min-w-[250px] flex-col items-center self-stretch overflow-hidden rounded-lg border-t-2 border-t-white/10 bg-white/3 p-4 transition-all hover:bg-linear-to-tr hover:from-white/2 hover:to-[#21173B] xl:p-8">
      <div className="relative mb-10 w-full overflow-y-auto">
        {!isLoading && transactions.length > 0 ? (
          <div className="h-full w-full overflow-hidden">
            <div className="flex flex-col gap-1">
              {transactions.map((tx, index) => {
                const amount = calculateAmount(tx);
                const timeSince = formatTimeSince(tx.timeFirstSeen);
                return (
                  <motion.div
                    key={tx.txid}
                    initial={{ opacity: 0, y: -200 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 1,
                      delay: index * 0.05,
                      ease: "easeOut",
                    }}
                    layout
                  >
                    <Link
                      href={`https://explorer.e.cash/tx/${tx.txid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg bg-white/5 p-2 hover:bg-white/10 lg:p-3"
                    >
                      <div className="flex flex-col gap-1 lg:gap-2 xl:flex-row xl:items-center xl:justify-between">
                        <div className="font-mono text-xs text-white/90">
                          {tx.txid.slice(0, 4)}...{tx.txid.slice(-6)}
                        </div>
                        <div className="flex flex-row-reverse justify-between xl:flex-col xl:items-end">
                          <span className="text-xs font-semibold text-white xl:text-sm">
                            {formatAmount(amount)}
                          </span>
                          <span className="text-xs text-white/50">
                            {timeSince}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="font-mono text-sm">
            <span>Listening for transactions</span>
            <AnimatedEllipsis />
          </div>
        )}
      </div>

      <Link
        href="https://explorer.e.cash/mempool"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex w-full flex-col gap-2"
      >
        <div className="flex w-full items-center justify-between">
          <div className="group-hover:text-accentMedium flex items-center gap-2 text-lg font-bold tracking-tight text-white transition-all group-hover:underline lg:text-xl">
            <div
              className={`h-2 w-2 rounded-full ${
                isLoading
                  ? "animate-pulse bg-white/40"
                  : "animate-pulse bg-green-500"
              }`}
            />
            Live Transactions
          </div>
          <div className="relative ml-4 h-[20px] w-[20px]">
            <Image
              src="/arrow-up-right.png"
              alt="arrow"
              fill
              className="object-contain"
              sizes="20px"
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
