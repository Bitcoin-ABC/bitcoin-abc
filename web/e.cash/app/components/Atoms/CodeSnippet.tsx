// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import { useState } from "react";
import { cn } from "../../utils/cn";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

const snippets: Record<string, string> = {
  "tx.ts": `// Initialize a Chronik client for eCash
import { ChronikClient } from 'chronik-client'

// Point to a public Chronik endpoint or endpoints
const chronik = new ChronikClient(['https://chronik.e.cash/'])

// Get an indexed Tx by txid
async function getTx(txid: string) {
  try {
    const tx = await chronik.tx(txid)
    console.log('tx', tx)
  } catch (err) {
    console.error(\`Error fetching details for txid \${txid}:\`, err)
  }
}

getTx("0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0")
`,

  "utxos.ts": `// Initialize a Chronik client for eCash
import { ChronikClient } from 'chronik-client'

// Point to a public Chronik endpoint or endpoints
const chronik = new ChronikClient(['https://chronik.e.cash/'])

// Fetch UTXOs for a given address
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

fetchUtxos('ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07')
`,

  "websocket.ts": `import { ChronikClient } from "chronik-client";

const TEST_ADDRESS = "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07";

// Test websocket connection for a given chronik server
async function testWebSocket() {
  // Get URL from command line args, default to chronik.e.cash
  const url = process.argv[2] || "https://chronik.e.cash";

  console.log(\`Testing WebSocket connection to: \${url}\`);

  try {
    const chronik = new ChronikClient([url]);

    // Create WebSocket connection
    const ws = chronik.ws({
      onMessage: (msg) => {
        console.log("Received message:", JSON.stringify(msg, null, 2));
      },
      onConnect: () => {
        console.log("WebSocket connected");
      },
      onReconnect: () => {
        console.log("WebSocket reconnected");
      },
      onEnd: () => {
        console.log("WebSocket connection ended");
      },
    });

    // Wait for connection
    await ws.waitForOpen();
    console.log("WebSocket is ready");

    // Subscribe to blocks
    ws.subscribeToBlocks();
    console.log("Subscribed to blocks");

    // Subscribe to test address
    ws.subscribeToAddress(TEST_ADDRESS);
    console.log(\`Subscribed to address: \${TEST_ADDRESS}\`);

    console.log("Listening for messages... (Press Ctrl+C to stop)");

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("🛑 Shutting down...");
      ws.close();
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testWebSocket().catch(console.error);
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
    <div className="scrollx-container w-full overflow-x-auto scroll-smooth bg-gradient-to-bl from-[#120D1C] to-black/60 p-4 lg:h-[590px] lg:p-10">
      <div className="mb-4 flex items-center">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={cn(
              "shrink-0 cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition-all lg:text-sm",
              active === tab
                ? "bg-white/20 opacity-100"
                : "bg-transparent text-gray-400 opacity-60 hover:opacity-90",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="font-fira-code text-xs tracking-wide whitespace-pre-wrap">
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
