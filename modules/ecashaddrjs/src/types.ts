// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export type AddressType = 'P2PKH' | 'P2SH' | 'p2pkh' | 'p2sh';

export interface DecodedAddress {
    prefix: string;
    type: AddressType;
    hash: string | Uint8Array;
}

export interface TypeAndHash {
    type: AddressType;
    hash: string;
}
