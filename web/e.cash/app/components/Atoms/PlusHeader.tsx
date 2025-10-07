// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import Image from "next/image";
import { cn } from "../../utils/cn";

interface PlusHeaderProps {
  text: string;
  inverse?: boolean;
}

export default function PlusHeader({ text, inverse = false }: PlusHeaderProps) {
  return (
    <h3
      className={cn(
        "flex items-center font-medium",
        inverse ? "text-background" : "text-white"
      )}
    >
      <div
        className={cn(
          "relative mr-2 flex items-center justify-center rounded-full p-1",
          inverse ? "bg-background" : "bg-white"
        )}
      >
        <div className="relative flex h-3 w-3 items-center justify-center rounded-full">
          <Image
            src="/plus.png"
            alt="plus icon"
            fill
            className={cn(
              "object-contain",
              inverse && "brightness-0 invert filter"
            )}
            sizes="12px"
          />
        </div>
      </div>
      {text}
    </h3>
  );
}
