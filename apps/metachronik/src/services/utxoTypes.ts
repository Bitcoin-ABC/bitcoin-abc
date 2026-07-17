// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** Ordered UTXO events for one block (tx order, inputs before outputs per tx). */
export type UtxoEvent =
    | {
          type: 'spend';
          prevTxid: string;
          prevVout: number;
      }
    | {
          type: 'create';
          txid: string;
          vout: number;
          script: string;
          sats: bigint;
      };

export interface ResolvedUtxo {
    script: string;
    sats: bigint;
}

/** Key for in-block pending creates: `${txid}:${vout}` */
export const utxoOutpointKey = (txid: string, vout: number): string =>
    `${txid}:${vout}`;

export const txidHexToBuffer = (txidHex: string): Buffer =>
    Buffer.from(txidHex, 'hex');
