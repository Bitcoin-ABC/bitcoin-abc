// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getBalanceSats,
    toXec,
    toSatoshis,
    nanoSatoshisToXec,
    xecToNanoSatoshis,
    hasEnoughToken,
    createCashtabWallet,
    fiatToSatoshis,
    getLegacyPaths,
    getWalletsForNewActiveWallet,
    decimalizeTokenAmount,
    undecimalizeTokenAmount,
    removeLeadingZeros,
    getHashes,
    hasUnfinalizedTxsInHistory,
    getAgoraPartialAcceptFuelInputs,
    getAgoraCancelFuelInputs,
    getAgoraOneshotAcceptFuelInputs,
    sciToDecimal,
    toBigInt,
} from 'wallet';
import { isValidCashtabWallet } from 'validation';
import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
import vectors from '../fixtures/vectors';
import { initWasm } from 'ecash-lib';

describe('Cashtab wallet methods', () => {
    beforeAll(async () => {
        // Need this to use AgoraOffer methods
        await initWasm();
    });
    describe('Calculates total balance in satoshis from a valid set of chronik utxos', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getBalanceSatsVectors;
        expectedReturns.forEach(expectedReturn => {
            const { description, nonSlpUtxos, balanceSats } = expectedReturn;
            it(`getBalanceSats: ${description}`, () => {
                expect(getBalanceSats(nonSlpUtxos)).toBe(balanceSats);
            });
        });
        expectedErrors.forEach(expectedError => {
            const { description, nonSlpUtxos, errorMsg } = expectedError;
            it(`getBalanceSats throws error for: ${description}`, () => {
                expect(() => getBalanceSats(nonSlpUtxos)).toThrow(errorMsg);
            });
        });
    });
    describe('Converts satoshis to XEC and XEC to satoshis', () => {
        const { expectedReturns, expectedErrors } = vectors.toXec;
        expectedReturns.forEach(expectedReturn => {
            const { description, xec, satoshis } = expectedReturn;
            it(`Converts satoshis to xec: ${description}`, () => {
                const satsResult = toXec(satoshis);
                expect(satsResult).toBe(xec);
                // Check string equality as well as JS floating point comparisons
                // are unreliable for large numbers
                expect(satsResult.toString()).toBe(xec.toString());
            });
            it(`Converts xec to satoshis: ${description}`, () => {
                const xecResult = toSatoshis(xec);
                expect(xecResult).toBe(satoshis);
                // Check string equality as well as JS floating point comparisons
                // are unreliable for large numbers
                expect(xecResult.toString()).toBe(satoshis.toString());
            });
        });
        // toXec does not accept non-integer input
        expectedErrors.forEach(expectedError => {
            const { description, satoshis, errorMsg } = expectedError;
            it(`toXec throws error for: ${description}`, () => {
                expect(() => toXec(satoshis)).toThrow(errorMsg);
            });
        });
        // toSatoshis will not return non-integer input
        vectors.toSatoshis.expectedErrors.forEach(expectedError => {
            const { description, xec, errorMsg } = expectedError;
            it(`toSatoshis throws error for: ${description}`, () => {
                expect(() => toSatoshis(xec)).toThrow(errorMsg);
            });
        });
    });
    describe('Determines if the wallet has greater than or equal to a specified qty of a specified token', () => {
        const { expectedReturns } = vectors.hasEnoughToken;
        expectedReturns.forEach(expectedReturn => {
            const { description, tokens, tokenId, tokenQty, hasEnough } =
                expectedReturn;
            it(`hasEnoughToken: ${description}`, () => {
                expect(hasEnoughToken(tokens, tokenId, tokenQty)).toBe(
                    hasEnough,
                );
            });
        });
    });
    describe('Creates a wallet from valid bip39 mnemonic', () => {
        const { expectedReturns } = vectors.createCashtabWallet;
        expectedReturns.forEach(expectedReturn => {
            const { description, mnemonic, wallet } = expectedReturn;
            it(`createCashtabWallet: ${description}`, async () => {
                expect(await createCashtabWallet(mnemonic)).toStrictEqual(
                    wallet,
                );

                // The created wallet is a valid Cashtab wallet
                expect(isValidCashtabWallet(wallet)).toBe(true);
            });
        });
    });
    describe('Converts string input of fiat send amount to satoshis XEC', () => {
        const { expectedReturns } = vectors.fiatToSatoshis;
        expectedReturns.forEach(expectedReturn => {
            const { description, sendAmountFiat, fiatPrice, returned } =
                expectedReturn;
            it(`createCashtabWallet: ${description}`, () => {
                expect(fiatToSatoshis(sendAmountFiat, fiatPrice)).toBe(
                    returned,
                );
            });
        });
    });
    describe('Gets legacy paths from a legacy wallet requiring migration', () => {
        const { expectedReturns } = vectors.getLegacyPaths;
        expectedReturns.forEach(expectedReturn => {
            const { description, wallet, returned } = expectedReturn;
            it(`getLegacyPaths: ${description}`, () => {
                expect(getLegacyPaths(wallet)).toEqual(returned);
            });
        });
    });
    describe('Gets expected array when activating a new wallet', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getWalletsForNewActiveWallet;
        expectedReturns.forEach(expectedReturn => {
            const { description, walletToActivate, wallets, returned } =
                expectedReturn;
            it(`getWalletsForNewActiveWallet: ${description}`, () => {
                expect(
                    getWalletsForNewActiveWallet(walletToActivate, wallets),
                ).toEqual(returned);
            });
        });
        expectedErrors.forEach(expectedError => {
            const { description, walletToActivate, wallets, errorMsg } =
                expectedError;
            it(`getWalletsForNewActiveWallet throws error for: ${description}`, () => {
                expect(() =>
                    getWalletsForNewActiveWallet(walletToActivate, wallets),
                ).toThrow(errorMsg);
            });
        });
    });
    describe('We can decimalize a token amount string and undecimalize it back', () => {
        const { expectedReturns, expectedErrors } =
            vectors.decimalizeTokenAmount;
        expectedReturns.forEach(expectedReturn => {
            const { description, amount, decimals, returned } = expectedReturn;
            it(`decimalizeTokenAmount: ${description}`, () => {
                expect(decimalizeTokenAmount(amount, decimals)).toBe(returned);
            });
            it(`undecimalizeTokenAmount: ${description}`, () => {
                expect(undecimalizeTokenAmount(returned, decimals)).toBe(
                    amount,
                );
            });
        });
        // We can decimalize amounts in scientific notation
        // Note we do not expect undecimalizeTokenAmount to return these to sci notation
        it(`decimalizeTokenAmount can handle large numbers in scientific notation`, () => {
            expect(decimalizeTokenAmount('1.40577399462323814e18', 9)).toBe(
                '1405773994.623238140',
            );
        });
        it(`decimalizeTokenAmount can handle larger numbers in scientific notation`, () => {
            expect(
                decimalizeTokenAmount(
                    '1.234567898765432101234567898765432e33',
                    9,
                ),
            ).toBe('1234567898765432101234567.898765432');
        });
        it(`decimalizeTokenAmount can handle larger numbers in scientific notation for zero decimals`, () => {
            expect(
                decimalizeTokenAmount(
                    '1.234567898765432101234567898765432e33',
                    0,
                ),
            ).toBe('1234567898765432101234567898765432');
        });
        expectedErrors.forEach(expectedError => {
            const { description, amount, decimals, error } = expectedError;
            it(`decimalizeTokenAmount throws error for: ${description}`, () => {
                expect(() => decimalizeTokenAmount(amount, decimals)).toThrow(
                    error,
                );
            });
        });
    });
    describe('We can undecimalize a decimalizedTokenAmount string, and we throw expected errors if undecimalizeTokenAmount is invalid', () => {
        const { expectedReturns, expectedErrors } =
            vectors.undecimalizeTokenAmount;
        expectedReturns.forEach(expectedReturn => {
            const { description, decimalizedAmount, decimals, returned } =
                expectedReturn;
            it(`undecimalizeTokenAmount: ${description}`, () => {
                expect(
                    undecimalizeTokenAmount(decimalizedAmount, decimals),
                ).toBe(returned);
            });
            // Note that we cannot round trip these tests, as decimalizeTokenAmount will
            // always return exact precision, while undecimalizeTokenAmount tolerates underprecision
        });
        expectedErrors.forEach(expectedError => {
            const { description, decimalizedAmount, decimals, error } =
                expectedError;
            it(`undecimalizeTokenAmount throws error for: ${description}`, () => {
                expect(() =>
                    undecimalizeTokenAmount(decimalizedAmount, decimals),
                ).toThrow(error);
            });
        });
    });
    describe('Removes leading zeros from a string', () => {
        const { expectedReturns } = vectors.removeLeadingZeros;
        expectedReturns.forEach(expectedReturn => {
            const { description, givenString, returned } = expectedReturn;
            it(`removeLeadingZeros: ${description}`, () => {
                expect(removeLeadingZeros(givenString)).toBe(returned);
            });
        });
    });
    it(`Successfully extracts a hash160 array from valid cashtab wallet`, () => {
        expect(getHashes(walletWithXecAndTokens)).toStrictEqual([
            '3a5fb236934ec078b4507c303d3afd82067f8fc1',
            'a28f8852f868f88e71ec666c632d6f86e978f046',
            '600efb12a6f813eccf13171a8bc62055212d8d6c',
        ]);
    });
    describe('Determines if a wallet has unfinalized txs in history', () => {
        const { expectedReturns } = vectors.hasUnfinalizedTxsInHistory;
        expectedReturns.forEach(expectedReturn => {
            const { description, wallet, returned } = expectedReturn;
            it(`hasUnfinalizedTxsInHistory: ${description}`, () => {
                expect(hasUnfinalizedTxsInHistory(wallet)).toBe(returned);
            });
        });
    });
    describe('Converts nanosatoshis to XEC and XEC to nanosatoshis', () => {
        const { expectedReturns, expectedErrors } = vectors.nanoSatoshisToXec;
        expectedReturns.forEach(expectedReturn => {
            const { description, xec, nanosatoshis } = expectedReturn;
            it(`Converts nanosatoshis to xec: ${description}`, () => {
                const satsResult = nanoSatoshisToXec(nanosatoshis);
                expect(satsResult).toBe(xec);
                // Check string equality as well as JS floating point comparisons
                // are unreliable for large numbers
                expect(satsResult.toString()).toBe(xec.toString());
            });
            it(`Converts xec to nanosatoshis: ${description}`, () => {
                const xecResult = xecToNanoSatoshis(xec);
                expect(xecResult).toBe(nanosatoshis);
                // Check string equality as well as JS floating point comparisons
                // are unreliable for large numbers
                expect(xecResult.toString()).toBe(nanosatoshis.toString());
            });
        });
        // nanoSatoshisToXec does not accept non-integer input
        expectedErrors.forEach(expectedError => {
            const { description, satoshis, errorMsg } = expectedError;
            it(`nanoSatoshisToXec throws error for: ${description}`, () => {
                expect(() => nanoSatoshisToXec(satoshis)).toThrow(errorMsg);
            });
        });
        // xecToNanoSatoshis will round non-integer input
        vectors.xecToNanoSatoshis.expectedReturns.forEach(expectedReturn => {
            const { description, xec, returned } = expectedReturn;
            it(`Converts overprecise or < 1 nanosat XEC values to nanosatoshis: ${description}`, () => {
                const xecResult = xecToNanoSatoshis(xec);
                expect(xecResult).toBe(returned);
            });
        });
    });
    describe('We can get fuel inputs for an AgoraOffer (partial) accept tx', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getAgoraPartialAcceptFuelInputs;
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                agoraOffer,
                utxos,
                acceptedTokens,
                feePerKb,
                returned,
            } = expectedReturn;
            it(`getAgoraPartialAcceptFuelInputs: ${description}`, () => {
                expect(
                    getAgoraPartialAcceptFuelInputs(
                        agoraOffer,
                        utxos,
                        acceptedTokens,
                        feePerKb,
                    ),
                ).toStrictEqual(returned);
            });
        });
        expectedErrors.forEach(expectedError => {
            const {
                description,
                agoraOffer,
                utxos,
                acceptedTokens,
                feePerKb,
                error,
            } = expectedError;
            it(`getAgoraPartialAcceptFuelInputs throws error for: ${description}`, () => {
                expect(() =>
                    getAgoraPartialAcceptFuelInputs(
                        agoraOffer,
                        utxos,
                        acceptedTokens,
                        feePerKb,
                    ),
                ).toThrow(error);
            });
        });
    });
    describe('We can get fuel inputs for an AgoraOffer (partial or oneshot) cancel tx', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getAgoraCancelFuelInputs;
        expectedReturns.forEach(expectedReturn => {
            const { description, agoraOffer, utxos, feePerKb, returned } =
                expectedReturn;
            it(`getAgoraCancelFuelInputs: ${description}`, () => {
                expect(
                    getAgoraCancelFuelInputs(agoraOffer, utxos, feePerKb),
                ).toStrictEqual(returned);
            });
        });
        expectedErrors.forEach(expectedError => {
            const { description, agoraOffer, utxos, feePerKb, error } =
                expectedError;
            it(`getAgoraCancelFuelInputs throws error for: ${description}`, () => {
                expect(() =>
                    getAgoraCancelFuelInputs(agoraOffer, utxos, feePerKb),
                ).toThrow(error);
            });
        });
    });
    describe('We can convert scientific notation numbers to stringified decimals', () => {
        const { expectedReturns, expectedErrors } = vectors.sciToDecimal;
        expectedReturns.forEach(expectedReturn => {
            const { description, amount, returned } = expectedReturn;
            it(`sciToDecimal: ${description}`, () => {
                expect(sciToDecimal(amount)).toBe(returned);
            });
        });
        expectedErrors.forEach(expectedError => {
            const { description, amount, error } = expectedError;
            it(`sciToDecimal throws error for: ${description}`, () => {
                expect(() => sciToDecimal(amount)).toThrow(error);
            });
        });
    });
    describe('We can convert stringified scientific notation numbers to bigint', () => {
        const { expectedReturns, expectedErrors } = vectors.toBigInt;
        expectedReturns.forEach(expectedReturn => {
            const { description, str, returned } = expectedReturn;
            it(`toBigInt: ${description}`, () => {
                expect(toBigInt(str)).toBe(returned);
            });
        });
        expectedErrors.forEach(expectedError => {
            const { description, str, error } = expectedError;
            it(`toBigInt throws error for: ${description}`, () => {
                expect(() => toBigInt(str)).toThrow(error);
            });
        });
    });
    describe('We can get fuel inputs for an AgoraOffer (ONESHOT) accept tx', () => {
        const { expectedReturns, expectedErrors } =
            vectors.getAgoraOneshotAcceptFuelInputs;
        expectedReturns.forEach(expectedReturn => {
            const { description, oneshotOffer, utxos, feePerKb, returned } =
                expectedReturn;
            it(`getAgoraOneshotAcceptFuelInputs: ${description}`, () => {
                expect(
                    getAgoraOneshotAcceptFuelInputs(
                        oneshotOffer,
                        utxos,
                        feePerKb,
                    ),
                ).toStrictEqual(returned);
            });
        });
        expectedErrors.forEach(expectedError => {
            const { description, oneshotOffer, utxos, feePerKb, error } =
                expectedError;
            it(`getAgoraOneshotAcceptFuelInputs throws error for: ${description}`, () => {
                expect(() =>
                    getAgoraOneshotAcceptFuelInputs(
                        oneshotOffer,
                        utxos,
                        feePerKb,
                    ),
                ).toThrow(error);
            });
        });
    });
});
