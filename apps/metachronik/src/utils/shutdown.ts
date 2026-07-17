// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

let shutdownRequested = false;

export function requestShutdown(): void {
    shutdownRequested = true;
}

export function isShutdownRequested(): boolean {
    return shutdownRequested;
}
