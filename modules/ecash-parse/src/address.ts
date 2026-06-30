// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const previewAddress = (address: string): string => {
    const addressWithoutPrefix = address.includes(':')
        ? address.split(':')[1]
        : address;

    return `${addressWithoutPrefix.slice(0, 3)}...${addressWithoutPrefix.slice(
        -3,
    )}`;
};
