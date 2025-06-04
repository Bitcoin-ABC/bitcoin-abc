// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from "react";

type ContentContainerProps = {
  children: React.ReactNode;
};

export default function ContentContainer({ children }: ContentContainerProps) {
  return (
    <div className="relative m-auto w-full max-w-[1200px] px-4">{children}</div>
  );
}
