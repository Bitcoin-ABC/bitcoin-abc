// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import Image from "next/image";

interface PlusHeaderProps {
  text: string;
}

export default function PlusHeader({ text }: PlusHeaderProps) {
  return (
    <h3 className="flex items-center font-medium">
      <div className="relative mr-2 flex items-center justify-center rounded-full bg-white p-1">
        <div className="relative flex h-3 w-3 items-center justify-center rounded-full">
          <Image
            src="/plus.png"
            alt="plus icon"
            fill
            className="object-contain"
          />
        </div>
      </div>
      {text}
    </h3>
  );
}
