// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

export const explorer = {
    blockExplorerUrl:
        import.meta.env.VITE_TESTNET === 'true'
            ? 'https://texplorer.e.cash'
            : 'https://explorer.e.cash',
    pdfReceiptUrl: 'https://blockchair.com/ecash/transaction',
};
