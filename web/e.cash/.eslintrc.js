// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Define header
const headerArray = [
    ` Copyright (c) ${new Date().getFullYear()} The Bitcoin developers`,
    ' Distributed under the MIT software license, see the accompanying',
    ' file COPYING or http://www.opensource.org/licenses/mit-license.php.',
];
module.exports = {
    extends: 'next/core-web-vitals',
    plugins: ['header'],
    rules: {
        'header/header': [
            2,
            'line',
            [
                ' Copyright (c) 2023 The Bitcoin developers',
                ' Distributed under the MIT software license, see the accompanying',
                ' file COPYING or http://www.opensource.org/licenses/mit-license.php.',
            ],
            1,
        ],
    },
};
