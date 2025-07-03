// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { cn } from "../../utils/cn";

export default function GridPattern({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inline-flex w-96 flex-wrap content-center items-center justify-start gap-5 opacity-10",
        className
      )}
    >
      {Array.from({ length: 192 }).map((_, i) => (
        <div key={i} className="h-1 w-1 rotate-45 bg-zinc-300" />
      ))}
    </div>
  );
}
