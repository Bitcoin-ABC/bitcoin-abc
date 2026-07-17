// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** Ordered token UTXO events for one block (tx order, inputs before outputs). */
export type TokenUtxoEvent =
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
          tokenId: string;
          atoms: bigint;
          isMintBaton: boolean;
          tokenProtocol: string;
          tokenType: string;
      };

export interface ResolvedTokenUtxo {
    script: string;
    tokenId: string;
    atoms: bigint;
    isMintBaton: boolean;
    tokenProtocol: string;
    tokenType: string;
}

export const tokenBalanceKey = (
    tokenId: string,
    script: string,
    isMintBaton: boolean,
): string => `${tokenId}:${script}:${isMintBaton ? '1' : '0'}`;

/**
 * Bind JS bigint into PG NUMERIC params. Token atoms are uint64-ranged and can
 * exceed PG signed bigint (int64).
 */
export const bigintToNumericParam = (n: bigint): string => n.toString();

export { utxoOutpointKey, txidHexToBuffer } from './utxoTypes';
