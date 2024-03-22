// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { tokenUtxos, badScriptTokenUtxos } from 'airdrop/fixtures/mocks';
export default {
    getAirdropTx: {
        expectedReturns: [
            {
                description:
                    'We can calculate an airdrop for holders of a given tokenId and no ignored addresses',
                tokenUtxos,
                excludedAddresses: [],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '0',
                returned:
                    'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 150\necash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 50\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 150\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 50\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 200\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 4400',
            },
            {
                description:
                    'We can calculate an airdrop for holders of a given tokenId and one ignored address',
                tokenUtxos,
                excludedAddresses: [
                    'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                ],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '0',
                returned:
                    'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 1250\necash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 416.66\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 1250\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 416.66\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 1666.66',
            },
            {
                description:
                    'We can calculate an airdrop for holders of a given tokenId and two ignored addresses',
                tokenUtxos,
                excludedAddresses: [
                    'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m',
                ],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '0',
                returned:
                    'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 1875\necash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 625\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 1875\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 625',
            },
            {
                description:
                    'We can calculate an airdrop for holders of a given tokenId with no ignored addresses and a specified minTokenQtyUndecimalized that renders only one address eligible',
                tokenUtxos,
                excludedAddresses: [],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '5',
                returned:
                    'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 5000',
            },
            {
                description:
                    'We can calculate an airdrop for holders of a given tokenId with no ignored addresses and a specified minTokenQtyUndecimalized that renders some addresses eligible',
                tokenUtxos,
                excludedAddresses: [],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '2',
                returned:
                    'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 153.06\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 153.06\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 204.08\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 4489.79',
            },
            {
                description:
                    'We can calculate an airdrop for holders of a given tokenId with an ignored addresses and a specified minTokenQtyUndecimalized that renders some addresses eligible',
                tokenUtxos,
                excludedAddresses: [
                    'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                ],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '2',
                returned:
                    'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 1500\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 1500\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 2000',
            },
        ],
        expectedErrors: [
            {
                description:
                    'We throw expected error if no tokens are held at p2pkh or p2sh addresses',
                tokenUtxos: badScriptTokenUtxos,
                excludedAddresses: [],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '0',
                err: 'No token balance of token "50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e" held by p2pkh or p2sh addresses',
            },
            {
                description:
                    'We throw expected error if all eligible addresses are excluded',
                tokenUtxos,
                excludedAddresses: [
                    'ecash:qzudj5fd9t0cknnsc3wzdd4sp46u9r42jc2d89j2kc',
                    'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                    'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6',
                    'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly',
                    'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m',
                ],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '0',
                err: 'No token balance of token "50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e" held by p2pkh or p2sh addresses',
            },
            {
                description:
                    'We throw expected error if all eligible recipients would receive dust',
                tokenUtxos,
                excludedAddresses: [],
                airdropAmountXec: 5,
                minTokenQtyUndecimalized: '0',
                err: 'No eligible recipients with these airdrop settings. Try raising the airdrop amount.',
            },
        ],
    },
    getEqualAirdropTx: {
        expectedReturns: [
            {
                description:
                    'We can calculate an airdrop for holders of a given tokenId and no ignored addresses',
                tokenUtxos,
                excludedAddresses: [],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '0',
                returned:
                    'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 833.33\necash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 833.33\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 833.33\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 833.33\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 833.33\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 833.33',
            },
            {
                description:
                    'We can calculate an airdrop for holders of a given tokenId and one ignored address',
                tokenUtxos,
                excludedAddresses: [
                    'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                ],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '0',
                returned:
                    'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 1000\necash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 1000\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 1000\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 1000\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 1000',
            },
            {
                description:
                    'We can calculate an airdrop for holders of a given tokenId and two ignored addresses',
                tokenUtxos,
                excludedAddresses: [
                    'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m',
                ],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '0',
                returned:
                    'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 1250\necash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 1250\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 1250\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 1250',
            },
            {
                description:
                    'We can calculate an airdrop for holders of a given tokenId with no ignored addresses and a specified minTokenQtyUndecimalized that renders only one address eligible',
                tokenUtxos,
                excludedAddresses: [],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '5',
                returned:
                    'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 5000',
            },
            {
                description:
                    'We can calculate an airdrop for holders of a given tokenId with no ignored addresses and a specified minTokenQtyUndecimalized that renders some addresses eligible',
                tokenUtxos,
                excludedAddresses: [],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '2',
                returned:
                    'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 1250\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 1250\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 1250\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 1250',
            },
            {
                description:
                    'We can calculate an airdrop for holders of a given tokenId with an ignored addresses and a specified minTokenQtyUndecimalized that renders some addresses eligible',
                tokenUtxos,
                excludedAddresses: [
                    'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                ],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '2',
                returned:
                    'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 1666.66\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 1666.66\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 1666.66',
            },
        ],
        expectedErrors: [
            {
                description:
                    'We throw expected error if no tokens are held at p2pkh or p2sh addresses',
                tokenUtxos: badScriptTokenUtxos,
                excludedAddresses: [],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '0',
                err: 'No token balance of token "50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e" held by p2pkh or p2sh addresses',
            },
            {
                description:
                    'We throw expected error if all eligible addresses are excluded',
                tokenUtxos,
                excludedAddresses: [
                    'ecash:qzudj5fd9t0cknnsc3wzdd4sp46u9r42jc2d89j2kc',
                    'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                    'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6',
                    'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly',
                    'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m',
                ],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '0',
                err: 'No token balance of token "50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e" held by p2pkh or p2sh addresses',
            },
            {
                description:
                    'We throw expected error if all eligible addresses are excluded',
                tokenUtxos,
                excludedAddresses: [],
                airdropAmountXec: 5000,
                minTokenQtyUndecimalized: '100',
                err: 'No token holders with more than the minimum eligible balance specified. Try a higher minimum eToken holder balance.',
            },
            {
                description:
                    'We throw expected error if anticipated airdrop amount is less than dust',
                tokenUtxos,
                excludedAddresses: [],
                airdropAmountXec: 5,
                minTokenQtyUndecimalized: '0',
                err: `6 eligible recipients. Recipients would receive less than 550 sats with a total airdrop amount of 5 XEC. Please increase your airdrop amount or ignore more addresses.`,
            },
        ],
    },
};
