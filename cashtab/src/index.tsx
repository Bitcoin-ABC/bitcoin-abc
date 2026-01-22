// Copyright (c) 2024-2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Ecc } from 'ecash-lib';
import LoadingWrapper from 'components/LoadingWrapper';

// Initialize Ecc (used for signing txs) at app startup
const ecc = new Ecc();

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<LoadingWrapper ecc={ecc} />);
} else {
    console.error('Failed to find the root element');
}
