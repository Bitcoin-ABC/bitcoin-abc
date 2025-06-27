// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import { useState } from "react";
import { cn } from "../utils/cn";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

const snippets: Record<string, string> = {
  "chronik-init.ts": `// Initialize a Chronik client for eCash
import Chronik from 'chronik-client'

// Point to a public Chronik endpoint (mainnet)
const chronik = new Chronik('https://chronik.be.cash/xec')

// Test the connection by fetching the current block height
async function initChronik() {
  try {
    const { blockHeight } = await chronik.blockchain().blockHeight()
    console.log('Connected to Chronik, current height:', blockHeight)
  } catch (err) {
    console.error('Failed to connect to Chronik:', err)
  }
}

initChronik()
`,

  "address-utxos.ts": `// Fetch UTXOs for a given address
async function fetchUtxos(address: string) {
  try {
    const utxoResponse = await chronik.address(address).utxos()
    console.log('UTXOs for', address, utxoResponse)
    return utxoResponse
  } catch (err) {
    console.error('Error fetching UTXOs:', err)
    throw err
  }
}

// Example usage:
// fetchUtxos('bitcoincash:qr...')
`,

  "address-monitor.ts": `// Monitor an address for new incoming transactions
async function monitorAddress(address: string, pollInterval = 5000) {
  const seen = new Set<string>()
  // Initial load of UTXOs
  const initial = await chronik.address(address).utxos()
  initial.forEach((utxo) => seen.add(utxo.txid))

  setInterval(async () => {
    try {
      const current = await chronik.address(address).utxos()
      for (const utxo of current) {
        if (!seen.has(utxo.txid)) {
          console.log('New UTXO for', address, utxo)
          seen.add(utxo.txid)
        }
      }
    } catch (err) {
      console.error('Error polling UTXOs:', err)
    }
  }, pollInterval)
}

// Example usage:
monitorAddress('ecash:qrq3…')
`,
};

// Map file extensions to Prism-supported languages
const extLangMap: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "jsx",
  html: "html",
  css: "css",
  json: "json",
  md: "markdown",
};

export default function CodeSnippetTabs() {
  const tabs = Object.keys(snippets);
  const [active, setActive] = useState(tabs[0]);

  // Determine language from file extension
  const ext = active.split(".").pop()?.toLowerCase() || "";
  const language = extLangMap[ext] || ext;

  return (
    <div className="scrollx-container w-full overflow-x-auto scroll-smooth bg-gradient-to-bl from-[#120D1C] to-black/60 p-4 lg:h-[550px] lg:p-10">
      <div className="mb-4 flex items-center">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={cn(
              "shrink-0 cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition-all lg:text-sm",
              active === tab
                ? "bg-white/20 opacity-100"
                : "bg-transparent text-gray-400 opacity-60 hover:opacity-90"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="font-fira-code whitespace-pre-wrap text-xs tracking-wide">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          className="react-syntax-highlighter"
        >
          {snippets[active]}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
