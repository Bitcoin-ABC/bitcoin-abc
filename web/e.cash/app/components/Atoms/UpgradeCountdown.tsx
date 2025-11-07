// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const TARGET_DATE = "2025-11-15T12:00:00Z";
// 6 hours after the target date, we skip polling the API for blocks until upgrade
const SKIP_POLLING_GRACE_PERIOD_MS = 6 * 60 * 60 * 1000;

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function UpgradeCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [blocksUntilUpgrade, setBlocksUntilUpgrade] = useState<number | null>(
    null
  );
  const [isLive, setIsLive] = useState<boolean>(false);
  const apiUrl = "https://avalanche.cash/api/info/XEC";
  const preDateText = "Avalanche Pre-Consensus coming to mainnet!";
  const postDateText =
    "Upgrade complete! Avalanche Pre-Consensus now live on mainnet!";

  // Fetch blocks until upgrade from API
  const fetchBlocksUntilUpgrade = useCallback(async () => {
    const now = Date.now();
    const targetTime = new Date(TARGET_DATE).getTime();
    if (now - targetTime >= SKIP_POLLING_GRACE_PERIOD_MS) {
      setIsLive(true);
      return;
    }
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("API request failed");
      }
      const data = await response.json();
      const blocks = data.blocksUntilUpgrade;

      if (blocks !== null && blocks !== undefined) {
        if (blocks < 0) {
          setIsLive(true);
        } else {
          setBlocksUntilUpgrade(blocks);
        }
      } else {
        // If blocksUntilUpgrade is null, we might still be before the timestamp
        // Don't treat this as an error, just don't update the state
      }
    } catch (error) {
      console.error("Error fetching blocks until upgrade:", error);
      setIsLive(true);
    }
  }, [apiUrl]);

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft | null => {
      const now = new Date().getTime();
      const target = new Date(TARGET_DATE).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsExpired(true);
        const elapsedSinceTarget = now - target;
        if (elapsedSinceTarget >= SKIP_POLLING_GRACE_PERIOD_MS) {
          setIsLive(true);
        }
        return null;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds };
    };

    // Calculate initial time
    const initialTimeLeft = calculateTimeLeft();
    setTimeLeft(initialTimeLeft);

    // Update every second
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  // Poll API for blocks until upgrade after timestamp is reached
  useEffect(() => {
    if (isExpired && !isLive) {
      const now = Date.now();
      const targetTime = new Date(TARGET_DATE).getTime();
      if (now - targetTime >= SKIP_POLLING_GRACE_PERIOD_MS) {
        setIsLive(true);
        return undefined;
      }
      // Fetch immediately when timestamp is reached
      fetchBlocksUntilUpgrade();

      // Then poll every 10 seconds (10000 ms)
      const pollingInterval = setInterval(() => {
        fetchBlocksUntilUpgrade();
      }, 10000); // 10 seconds

      return () => clearInterval(pollingInterval);
    }
  }, [isExpired, isLive, fetchBlocksUntilUpgrade]);

  const formatTime = (value: number): string => {
    return value.toString().padStart(2, "0");
  };

  return (
    <Link
      href={isExpired ? "/upgrade" : "/blog/preconsensus-pr"}
      target="_blank"
      rel="noopener noreferrer"
      className="from-accentDark to-accentLight hover:from-accentLight hover:to-accentDark flex h-[40px] w-full items-center justify-center bg-gradient-to-tl px-4 text-center text-xs font-medium leading-none transition-all duration-300 sm:h-[30px] lg:text-sm"
    >
      {isLive ? (
        postDateText
      ) : isExpired && blocksUntilUpgrade !== null ? (
        <div>
          {blocksUntilUpgrade} block{blocksUntilUpgrade !== 1 ? "s" : ""} until
          Avalanche Pre-consensus is live!
        </div>
      ) : isExpired ? (
        // Waiting for API response
        <div>Waiting for block information...</div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-[4px] sm:flex-row lg:gap-2">
          <span>{preDateText}</span>
          {timeLeft && (
            <div className="flex items-center gap-1 font-mono text-[10px] lg:text-xs">
              <span className="rounded bg-white/20 px-1.5 py-0.5">
                {formatTime(timeLeft.days)}d
              </span>
              <span className="rounded bg-white/20 px-1.5 py-0.5">
                {formatTime(timeLeft.hours)}h
              </span>
              <span className="rounded bg-white/20 px-1.5 py-0.5">
                {formatTime(timeLeft.minutes)}m
              </span>
              <span className="rounded bg-white/20 px-1.5 py-0.5">
                {formatTime(timeLeft.seconds)}s
              </span>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
