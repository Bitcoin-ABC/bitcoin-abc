// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function UpgradeCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const targetDate = "2025-11-15T00:00:00Z";
  const preDateText = "Avalanche Pre-Consensus coming to mainnet!";
  const postDateText =
    "Upgrade complete! Avalanche Pre-Consensus now live on mainnet!";

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft | null => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsExpired(true);
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
      {isExpired ? (
        postDateText
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
