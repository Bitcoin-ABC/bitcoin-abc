// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from "react";
import { cn } from "../../utils/cn";

type ContentContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export default function ContentContainer({
  children,
  className,
}: ContentContainerProps) {
  return (
    <div
      className={cn("relative m-auto w-full max-w-[1200px] px-4", className)}
    >
      {children}
    </div>
  );
}
