// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { ChronikClient, Tx, WsEndpoint } from "chronik-client";

const CHRONIK_URLS = ["https://chronik.e.cash"];

interface ChronikContextType {
  chronik: ChronikClient | null;
  ws: WsEndpoint | null;
  mempool: Tx[];
  isLoadingMempool: boolean;
  error: Error | null;
}

const ChronikContext = createContext<ChronikContextType>({
  chronik: null,
  ws: null,
  mempool: [],
  isLoadingMempool: false,
  error: null,
});

export function useChronik() {
  return useContext(ChronikContext);
}

export function ChronikProvider({ children }: { children: ReactNode }) {
  const [chronik, setChronik] = useState<ChronikClient | null>(null);
  const [ws, setWs] = useState<WsEndpoint | null>(null);
  const [mempool, setMempool] = useState<Tx[]>([]);
  const [isLoadingMempool, setIsLoadingMempool] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize Chronik client on mount
  useEffect(() => {
    const chronikClient = new ChronikClient(CHRONIK_URLS);
    setChronik(chronikClient);

    return () => {
      setChronik(null);
    };
  }, []);

  // Set up websocket subscription and fetch initial mempool when chronik is available
  useEffect(() => {
    if (!chronik) {
      setMempool([]);
      setIsLoadingMempool(false);
      return;
    }

    let wsEndpoint: WsEndpoint | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const fetchInitialMempool = async () => {
      try {
        setIsLoadingMempool(true);
        setError(null);
        const unconfirmedTxs = await chronik.unconfirmedTxs();
        // Reverse to show newest first
        const reversedTxs = [...(unconfirmedTxs.txs || [])].reverse();
        setMempool(reversedTxs);
      } catch (err) {
        console.error("Error fetching initial mempool:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setMempool([]);
      } finally {
        setIsLoadingMempool(false);
      }
    };

    const connectWebSocket = async () => {
      try {
        wsEndpoint = chronik.ws({
          onMessage: async (msg) => {
            if (msg.type === "Tx" && msg.msgType === "TX_ADDED_TO_MEMPOOL") {
              try {
                const fullTx = await chronik.tx(msg.txid);
                setMempool((prevTxs) => {
                  // Skip if transaction already exists
                  if (prevTxs.some((tx) => tx.txid === fullTx.txid)) {
                    return prevTxs;
                  }
                  // Add new transaction to the beginning
                  return [fullTx, ...prevTxs];
                });
              } catch (error) {
                console.error(`Error fetching tx ${msg.txid}:`, error);
              }
            } else if (
              msg.type === "Tx" &&
              msg.msgType === "TX_REMOVED_FROM_MEMPOOL"
            ) {
              // Remove transaction from mempool when it's removed
              setMempool((prevTxs) =>
                prevTxs.filter((tx) => tx.txid !== msg.txid),
              );
            }
          },
          onConnect: () => {
            console.log("Chronik WebSocket connected");
          },
          onReconnect: () => {
            console.log("Chronik WebSocket reconnected");
          },
          onEnd: () => {
            console.log("Chronik WebSocket connection ended");
          },
        });

        await wsEndpoint.waitForOpen();
        wsEndpoint.subscribeToTxs();
        setWs(wsEndpoint);
        console.log("Subscribed to transaction updates");

        // Fetch initial mempool after websocket is connected
        await fetchInitialMempool();
      } catch (err) {
        console.error("Error creating WebSocket:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        // Reconnect after 5 seconds
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (wsEndpoint) {
        try {
          wsEndpoint.close();
        } catch (err) {
          console.error("Error closing WebSocket:", err);
        }
      }
      setWs(null);
    };
  }, [chronik]);

  return (
    <ChronikContext.Provider
      value={{
        chronik,
        ws,
        mempool,
        isLoadingMempool,
        error,
      }}
    >
      {children}
    </ChronikContext.Provider>
  );
}
