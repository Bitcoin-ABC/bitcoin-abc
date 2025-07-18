// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
    Ecc,
    fromHex,
    shaRmd160,
    Script,
    Address,
    toHex,
    strToBytes,
    OP_RETURN,
    GenesisInfo,
    SLP_MAX_SEND_OUTPUTS,
    COINBASE_MATURITY,
    ALP_POLICY_MAX_OUTPUTS,
    payment,
    SLP_TOKEN_TYPE_FUNGIBLE,
    ALP_TOKEN_TYPE_STANDARD,
} from 'ecash-lib';
import {
    OutPoint,
    ScriptUtxo,
    ChronikClient,
    Token,
    TokenType,
} from 'chronik-client';
import { MockChronikClient } from 'mock-chronik-client';
import {
    Wallet,
    validateTokenActions,
    getActionTotals,
    getTokenType,
    finalizeOutputs,
    selectUtxos,
    SatsSelectionStrategy,
} from './wallet';

const expect = chai.expect;
chai.use(chaiAsPromised);

const DUMMY_TIPHEIGHT = 800000;
const DUMMY_TIPHASH =
    '0000000000000000115e051672e3d4a6c523598594825a1194862937941296fe';
const DUMMMY_TXID = '11'.repeat(32);
const DUMMY_SK = fromHex('22'.repeat(32));
const testEcc = new Ecc();
const DUMMY_PK = testEcc.derivePubkey(DUMMY_SK);
const DUMMY_HASH = shaRmd160(DUMMY_PK);
const DUMMY_ADDRESS = Address.p2pkh(DUMMY_HASH).toString();
const DUMMY_SCRIPT = Script.p2pkh(DUMMY_HASH);
const DUMMY_OUTPOINT: OutPoint = {
    txid: DUMMMY_TXID,
    outIdx: 0,
};
const DUMMY_UTXO: ScriptUtxo = {
    outpoint: DUMMY_OUTPOINT,
    blockHeight: DUMMY_TIPHEIGHT,
    isCoinbase: false,
    sats: 546n,
    isFinal: true,
};

/**
 * Coinbase utxo with blockheight of DUMMY_UTXO, i.e. DUMMY_TIPHEIGHT
 * Coinbase utxos require COINBASE_MATURITY
 * confirmations to become spendable
 */
const DUMMY_UNSPENDABLE_COINBASE_UTXO: ScriptUtxo = {
    ...DUMMY_UTXO,
    outpoint: { ...DUMMY_OUTPOINT, outIdx: 1 },
    isCoinbase: true,
    sats: 31250000n,
};

/**
 * A coinbase utxo with (just) enough confirmations to be spendable
 */
const DUMMY_SPENDABLE_COINBASE_UTXO: ScriptUtxo = {
    ...DUMMY_UNSPENDABLE_COINBASE_UTXO,
    outpoint: { ...DUMMY_OUTPOINT, outIdx: 2 },
    blockHeight: DUMMY_TIPHEIGHT - COINBASE_MATURITY,
};

// Dummy ALP STANDARD utxos (quantity and mintbaton)
const DUMMY_TOKENID_ALP_TOKEN_TYPE_STANDARD = toHex(strToBytes('SLP2')).repeat(
    8,
);
const TOKEN_TYPE_ALP_TOKEN_TYPE_STANDARD: TokenType = {
    protocol: 'ALP',
    type: 'ALP_TOKEN_TYPE_STANDARD',
    number: 0,
};
const ALP_TOKEN_TYPE_STANDARD_ATOMS = 101n;
const DUMMY_TOKEN_ALP_TOKEN_TYPE_STANDARD: Token = {
    tokenId: DUMMY_TOKENID_ALP_TOKEN_TYPE_STANDARD,
    tokenType: TOKEN_TYPE_ALP_TOKEN_TYPE_STANDARD,
    atoms: ALP_TOKEN_TYPE_STANDARD_ATOMS,
    isMintBaton: false,
};
const DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD: ScriptUtxo = {
    ...DUMMY_UTXO,
    outpoint: { ...DUMMY_OUTPOINT, outIdx: 3 },
    token: DUMMY_TOKEN_ALP_TOKEN_TYPE_STANDARD,
};
const DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD_MINTBATON: ScriptUtxo = {
    ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
    outpoint: { ...DUMMY_OUTPOINT, outIdx: 4 },
    token: {
        ...DUMMY_TOKEN_ALP_TOKEN_TYPE_STANDARD,
        isMintBaton: true,
        atoms: 0n,
    },
};

const getDummyAlpUtxo = (
    atoms: bigint,
    tokenId = DUMMY_TOKENID_ALP_TOKEN_TYPE_STANDARD,
) => {
    return {
        ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
        token: { ...DUMMY_TOKEN_ALP_TOKEN_TYPE_STANDARD, tokenId, atoms },
    };
};

// Dummy SLP utxos (quantity and mintbaton)
const DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE = toHex(strToBytes('SLP0')).repeat(
    8,
);
const TOKEN_TYPE_SLP_TOKEN_TYPE_FUNGIBLE: TokenType = {
    protocol: 'SLP',
    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
    number: 1,
};
const SLP_TOKEN_TYPE_FUNGIBLE_ATOMS = 100n;
const DUMMY_TOKEN_SLP_TOKEN_TYPE_FUNGIBLE: Token = {
    tokenId: DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
    tokenType: TOKEN_TYPE_SLP_TOKEN_TYPE_FUNGIBLE,
    atoms: SLP_TOKEN_TYPE_FUNGIBLE_ATOMS,
    isMintBaton: false,
};
const DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE: ScriptUtxo = {
    ...DUMMY_UTXO,
    outpoint: { ...DUMMY_OUTPOINT, outIdx: 5 },
    token: DUMMY_TOKEN_SLP_TOKEN_TYPE_FUNGIBLE,
};

const getDummySlpUtxo = (
    atoms: bigint,
    tokenId = DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
) => {
    return {
        ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE,
        token: { ...DUMMY_TOKEN_SLP_TOKEN_TYPE_FUNGIBLE, tokenId, atoms },
    };
};

const DUMMY_SPENDABLE_COINBASE_UTXO_TOKEN: ScriptUtxo = {
    ...DUMMY_SPENDABLE_COINBASE_UTXO,
    outpoint: { ...DUMMY_OUTPOINT, outIdx: 5 },
    token: DUMMY_TOKEN_ALP_TOKEN_TYPE_STANDARD,
};

// Utxo set used in testing to show all utxo types supported by ecash-wallet
const ALL_SUPPORTED_UTXOS: ScriptUtxo[] = [
    DUMMY_UTXO,
    DUMMY_UNSPENDABLE_COINBASE_UTXO,
    DUMMY_SPENDABLE_COINBASE_UTXO,
    DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
    DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD_MINTBATON,
    DUMMY_SPENDABLE_COINBASE_UTXO_TOKEN,
];

const MOCK_DESTINATION_ADDRESS = Address.p2pkh('deadbeef'.repeat(5)).toString();
const MOCK_DESTINATION_SCRIPT = Address.fromCashAddress(
    MOCK_DESTINATION_ADDRESS,
).toScript();

describe('wallet.ts', () => {
    it('We can initialize and sync a Wallet', async () => {
        const mockChronik = new MockChronikClient();

        // We can create a wallet
        const testWallet = Wallet.fromSk(
            DUMMY_SK,
            mockChronik as unknown as ChronikClient,
        );

        // We can create a wallet from a mnemonic
        const mnemonicWallet = Wallet.fromMnemonic(
            'morning average minor stable parrot refuse credit exercise february mirror just begin',
            mockChronik as unknown as ChronikClient,
        );

        const mnemonicSk = mnemonicWallet.sk;

        // We can generate the same wallet from an sk
        const mnemonicWalletFromSk = Wallet.fromSk(
            mnemonicSk,
            mockChronik as unknown as ChronikClient,
        );

        // They are the same wallet
        expect(mnemonicWallet.sk).to.deep.equal(mnemonicWalletFromSk.sk);

        // sk and chronik are directly set by constructor
        expect(testWallet.sk).to.equal(DUMMY_SK);
        expect(testWallet.chronik).to.deep.equal(mockChronik);
        // ecc is initialized automatically
        expect(testWallet.ecc).to.not.equal(undefined);

        // pk, hash, script, and address are all derived from sk
        expect(testWallet.pk).to.deep.equal(DUMMY_PK);
        expect(testWallet.pkh).to.deep.equal(DUMMY_HASH);
        expect(testWallet.script).to.deep.equal(DUMMY_SCRIPT);
        expect(testWallet.address).to.equal(DUMMY_ADDRESS);

        // tipHeight is zero on creation
        expect(testWallet.tipHeight).to.equal(0);

        // utxo set is empty on creation
        expect(testWallet.utxos).to.deep.equal([]);

        // We have no spendableSatsOnlyUtxos before sync
        expect(testWallet.spendableSatsOnlyUtxos()).to.deep.equal([]);

        // Mock a chaintip
        mockChronik.setBlockchainInfo({
            tipHash: DUMMY_TIPHASH,
            tipHeight: DUMMY_TIPHEIGHT,
        });

        // Mock a utxo set
        mockChronik.setUtxosByAddress(DUMMY_ADDRESS, ALL_SUPPORTED_UTXOS);

        // We can sync the wallet
        await testWallet.sync();

        // Now we have a chaintip
        expect(testWallet.tipHeight).to.equal(DUMMY_TIPHEIGHT);

        // We can get spendableSatsOnlyUtxos, which include spendable coinbase utxos
        expect(testWallet.spendableSatsOnlyUtxos()).to.deep.equal([
            DUMMY_UTXO,
            DUMMY_SPENDABLE_COINBASE_UTXO,
        ]);

        // Now we have utxos
        expect(testWallet.utxos).to.deep.equal(ALL_SUPPORTED_UTXOS);

        // We can get the size of a tx without broadcasting it
        expect(
            testWallet
                .action({
                    outputs: [
                        {
                            script: MOCK_DESTINATION_SCRIPT,
                            sats: 546n,
                        },
                    ],
                })
                .build()
                .size(),
        ).to.equal(360);

        // We can get the fee of a tx without broadcasting it
        expect(
            testWallet
                .action({
                    outputs: [
                        {
                            script: MOCK_DESTINATION_SCRIPT,
                            sats: 546n,
                        },
                    ],
                })
                .build()
                .fee(),
        ).to.equal(360n);

        // Fee can be adjusted by feePerKb param
        expect(
            testWallet
                .action({
                    outputs: [
                        {
                            script: MOCK_DESTINATION_SCRIPT,
                            sats: 546n,
                        },
                    ],
                    feePerKb: 5000n,
                })
                .build()
                .fee(),
        ).to.equal(1800n);
    });
    it('Throw error on sync() fail', async () => {
        const mockChronik = new MockChronikClient();

        const errorWallet = Wallet.fromSk(
            DUMMY_SK,
            mockChronik as unknown as ChronikClient,
        );

        // Mock a chaintip with no error
        mockChronik.setBlockchainInfo({
            tipHash:
                '0000000000000000115e051672e3d4a6c523598594825a1194862937941296fe',
            tipHeight: DUMMY_TIPHEIGHT,
        });

        // Mock a chronik error getting utxos
        mockChronik.setUtxosByAddress(
            DUMMY_ADDRESS,
            new Error('some chronik query error'),
        );

        // utxos is empty on creation
        expect(errorWallet.utxos).to.deep.equal([]);

        // Throw error if sync wallet and chronik is unavailable
        await expect(errorWallet.sync()).to.be.rejectedWith(
            Error,
            'some chronik query error',
        );

        // tipHeight will still be zero as we do not set any sync()-related state fields unless we have no errors
        expect(errorWallet.tipHeight).to.equal(0);

        // utxos are still empty because there was an error in querying latest utxo set
        expect(errorWallet.utxos).to.deep.equal([]);
    });
});

describe('Support functions', () => {
    context('validateTokenActions', () => {
        const dummyGenesisAction = {
            type: 'GENESIS',
            tokenType: TOKEN_TYPE_ALP_TOKEN_TYPE_STANDARD,
            genesisInfo: {
                tokenTicker: 'ALP',
                tokenName: 'ALP Test Token',
                url: 'cashtab.com',
                decimals: 0,
                data: 'deadbeef',
            },
        } as payment.GenesisAction;
        const tokenOne = '11'.repeat(32);
        const tokenTwo = '22'.repeat(32);
        const dummySendActionTokenOne = {
            type: 'SEND',
            tokenId: tokenOne,
        } as payment.SendAction;
        const dummyMintActionTokenOne = {
            type: 'MINT',
            tokenId: tokenOne,
        } as payment.MintAction;
        const dummyBurnActionTokenOne = {
            type: 'BURN',
            tokenId: tokenOne,
        } as payment.BurnAction;
        it('An empty array at the tokenActions key is valid', () => {
            expect(() => validateTokenActions([])).not.to.throw();
        });
        it('tokenActions with a genesisAction at index 0 are valid', () => {
            expect(() =>
                validateTokenActions([dummyGenesisAction]),
            ).not.to.throw();
        });
        it('tokenActions that SEND different tokens are valid', () => {
            expect(() =>
                validateTokenActions([
                    dummySendActionTokenOne,
                    { ...dummySendActionTokenOne, tokenId: tokenTwo },
                ]),
            ).not.to.throw();
        });
        it('tokenActions that MINT different tokens are valid', () => {
            expect(() =>
                validateTokenActions([
                    dummyMintActionTokenOne,
                    { ...dummyMintActionTokenOne, tokenId: tokenTwo },
                ]),
            ).not.to.throw();
        });
        it('tokenActions that BURN different tokens are valid', () => {
            expect(() =>
                validateTokenActions([
                    dummyBurnActionTokenOne,
                    { ...dummyBurnActionTokenOne, tokenId: tokenTwo },
                ]),
            ).not.to.throw();
        });
        it('tokenActions that SEND and MINT different tokens are valid', () => {
            expect(() =>
                validateTokenActions([
                    dummySendActionTokenOne,
                    { ...dummyMintActionTokenOne, tokenId: tokenTwo },
                ]),
            ).not.to.throw();
        });
        it('tokenActions that BURN and MINT different tokens are valid', () => {
            expect(() =>
                validateTokenActions([
                    dummyBurnActionTokenOne,
                    { ...dummyMintActionTokenOne, tokenId: tokenTwo },
                ]),
            ).not.to.throw();
        });
        it('We can SEND and BURN the same token', () => {
            expect(() =>
                validateTokenActions([
                    dummySendActionTokenOne,
                    dummyBurnActionTokenOne,
                ]),
            ).not.to.throw();
        });
        it('We can MINT and BURN the same token', () => {
            expect(() =>
                validateTokenActions([
                    dummyMintActionTokenOne,
                    dummyBurnActionTokenOne,
                ]),
            ).not.to.throw();
        });
        it('tokenActions with a genesisAction at index !==0 are invalid', () => {
            expect(() =>
                validateTokenActions([
                    dummySendActionTokenOne,
                    dummyGenesisAction,
                ]),
            ).to.throw(
                Error,
                `GenesisAction must be at index 0 of tokenActions. Found GenesisAction at index 1.`,
            );
        });
        it('tokenActions with duplicate SEND actions are invalid', () => {
            expect(() =>
                validateTokenActions([
                    dummySendActionTokenOne,
                    dummySendActionTokenOne,
                ]),
            ).to.throw(Error, `Duplicate SEND action for tokenId ${tokenOne}`);
        });
        it('tokenActions with duplicate MINT actions are invalid', () => {
            expect(() =>
                validateTokenActions([
                    dummyMintActionTokenOne,
                    dummyMintActionTokenOne,
                ]),
            ).to.throw(Error, `Duplicate MINT action for tokenId ${tokenOne}`);
        });
        it('tokenActions with duplicate BURN actions are invalid', () => {
            expect(() =>
                validateTokenActions([
                    dummyBurnActionTokenOne,
                    dummyBurnActionTokenOne,
                ]),
            ).to.throw(Error, `Duplicate BURN action for tokenId ${tokenOne}`);
        });
        it('tokenActions that call for SEND and MINT of the same tokenId are invalid', () => {
            expect(() =>
                validateTokenActions([
                    dummySendActionTokenOne,
                    dummyMintActionTokenOne,
                ]),
            ).to.throw(
                Error,
                `ecash-wallet does not support minting and sending the same token in the same Action. tokenActions MINT and SEND ${tokenOne}.`,
            );
        });
        it('tokenActions that call for MINT and SEND of the same tokenId are invalid', () => {
            // We swap the order for this test
            expect(() =>
                validateTokenActions([
                    dummyMintActionTokenOne,
                    dummySendActionTokenOne,
                ]),
            ).to.throw(
                Error,
                `ecash-wallet does not support minting and sending the same token in the same Action. tokenActions MINT and SEND ${tokenOne}.`,
            );
        });
    });
    context('getActionTotals', () => {
        it('Returns expected ActionTotal for a non-token action (i.e., sats only)', () => {
            const action = {
                outputs: [
                    {
                        sats: 0n,
                        script: new Script(new Uint8Array([OP_RETURN])),
                    },
                    { sats: 1000n, script: DUMMY_SCRIPT },
                    { sats: 1000n, script: DUMMY_SCRIPT },
                    { sats: 1000n, script: DUMMY_SCRIPT },
                ],
            };
            const totals = getActionTotals(action);
            expect(totals).to.deep.equal({
                sats: 3000n,
            });
        });
        it('Returns the correct ActionTotal for a single token SEND', () => {
            const sendTokenId = '11'.repeat(32);
            const action = {
                outputs: [
                    // Blank OP_RETURN
                    { sats: 0n },
                    // XEC send output
                    { sats: 1000n, script: DUMMY_SCRIPT },
                    // token SEND output
                    {
                        sats: 546n,
                        script: DUMMY_SCRIPT,
                        atoms: 10n,
                        tokenId: sendTokenId,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND' as const,
                        tokenId: sendTokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                ],
            };
            const totals = getActionTotals(action);
            expect(totals).to.deep.equal({
                sats: 1546n,
                tokens: new Map([
                    [
                        sendTokenId,
                        {
                            atoms: 10n,
                            atomsMustBeExact: false,
                            needsMintBaton: false,
                        },
                    ],
                ]),
            });
        });
        it('Returns the correct ActionTotal for a single token BURN', () => {
            const burnTokenId = '11'.repeat(32);
            const action = {
                outputs: [
                    // Blank OP_RETURN
                    { sats: 0n },
                    // XEC send output
                    { sats: 1000n, script: DUMMY_SCRIPT },
                    // token SEND output
                    {
                        sats: 546n,
                        script: DUMMY_SCRIPT,
                        atoms: 10n,
                        tokenId: burnTokenId,
                    },
                ],
                tokenActions: [
                    {
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        type: 'SEND' as const,
                        tokenId: burnTokenId,
                        burnAtoms: 10n,
                    },
                    {
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        type: 'BURN' as const,
                        tokenId: burnTokenId,
                        burnAtoms: 10n,
                    },
                ],
            };
            const totals = getActionTotals(action);
            expect(totals).to.deep.equal({
                sats: 1546n,
                tokens: new Map([
                    [
                        burnTokenId,
                        {
                            atoms: 20n,
                            atomsMustBeExact: false,
                            needsMintBaton: false,
                        },
                    ],
                ]),
            });
        });
        it('Returns the correct ActionTotal for a single token MINT', () => {
            const mintTokenId = '11'.repeat(32);
            const action = {
                outputs: [
                    // Blank OP_RETURN
                    { sats: 0n },
                    // XEC send output
                    { sats: 1000n, script: DUMMY_SCRIPT },
                    // token MINT output
                    {
                        sats: 546n,
                        script: DUMMY_SCRIPT,
                        atoms: 10n,
                        tokenId: mintTokenId,
                        isMint: true,
                    },
                ],
                tokenActions: [
                    {
                        type: 'MINT' as const,
                        tokenId: mintTokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                ],
            };
            const totals = getActionTotals(action);
            expect(totals).to.deep.equal({
                sats: 1546n,
                tokens: new Map([
                    [
                        mintTokenId,
                        {
                            atoms: 0n,
                            atomsMustBeExact: false,
                            needsMintBaton: true,
                        },
                    ],
                ]),
            });
        });
        it('DOES NOT throw for a combined BURN and MINT of a single token', () => {
            const mintTokenId = '11'.repeat(32);
            const action = {
                outputs: [
                    // Blank OP_RETURN
                    { sats: 0n },
                    // XEC send output
                    { sats: 1000n, script: DUMMY_SCRIPT },
                    // token MINT output
                    {
                        sats: 546n,
                        script: DUMMY_SCRIPT,
                        atoms: 10n,
                        tokenId: mintTokenId,
                        isMint: true,
                    },
                ],
                tokenActions: [
                    {
                        type: 'MINT' as const,
                        tokenId: mintTokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'BURN' as const,
                        tokenId: mintTokenId,
                        burnAtoms: 10n,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                ],
            };
            expect(() => getActionTotals(action)).not.to.throw();
        });
        it('Does not throw if one token is burned and a separate token is minted', () => {
            const mintTokenId = '11'.repeat(32);
            const burnTokenId = '22'.repeat(32);
            const action = {
                outputs: [
                    // Blank OP_RETURN
                    { sats: 0n },
                    // XEC send output
                    { sats: 1000n, script: DUMMY_SCRIPT },
                    // token MINT output
                    {
                        sats: 546n,
                        script: DUMMY_SCRIPT,
                        atoms: 10n,
                        tokenId: mintTokenId,
                        isMint: true,
                    },
                ],
                tokenActions: [
                    {
                        type: 'BURN' as const,
                        tokenId: burnTokenId,
                        burnAtoms: 10n,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'MINT' as const,
                        tokenId: mintTokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                ],
            };
            const actionTotals = getActionTotals(action);
            expect(actionTotals).to.deep.equal({
                sats: 1546n,
                tokens: new Map([
                    [
                        mintTokenId,
                        {
                            atoms: 0n,
                            atomsMustBeExact: false,
                            needsMintBaton: true,
                        },
                    ],
                    [
                        burnTokenId,
                        {
                            atoms: 10n,
                            atomsMustBeExact: true,
                            needsMintBaton: false,
                        },
                    ],
                ]),
            });
        });
        it('Returns the correct ActionTotal for sending and burning multiple tokens', () => {
            const burnTokenId = '11'.repeat(32);
            const sendTokenId = '22'.repeat(32);
            const action = {
                outputs: [
                    // Blank OP_RETURN
                    { sats: 0n },
                    // XEC send output
                    { sats: 1000n, script: DUMMY_SCRIPT },
                    // token 1 SEND output
                    {
                        sats: 546n,
                        script: DUMMY_SCRIPT,
                        atoms: 10n,
                        tokenId: burnTokenId,
                    },
                    // token 2 SEND output
                    {
                        sats: 546n,
                        script: DUMMY_SCRIPT,
                        atoms: 11n,
                        tokenId: sendTokenId,
                    },
                    // another token 2 SEND output
                    {
                        sats: 546n,
                        script: DUMMY_SCRIPT,
                        atoms: 4n,
                        tokenId: sendTokenId,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND' as const,
                        tokenId: sendTokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'SEND' as const,
                        tokenId: burnTokenId,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'BURN' as const,
                        tokenId: burnTokenId,
                        burnAtoms: 10n,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                ],
            };
            const totals = getActionTotals(action);
            expect(totals).to.deep.equal({
                sats: 2638n,
                tokens: new Map([
                    [
                        '11'.repeat(32),
                        {
                            atoms: 20n,
                            atomsMustBeExact: false,
                            needsMintBaton: false,
                        },
                    ],
                    [
                        '22'.repeat(32),
                        {
                            atoms: 15n,
                            atomsMustBeExact: false,
                            needsMintBaton: false,
                        },
                    ],
                ]),
            });
        });
    });
    context('selectUtxos', () => {
        it('Return success false and missing sats for a non-token tx with insufficient sats', () => {
            const action = {
                outputs: [{ sats: 1_000n, script: MOCK_DESTINATION_SCRIPT }],
            };
            const spendableUtxos: ScriptUtxo[] = [];
            expect(selectUtxos(action, spendableUtxos)).to.deep.equal({
                success: false,
                missingSats: 1000n,
                errors: [
                    'Insufficient sats to complete tx. Need 1000 additional satoshis to complete this Action.',
                ],
            });
        });
        it('Return success true for a non-token tx with insufficient sats if NO_SATS strategy', () => {
            const action = {
                outputs: [{ sats: 1_000n, script: MOCK_DESTINATION_SCRIPT }],
            };
            const spendableUtxos: ScriptUtxo[] = [];
            expect(
                selectUtxos(
                    action,
                    spendableUtxos,
                    SatsSelectionStrategy.NO_SATS,
                ),
            ).to.deep.equal({
                success: true,
                missingSats: 1000n,
                utxos: [],
            });
        });
        it('Return success true for a non-token tx with insufficient sats if ATTEMPT_SATS strategy', () => {
            const action = {
                outputs: [{ sats: 1_000n, script: MOCK_DESTINATION_SCRIPT }],
            };
            const spendableUtxos = [
                { ...DUMMY_UTXO, sats: 500n },
                { ...DUMMY_UTXO, sats: 300n },
            ];
            expect(
                selectUtxos(
                    action,
                    spendableUtxos,
                    SatsSelectionStrategy.ATTEMPT_SATS,
                ),
            ).to.deep.equal({
                success: true,
                missingSats: 200n,
                utxos: [
                    { ...DUMMY_UTXO, sats: 500n },
                    { ...DUMMY_UTXO, sats: 300n },
                ],
            });
        });
        it('Return success true for a non-token tx with sufficient sats if ATTEMPT_SATS strategy', () => {
            const action = {
                outputs: [{ sats: 1_000n, script: MOCK_DESTINATION_SCRIPT }],
            };
            const spendableUtxos = [
                { ...DUMMY_UTXO, sats: 500n },
                { ...DUMMY_UTXO, sats: 600n },
            ];
            expect(
                selectUtxos(
                    action,
                    spendableUtxos,
                    SatsSelectionStrategy.ATTEMPT_SATS,
                ),
            ).to.deep.equal({
                success: true,
                missingSats: 0n,
                utxos: [
                    { ...DUMMY_UTXO, sats: 500n },
                    { ...DUMMY_UTXO, sats: 600n },
                ],
            });
        });
        it('Return success true for a token tx with sufficient tokens but insufficient sats if ATTEMPT_SATS strategy', () => {
            const action = {
                outputs: [
                    { sats: 1_000n, script: MOCK_DESTINATION_SCRIPT },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
                        atoms: 2n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                    },
                ] as payment.TokenAction[],
            };
            const spendableUtxos = [
                { ...DUMMY_UTXO, sats: 500n },
                getDummySlpUtxo(2n),
            ];
            expect(
                selectUtxos(
                    action,
                    spendableUtxos,
                    SatsSelectionStrategy.ATTEMPT_SATS,
                ),
            ).to.deep.equal({
                success: true,
                missingSats: 500n,
                utxos: [{ ...DUMMY_UTXO, sats: 500n }, getDummySlpUtxo(2n)],
            });
        });
        it('Return failure for a token tx with missing tokens even if ATTEMPT_SATS strategy', () => {
            const action = {
                outputs: [
                    { sats: 1_000n, script: MOCK_DESTINATION_SCRIPT },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
                        atoms: 2n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                    },
                ] as payment.TokenAction[],
            };
            const spendableUtxos = [
                { ...DUMMY_UTXO, sats: 10_000n },
                getDummySlpUtxo(1n),
            ];
            expect(
                selectUtxos(
                    action,
                    spendableUtxos,
                    SatsSelectionStrategy.ATTEMPT_SATS,
                ),
            ).to.deep.equal({
                success: false,
                missingSats: 0n,
                missingTokens: new Map([
                    [
                        DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
                        {
                            atoms: 1n,
                            atomsMustBeExact: false,
                            needsMintBaton: false,
                            error: 'Missing 1 atom',
                        },
                    ],
                ]),
                errors: [
                    `Missing required token utxos: ${DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE} => Missing 1 atom`,
                ],
            });
        });
        it('Return success true for a token tx with sufficient tokens and sats if ATTEMPT_SATS strategy', () => {
            const action = {
                outputs: [
                    { sats: 1_000n, script: MOCK_DESTINATION_SCRIPT },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
                        atoms: 2n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                    },
                ] as payment.TokenAction[],
            };
            const spendableUtxos = [
                { ...DUMMY_UTXO, sats: 1_500n },
                getDummySlpUtxo(2n),
            ];
            expect(
                selectUtxos(
                    action,
                    spendableUtxos,
                    SatsSelectionStrategy.ATTEMPT_SATS,
                ),
            ).to.deep.equal({
                success: true,
                missingSats: 0n,
                utxos: [{ ...DUMMY_UTXO, sats: 1_500n }, getDummySlpUtxo(2n)],
            });
        });
        it('For an XEC-only tx, returns non-token utxos with sufficient sats', () => {
            const action = {
                outputs: [{ sats: 1_000n, script: MOCK_DESTINATION_SCRIPT }],
            };
            const spendableUtxos = [
                { ...DUMMY_UTXO, sats: 750n },
                { ...DUMMY_UTXO, sats: 750n },
                { ...DUMMY_UTXO, sats: 750n },
            ];
            expect(selectUtxos(action, spendableUtxos)).to.deep.equal({
                success: true,
                missingSats: 0n,
                utxos: [
                    { ...DUMMY_UTXO, sats: 750n },
                    { ...DUMMY_UTXO, sats: 750n },
                ],
            });
        });
        it('Will return when accumulative selection has identified utxos that exactly equal the total output sats', () => {
            const action = {
                outputs: [{ sats: 1_000n, script: MOCK_DESTINATION_SCRIPT }],
            };
            const spendableUtxos = [
                { ...DUMMY_UTXO, sats: 1_000n },
                { ...DUMMY_UTXO, sats: 750n },
            ];
            expect(selectUtxos(action, spendableUtxos)).to.deep.equal({
                success: true,
                missingSats: 0n,
                utxos: [{ ...DUMMY_UTXO, sats: 1_000n }],
            });
        });
        it('Returns expected object if we have insufficient token utxos', () => {
            const action = {
                outputs: [
                    { sats: 1_000n, script: MOCK_DESTINATION_SCRIPT },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
                        atoms: 2n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                    },
                ] as payment.TokenAction[],
            };
            const spendableUtxos = [
                { ...DUMMY_UTXO, sats: 10_000n },
                getDummySlpUtxo(1n),
            ];
            expect(selectUtxos(action, spendableUtxos)).to.deep.equal({
                success: false,
                missingSats: 0n,
                missingTokens: new Map([
                    [
                        DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
                        {
                            atoms: 1n,
                            atomsMustBeExact: false,
                            needsMintBaton: false,
                            error: 'Missing 1 atom',
                        },
                    ],
                ]),
                errors: [
                    `Missing required token utxos: ${DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE} => Missing 1 atom`,
                ],
            });
        });
        it('Returns detailed summary of missing token inputs', () => {
            const tokenIdToMint = '11'.repeat(32);
            const tokenToSendAlpha = '22'.repeat(32);
            const tokenToSendBeta = '33'.repeat(32);
            const action = {
                outputs: [
                    { sats: 1_000n, script: MOCK_DESTINATION_SCRIPT },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        isMint: true,
                        atoms: 100n,
                        tokenId: tokenIdToMint,
                        isMintBaton: false,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        isMint: true,
                        atoms: 0n,
                        tokenId: tokenIdToMint,
                        isMintBaton: true,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: tokenToSendAlpha,
                        atoms: 20n,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: tokenToSendBeta,
                        atoms: 30n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: tokenToSendAlpha,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'SEND',
                        tokenId: tokenToSendBeta,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'MINT',
                        tokenId: tokenIdToMint,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                ] as payment.TokenAction[],
            };
            const spendableUtxos = [
                { ...DUMMY_UTXO, sats: 10_000n },
                // no mint baton for token to mint
                // insufficient utxos for token alpha
                getDummyAlpUtxo(10n, tokenToSendAlpha),
                // insufficient utxos for token beta
                getDummyAlpUtxo(20n, tokenToSendBeta),
            ];
            expect(selectUtxos(action, spendableUtxos)).to.deep.equal({
                success: false,
                missingSats: 0n,
                missingTokens: new Map([
                    [
                        tokenIdToMint,
                        {
                            atoms: 0n,
                            atomsMustBeExact: false,
                            needsMintBaton: true,
                            error: 'Missing mint baton',
                        },
                    ],
                    [
                        tokenToSendAlpha,
                        {
                            atoms: 10n,
                            atomsMustBeExact: false,
                            needsMintBaton: false,
                            error: 'Missing 10 atoms',
                        },
                    ],
                    [
                        tokenToSendBeta,
                        {
                            atoms: 10n,
                            atomsMustBeExact: false,
                            needsMintBaton: false,
                            error: 'Missing 10 atoms',
                        },
                    ],
                ]),
                errors: [
                    `Missing required token utxos: ${tokenIdToMint} => Missing mint baton, ${tokenToSendAlpha} => Missing 10 atoms, ${tokenToSendBeta} => Missing 10 atoms`,
                ],
            });
        });
        it('Returns detailed summary of missing token inputs and missing sats', () => {
            const tokenIdToMint = '11'.repeat(32);
            const tokenToSendAlpha = '22'.repeat(32);
            const tokenToSendBeta = '33'.repeat(32);
            const action = {
                outputs: [
                    { sats: 1_000n, script: MOCK_DESTINATION_SCRIPT },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        isMint: true,
                        atoms: 100n,
                        tokenId: tokenIdToMint,
                        isMintBaton: false,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        isMint: true,
                        atoms: 0n,
                        tokenId: tokenIdToMint,
                        isMintBaton: true,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: tokenToSendAlpha,
                        atoms: 20n,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: tokenToSendBeta,
                        atoms: 30n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: tokenToSendAlpha,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'SEND',
                        tokenId: tokenToSendBeta,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'MINT',
                        tokenId: tokenIdToMint,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                ] as payment.TokenAction[],
            };
            const spendableUtxos = [
                { ...DUMMY_UTXO, sats: 1_000n },
                // no mint baton for token to mint
                // insufficient utxos for token alpha
                getDummyAlpUtxo(10n, tokenToSendAlpha),
                // insufficient utxos for token beta
                getDummyAlpUtxo(20n, tokenToSendBeta),
            ];
            expect(selectUtxos(action, spendableUtxos)).to.deep.equal({
                success: false,
                missingSats: 1092n,
                missingTokens: new Map([
                    [
                        tokenIdToMint,
                        {
                            atoms: 0n,
                            atomsMustBeExact: false,
                            needsMintBaton: true,
                            error: 'Missing mint baton',
                        },
                    ],
                    [
                        tokenToSendAlpha,
                        {
                            atoms: 10n,
                            atomsMustBeExact: false,
                            needsMintBaton: false,
                            error: 'Missing 10 atoms',
                        },
                    ],
                    [
                        tokenToSendBeta,
                        {
                            atoms: 10n,
                            atomsMustBeExact: false,
                            needsMintBaton: false,
                            error: 'Missing 10 atoms',
                        },
                    ],
                ]),
                errors: [
                    `Missing required token utxos: ${tokenIdToMint} => Missing mint baton, ${tokenToSendAlpha} => Missing 10 atoms, ${tokenToSendBeta} => Missing 10 atoms`,
                ],
            });
        });
        it('Returns sufficient token utxos for a single token tx', () => {
            const action = {
                outputs: [
                    { sats: 1_000n, script: MOCK_DESTINATION_SCRIPT },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
                        atoms: 1n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                    },
                ] as payment.TokenAction[],
            };
            const spendableUtxos = [
                { ...DUMMY_UTXO, sats: 10_000n },
                getDummySlpUtxo(1n),
                getDummySlpUtxo(1n),
            ];
            expect(selectUtxos(action, spendableUtxos)).to.deep.equal({
                success: true,
                missingSats: 0n,
                utxos: [{ ...DUMMY_UTXO, sats: 10_000n }, getDummySlpUtxo(1n)],
            });
        });
        it('Returns sufficient token utxos for a complicated token tx', () => {
            const tokenIdToMint = '11'.repeat(32);
            const tokenToSendAlpha = '22'.repeat(32);
            const tokenToSendBeta = '33'.repeat(32);
            const action = {
                outputs: [
                    { sats: 1_000n, script: MOCK_DESTINATION_SCRIPT },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        isMint: true,
                        atoms: 100n,
                        tokenId: tokenIdToMint,
                        isMintBaton: false,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        isMint: true,
                        atoms: 0n,
                        tokenId: tokenIdToMint,
                        isMintBaton: true,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: tokenToSendAlpha,
                        atoms: 20n,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: tokenToSendBeta,
                        atoms: 30n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: tokenToSendAlpha,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'SEND',
                        tokenId: tokenToSendBeta,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'MINT',
                        tokenId: tokenIdToMint,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                ] as payment.TokenAction[],
            };
            const spendableUtxos = [
                { ...DUMMY_UTXO, sats: 10_000n },
                {
                    ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD_MINTBATON,
                    token: {
                        ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD_MINTBATON.token,
                        tokenId: tokenIdToMint,
                    },
                } as ScriptUtxo,
                // Sufficient utxos for token alpha
                getDummyAlpUtxo(1000n, tokenToSendAlpha),
                // Sufficient utxos for token beta
                getDummyAlpUtxo(2000n, tokenToSendBeta),
            ];
            expect(selectUtxos(action, spendableUtxos)).to.deep.equal({
                success: true,
                missingSats: 0n,
                utxos: spendableUtxos,
            });
        });
        it('Returns sufficient token utxos for a complicated token tx if gasless', () => {
            const tokenIdToMint = '11'.repeat(32);
            const tokenToSendAlpha = '22'.repeat(32);
            const tokenToSendBeta = '33'.repeat(32);
            const action = {
                outputs: [
                    // NB we include no sats only utxos
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        isMint: true,
                        atoms: 100n,
                        tokenId: tokenIdToMint,
                        isMintBaton: false,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        isMint: true,
                        atoms: 0n,
                        tokenId: tokenIdToMint,
                        isMintBaton: true,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: tokenToSendAlpha,
                        atoms: 20n,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: tokenToSendBeta,
                        atoms: 30n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: tokenToSendAlpha,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'SEND',
                        tokenId: tokenToSendBeta,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'MINT',
                        tokenId: tokenIdToMint,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                ] as payment.TokenAction[],
            };
            const spendableUtxos = [
                {
                    ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD_MINTBATON,
                    token: {
                        ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD_MINTBATON.token,
                        tokenId: tokenIdToMint,
                    },
                } as ScriptUtxo,
                // Sufficient utxos for token alpha
                getDummyAlpUtxo(1000n, tokenToSendAlpha),
                // Sufficient utxos for token beta
                getDummyAlpUtxo(2000n, tokenToSendBeta),
            ];
            expect(
                selectUtxos(
                    action,
                    spendableUtxos,
                    SatsSelectionStrategy.NO_SATS,
                ),
            ).to.deep.equal({
                success: true,
                utxos: spendableUtxos,
                missingSats: 546n,
            });
        });
        it('Returns detailed summary of missing token inputs for a gasless tx', () => {
            const tokenIdToMint = '11'.repeat(32);
            const tokenToSendAlpha = '22'.repeat(32);
            const tokenToSendBeta = '33'.repeat(32);
            const action = {
                outputs: [
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        isMint: true,
                        atoms: 100n,
                        tokenId: tokenIdToMint,
                        isMintBaton: false,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        isMint: true,
                        atoms: 0n,
                        tokenId: tokenIdToMint,
                        isMintBaton: true,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: tokenToSendAlpha,
                        atoms: 20n,
                    },
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: tokenToSendBeta,
                        atoms: 30n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: tokenToSendAlpha,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'SEND',
                        tokenId: tokenToSendBeta,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                    {
                        type: 'MINT',
                        tokenId: tokenIdToMint,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    },
                ] as payment.TokenAction[],
            };
            const spendableUtxos = [
                // no mint baton for token to mint
                // insufficient utxos for token alpha
                getDummyAlpUtxo(10n, tokenToSendAlpha),
                // insufficient utxos for token beta
                getDummyAlpUtxo(20n, tokenToSendBeta),
            ];
            expect(
                selectUtxos(
                    action,
                    spendableUtxos,
                    SatsSelectionStrategy.NO_SATS,
                ),
            ).to.deep.equal({
                success: false,
                missingSats: 1092n,
                missingTokens: new Map([
                    [
                        tokenIdToMint,
                        {
                            atoms: 0n,
                            atomsMustBeExact: false,
                            needsMintBaton: true,
                            error: 'Missing mint baton',
                        },
                    ],
                    [
                        tokenToSendAlpha,
                        {
                            atoms: 10n,
                            atomsMustBeExact: false,
                            needsMintBaton: false,
                            error: 'Missing 10 atoms',
                        },
                    ],
                    [
                        tokenToSendBeta,
                        {
                            atoms: 10n,
                            atomsMustBeExact: false,
                            needsMintBaton: false,
                            error: 'Missing 10 atoms',
                        },
                    ],
                ]),
                errors: [
                    `Missing required token utxos: 1111111111111111111111111111111111111111111111111111111111111111 => Missing mint baton,` +
                        ` 2222222222222222222222222222222222222222222222222222222222222222 => Missing 10 atoms,` +
                        ` 3333333333333333333333333333333333333333333333333333333333333333 => Missing 10 atoms`,
                ],
            });
        });
    });
    context('getTokenType', () => {
        it('Returns user-specified genesisAction tokenType for an Action with specified genesisAction', () => {
            const slpGenesisInfo = {
                tokenTicker: 'SLP',
                tokenName: 'SLP Test Token',
                url: 'cashtab.com',
                decimals: 0,
            };

            const genesisMintQty = 1_000n;

            // Construct the Action for this tx
            const slpGenesisAction: payment.Action = {
                outputs: [
                    /** Blank OP_RETURN at outIdx 0 */
                    { sats: 0n },
                    /** Mint qty at outIdx 1, per SLP spec */
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        atoms: genesisMintQty,
                    },
                    /** Mint baton at outIdx 2, in valid spec range of range 2-255 */
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        isMintBaton: true,
                        atoms: 0n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                        genesisInfo: slpGenesisInfo,
                    },
                ] as payment.TokenAction[],
            };
            expect(getTokenType(slpGenesisAction)).to.deep.equal({
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            });
        });
        it('Throws if we have multiple token types in tokenActions', () => {
            const alpGenesisInfo = {
                tokenTicker: 'ALP',
                tokenName: 'ALP Test Token',
                url: 'cashtab.com',
                decimals: 0,
                data: 'deadbeef',
            };

            // Construct the Action for this tx
            const alpGenesisAction: payment.Action = {
                outputs: [
                    /** Blank OP_RETURN at outIdx 0 */
                    { sats: 0n },
                    /** Mint qty at outIdx 1 */
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        atoms: 100n,
                    },
                    /** Mint baton at outIdx 2 */
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                        isMintBaton: true,
                        atoms: 0n,
                    },
                    /** SLP SEND */
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: DUMMY_TOKENID_SLP_TOKEN_TYPE_FUNGIBLE,
                        isMintBaton: false,
                        atoms: 10n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'GENESIS',
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        genesisInfo: alpGenesisInfo,
                    },
                    {
                        type: 'SEND',
                        tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                    },
                ] as payment.TokenAction[],
            };
            expect(() => getTokenType(alpGenesisAction)).to.throw(
                Error,
                `Action must include only one token type. Found (at least) two: ALP_TOKEN_TYPE_STANDARD and SLP_TOKEN_TYPE_FUNGIBLE.`,
            );
        });
        it('Infers and returns token type for a non-genesis tx', () => {
            const alpMintAction: payment.Action = {
                outputs: [
                    /** Blank OP_RETURN at outIdx 0 */
                    { sats: 0n },
                    /** Mint qty at outIdx 1 */
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: DUMMY_TOKENID_ALP_TOKEN_TYPE_STANDARD,
                        atoms: 10n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'MINT',
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                    } as payment.MintAction,
                ],
            };
            expect(getTokenType(alpMintAction)).to.deep.equal(
                TOKEN_TYPE_ALP_TOKEN_TYPE_STANDARD,
            );
        });
        it('Returns an unsupported token type without throwing', () => {
            const alpMintAction: payment.Action = {
                outputs: [
                    /** Blank OP_RETURN at outIdx 0 */
                    { sats: 0n },
                    /** Mint qty at outIdx 1 */
                    {
                        sats: 546n,
                        script: MOCK_DESTINATION_SCRIPT,
                        tokenId: DUMMY_TOKENID_ALP_TOKEN_TYPE_STANDARD,
                        atoms: 10n,
                    },
                ],
                tokenActions: [
                    {
                        type: 'MINT',
                        tokenType: {
                            ...ALP_TOKEN_TYPE_STANDARD,
                            type: 'SOME_UNSUPPORTED_TYPE',
                        } as unknown as TokenType,
                    } as payment.MintAction,
                ],
            };
            expect(getTokenType(alpMintAction)).to.deep.equal({
                ...ALP_TOKEN_TYPE_STANDARD,
                type: 'SOME_UNSUPPORTED_TYPE',
            } as unknown as TokenType);
        });
    });
    context('finalizeOutputs', () => {
        /**
         * NB in practice, "requiredUtxos" will be a calculated param in the class
         * We will always get the utxos required for the tx based on specified outputs
         *
         * So, in these tests, we use dummy values for requiredUtxos, i.e. an ALP token
         * utxo for ALP token txs, a non-token UTXO for non-token txs, etc
         *
         * We need to include requiredUtxos in the finalizeOutputs function because token
         * actions may need to generate additional outputs that are a function of the inputs,
         * for example token change which we always assume the user wants to include
         * UNLESS an intentionalBurn is specified
         *
         * We may wish to introduce a "token leftover" output type but I think it's ok to assume
         * we always want to NOT burn tokens and return any change to the user.
         */
        const nullGenesisInfo: GenesisInfo = {
            tokenTicker: '\0',
            tokenName: '\0',
            url: '\0',
            data: '00',
            authPubkey: '00',
            decimals: 4,
        };
        const DUMMY_CHANGE_SCRIPT = MOCK_DESTINATION_SCRIPT;
        context('Validation rules common to all token types', () => {
            it('Throws if Action does not specify any outputs', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [],
                        },
                        [DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'No outputs specified. All actions must have outputs.',
                );
            });
            it('Throws if non-token Action specifies more than one OP_RETURN outputs', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                {
                                    sats: 0n,
                                    script: new Script(
                                        new Uint8Array([OP_RETURN]),
                                    ),
                                },
                                {
                                    sats: 0n,
                                    script: new Script(
                                        new Uint8Array([OP_RETURN]),
                                    ),
                                },
                            ],
                        },
                        [DUMMY_UTXO],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'ecash-wallet only supports 1 OP_RETURN per tx. 2 OP_RETURN outputs specified.',
                );
            });
            it('Throws if non-token Action specifies a blank OP_RETURN at index 0', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                {
                                    sats: 0n,
                                },
                            ],
                        },
                        [DUMMY_UTXO],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'A blank OP_RETURN output (i.e. {sats: 0n}) is not allowed in a non-token tx.',
                );
            });
            it('Throws if non-token Action specifies a blank OP_RETURN at some other index', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 546n, script: DUMMY_SCRIPT },
                                {
                                    sats: 0n,
                                },
                            ],
                        },
                        [DUMMY_UTXO],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'A blank OP_RETURN output (i.e. {sats: 0n}) is not allowed in a non-token tx.',
                );
            });
            it('Throws if non-token Action burns XEC in the OP_RETURN', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 546n, script: DUMMY_SCRIPT },
                                {
                                    sats: 10n,
                                    script: new Script(
                                        new Uint8Array([OP_RETURN]),
                                    ),
                                },
                            ],
                        },
                        [DUMMY_UTXO],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'Tx burns 10 satoshis in OP_RETURN output. ecash-wallet does not support burning XEC in the OP_RETURN.',
                );
            });
            it('Throws if a token Action DOES NOT specify a blank OP_RETURN at index 0', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                {
                                    sats: 546n,
                                    tokenId: '11'.repeat(32),
                                    atoms: 100n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'SEND',
                                    tokenId: '11'.repeat(32),
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'Token action requires a built OP_RETURN at index 0 of outputs, i.e. { sats: 0n }.',
                );
            });
            it('Throws if a token Action specifies a non-blank OP_RETURN at index 0', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                {
                                    sats: 0n,
                                    script: new Script(
                                        new Uint8Array([OP_RETURN]),
                                    ),
                                },

                                {
                                    sats: 546n,
                                    tokenId: '11'.repeat(32),
                                    atoms: 100n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'SEND',
                                    tokenId: '11'.repeat(32),
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                            ],
                        },
                        [DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'A token tx cannot specify any manual OP_RETURN outputs. Token txs can only include a blank OP_RETURN output (i.e. { sats: 0n} at index 0.',
                );
            });
            it('Throws if Action includes a leftover output', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                DUMMY_SCRIPT as unknown as payment.PaymentOutput,
                            ],
                        },
                        [DUMMY_UTXO],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'ecash-wallet automatically includes a leftover output. Do not specify a leftover output in the outputs array.',
                );
            });
            it('Throws if Action includes genesis outputs but no genesisAction is specified', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Valid genesis mint qty outIdx
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    atoms: 100n,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: false,
                                },
                                // Valid genesis baton outIdx
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    atoms: 0n,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: true,
                                },
                            ],
                            // No genesisAction
                            tokenActions: [
                                {
                                    type: 'MINT',
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'Genesis outputs specified without GenesisAction. Must include GenesisAction or remove genesis outputs.',
                );
            });
            it('Throws if Action includes repeated tokenId in intentionalBurns', () => {
                const tokenIdThisAction = '11'.repeat(32);
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                {
                                    sats: 546n,
                                    tokenId: tokenIdThisAction,
                                    script: DUMMY_SCRIPT,
                                    atoms: 100n,
                                    isMintBaton: false,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'BURN',
                                    tokenId: tokenIdThisAction,
                                    burnAtoms: 100n,
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                                {
                                    type: 'BURN',
                                    tokenId: tokenIdThisAction,
                                    burnAtoms: 1n,
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `Duplicate BURN action for tokenId ${tokenIdThisAction}`,
                );
            });
            it('Throws if action token type is not supported', () => {
                const tokenIdThisAction = `11`.repeat(32);
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Send output
                                {
                                    sats: 546n,
                                    tokenId: tokenIdThisAction,
                                    atoms: 1_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'SEND',
                                    tokenId: tokenIdThisAction,
                                    tokenType: {
                                        ...TOKEN_TYPE_SLP_TOKEN_TYPE_FUNGIBLE,
                                        type: 'SOME_UNSUPPORTED_TYPE',
                                    } as unknown as TokenType,
                                },
                            ] as payment.TokenAction[],
                        },
                        [
                            {
                                ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE.token,
                                    tokenId: '11'.repeat(32),
                                    atoms: 1_000_000_000n,
                                } as Token,
                            },
                        ],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'Unsupported tokenType SOME_UNSUPPORTED_TYPE.',
                );
            });
            it('Throws if user has specified any mint baton outputs with non-zero atoms', () => {
                const tokenIdThisAction = '11'.repeat(32);
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Valid baton outIdx
                                {
                                    tokenId: tokenIdThisAction,
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    atoms: 1n,
                                    isMintBaton: true,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'SEND',
                                    tokenId: tokenIdThisAction,
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'Mint baton outputs must have 0 atoms. Found 1 mint baton output with non-zero atoms.',
                );
            });
        });
        context('SLP_TOKEN_TYPE_FUNGIBLE', () => {
            it('Throws if action is associated with more than one tokenId', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                {
                                    sats: 546n,
                                    tokenId: '11'.repeat(32),
                                    atoms: 1_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                                {
                                    sats: 546n,
                                    tokenId: '22'.repeat(32),
                                    atoms: 1_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'SEND',
                                    tokenId: '11'.repeat(32),
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                                {
                                    type: 'SEND',
                                    tokenId: '22'.repeat(32),
                                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                                },
                            ] as payment.TokenAction[],
                        },
                        [
                            {
                                ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE.token,
                                    tokenId: '11'.repeat(32),
                                    atoms: 1_000_000_000n,
                                } as Token,
                            },
                            {
                                ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                                    tokenId: '22'.repeat(32),
                                    atoms: 1_000_000_000n,
                                } as Token,
                            },
                        ],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'Action must include only one token type. Found (at least) two: ALP_TOKEN_TYPE_STANDARD and SLP_TOKEN_TYPE_FUNGIBLE.',
                );
            });
            it('Throws if we have a genesisAction and another token action', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                // Blank OP_RETURN
                                { sats: 0n },
                                // Genesis mint qty at correct outIdx for SLP_TOKEN_TYPE_FUNGIBLE
                                {
                                    sats: 546n,
                                    atoms: 1_000_000n,
                                    script: DUMMY_SCRIPT,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: false,
                                },
                                // Token SEND output unrelated to genesis
                                {
                                    sats: 546n,
                                    tokenId: '11'.repeat(32),
                                    atoms: 1_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'GENESIS',
                                    tokenType:
                                        TOKEN_TYPE_SLP_TOKEN_TYPE_FUNGIBLE,
                                    genesisInfo: nullGenesisInfo,
                                },
                                {
                                    type: 'SEND',
                                    tokenId: '11'.repeat(32),
                                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                                },
                            ] as payment.TokenAction[],
                        },
                        [
                            {
                                ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE.token,
                                    tokenId: '11'.repeat(32),
                                    atoms: 1_000_000_000n,
                                } as Token,
                            },
                        ],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'SLP_TOKEN_TYPE_FUNGIBLE token txs may only have a single token action. 2 tokenActions specified.',
                );
            });
            it('Throws if action combines MINT and SEND outputs', () => {
                const tokenIdThisAction = `11`.repeat(32);
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Send output
                                {
                                    sats: 546n,
                                    tokenId: tokenIdThisAction,
                                    atoms: 1_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                                // Mint output
                                {
                                    sats: 546n,
                                    tokenId: tokenIdThisAction,
                                    atoms: 1_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'SEND',
                                    tokenId: tokenIdThisAction,
                                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                                },
                                {
                                    type: 'MINT',
                                    tokenId: tokenIdThisAction,
                                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                                },
                            ] as payment.TokenAction[],
                        },
                        [
                            {
                                ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE.token,
                                    tokenId: tokenIdThisAction,
                                    atoms: 1_000_000_000n,
                                } as Token,
                            },
                        ],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `ecash-wallet does not support minting and sending the same token in the same Action. tokenActions MINT and SEND ${tokenIdThisAction}.`,
                );
            });
            it('Throws if action exceeds SLP_TOKEN_TYPE_FUNGIBLE max outputs per tx', () => {
                const tokenIdThisAction = `11`.repeat(32);
                const atomsPerOutput = 1_000n;
                const tooManySendOutputs = Array(SLP_MAX_SEND_OUTPUTS + 1).fill(
                    {
                        sats: 546n,
                        tokenId: tokenIdThisAction,
                        atoms: atomsPerOutput,
                        script: DUMMY_SCRIPT,
                        isMintBaton: false,
                    },
                );
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [{ sats: 0n }, ...tooManySendOutputs],
                            tokenActions: [
                                {
                                    type: 'SEND',
                                    tokenId: tokenIdThisAction,
                                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                                },
                            ] as payment.TokenAction[],
                        },
                        [
                            {
                                ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE.token,
                                    tokenId: tokenIdThisAction,
                                    /** Exactly specify outputs so no change output is added */
                                    atoms:
                                        BigInt(SLP_MAX_SEND_OUTPUTS + 1) *
                                        atomsPerOutput,
                                } as Token,
                            },
                        ],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `An SLP SLP_TOKEN_TYPE_FUNGIBLE Action may not have more than ${SLP_MAX_SEND_OUTPUTS} token outputs, and no outputs may be at outIdx > ${SLP_MAX_SEND_OUTPUTS}. Found output at outIdx 20.`,
                );
            });
            it('Throws if generating a token change output will cause us to exceed SLP_TOKEN_TYPE_FUNGIBLE max outputs per tx', () => {
                const tokenIdThisAction = `11`.repeat(32);
                // Fill it up with "just enough" outputs and no change expected
                const tooManySendOutputs = Array(SLP_MAX_SEND_OUTPUTS).fill({
                    sats: 546n,
                    tokenId: tokenIdThisAction,
                    atoms: 1_000_000n,
                    script: DUMMY_SCRIPT,
                    isMintBaton: false,
                });

                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [{ sats: 0n }, ...tooManySendOutputs],
                            tokenActions: [
                                {
                                    type: 'SEND',
                                    tokenId: tokenIdThisAction,
                                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                                },
                            ] as payment.TokenAction[],
                        },
                        [
                            {
                                ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE.token,
                                    tokenId: tokenIdThisAction,
                                    atoms: 1_000_000_000n,
                                } as Token,
                            },
                        ],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `Tx needs a token change output to avoid burning atoms of ${tokenIdThisAction}, but the token change output would be at outIdx 20 which is greater than the maximum allowed outIdx of ${SLP_MAX_SEND_OUTPUTS} for SLP_TOKEN_TYPE_FUNGIBLE.`,
                );
            });
            it('DOES NOT throw if output atoms exactly match input atoms at max outputs, so no change output is generated', () => {
                const tokenIdThisAction = `11`.repeat(32);
                // Fill it up with "just enough" outputs but requiredUtxos expect change
                const tooManySendOutputs = Array(SLP_MAX_SEND_OUTPUTS).fill({
                    sats: 546n,
                    tokenId: tokenIdThisAction,
                    atoms: 1_000_000n,
                    script: DUMMY_SCRIPT,
                    isMintBaton: false,
                });

                const testAction = {
                    outputs: [{ sats: 0n }, ...tooManySendOutputs],
                    tokenActions: [
                        {
                            type: 'SEND',
                            tokenId: tokenIdThisAction,
                            tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                        },
                    ] as payment.TokenAction[],
                };

                const result = finalizeOutputs(
                    testAction,
                    [
                        {
                            ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE,
                            token: {
                                ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE.token,
                                tokenId: tokenIdThisAction,
                                atoms:
                                    BigInt(SLP_MAX_SEND_OUTPUTS) * 1_000_000n,
                            } as Token,
                        },
                    ],
                    DUMMY_CHANGE_SCRIPT,
                );

                // No error thrown
                expect(result).to.equal(undefined);

                // No outputs added (+1 for the OP_RETURN 0-index output)
                expect(testAction.outputs.length).to.equal(
                    SLP_MAX_SEND_OUTPUTS + 1,
                );
            });
            it('DOES NOT throw and adds change if adding change does not push us over the output limit', () => {
                const tokenIdThisAction = `11`.repeat(32);
                // Fill it with enough outputs so that 1 change output puts us at the max
                const tooManySendOutputs = Array(SLP_MAX_SEND_OUTPUTS - 1).fill(
                    {
                        sats: 546n,
                        tokenId: tokenIdThisAction,
                        atoms: 1_000_000n,
                        script: DUMMY_SCRIPT,
                        isMintBaton: false,
                    },
                );

                const testAction = {
                    outputs: [{ sats: 0n }, ...tooManySendOutputs],
                    tokenActions: [
                        {
                            type: 'SEND',
                            tokenId: tokenIdThisAction,
                            tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                        },
                    ] as payment.TokenAction[],
                };

                const outputsLengthBeforeChange = testAction.outputs.length;
                expect(outputsLengthBeforeChange).to.equal(19);

                const expectedChangeAtoms = 55n;

                const result = finalizeOutputs(
                    testAction,
                    [
                        {
                            ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE,
                            token: {
                                ...DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE.token,
                                tokenId: tokenIdThisAction,
                                atoms:
                                    BigInt(SLP_MAX_SEND_OUTPUTS - 1) *
                                        1_000_000n +
                                    expectedChangeAtoms,
                            } as Token,
                        },
                    ],
                    DUMMY_CHANGE_SCRIPT,
                );

                // No error thrown
                expect(result).to.equal(undefined);

                // An output is added
                expect(testAction.outputs.length).to.equal(
                    outputsLengthBeforeChange + 1,
                );

                // The OP_RETURN has been written
                const opReturn = testAction.outputs[0].script.toHex();
                expect(opReturn).to.equal(
                    `6a04534c500001010453454e442011111111111111111111111111111111111111111111111111111111111111110800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f42400800000000000f4240080000000000000037`,
                );

                // The last token output is the change output; it has expected atoms
                expect(BigInt(parseInt(opReturn.slice(-2), 16))).to.equal(
                    expectedChangeAtoms,
                );
            });
            it('Throws if genesisAction does not include mint qty at outIdx 1', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Baton is at outIdx 1
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    atoms: 0n,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: true,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'GENESIS',
                                    tokenType:
                                        TOKEN_TYPE_SLP_TOKEN_TYPE_FUNGIBLE,
                                    genesisInfo: nullGenesisInfo,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'Genesis action for SLP_TOKEN_TYPE_FUNGIBLE token specified, but no mint quantity output found at outIdx 1. This is a spec requirement for SLP SLP_TOKEN_TYPE_FUNGIBLE tokens.',
                );
            });
            it('Throws if MINT action does not include mint qty at outIdx 1', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Non-genesis mint baton output is at outIdx 1
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    tokenId: '11'.repeat(32),
                                    atoms: 0n,
                                    isMintBaton: true,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'MINT',
                                    tokenId: '11'.repeat(32),
                                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `Mint action for SLP_TOKEN_TYPE_FUNGIBLE token specified, but no mint quantity output found at outIdx 1. This is a spec requirement for SLP SLP_TOKEN_TYPE_FUNGIBLE tokens.`,
                );
            });
            it('Throws if genesisAction includes more than one mint baton', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Mint qty output at outIdx 1, per spec
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    atoms: 10n,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: false,
                                },
                                // Mint baton output is at outIdx 2
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    atoms: 0n,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: true,
                                },
                                // Another mint baton output is at outIdx 3
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    atoms: 0n,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: true,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'GENESIS',
                                    tokenType:
                                        TOKEN_TYPE_SLP_TOKEN_TYPE_FUNGIBLE,
                                    genesisInfo: nullGenesisInfo,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `An SLP_TOKEN_TYPE_FUNGIBLE GENESIS tx may only specify exactly 1 mint baton. Found second mint baton at outIdx 3.`,
                );
            });
            it('Throws if genesisAction includes more than one mint qty output', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Mint qty output at outIdx 1, per spec
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    atoms: 10n,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: false,
                                },
                                // Mint baton output is at outIdx 2
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    atoms: 0n,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: true,
                                },
                                // Another mint qty output
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    atoms: 10n,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: false,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'GENESIS',
                                    tokenType:
                                        TOKEN_TYPE_SLP_TOKEN_TYPE_FUNGIBLE,
                                    genesisInfo: nullGenesisInfo,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `An SLP_TOKEN_TYPE_FUNGIBLE GENESIS tx may have only one mint qty output and it must be at outIdx 1. Found another mint qty output at outIdx 3.`,
                );
            });
            it('Throws if MINT action includes more than 1 mint baton', () => {
                const tokenIdThisAction = `11`.repeat(32);
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Mint qty output at outIdx 1, per spec
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    tokenId: tokenIdThisAction,
                                    atoms: 10n,
                                    isMintBaton: false,
                                },
                                // Non-genesis mint baton output is at outIdx 2
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    tokenId: tokenIdThisAction,
                                    atoms: 0n,
                                    isMintBaton: true,
                                },
                                // Another non-genesis mint baton output is at outIdx 3
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    tokenId: tokenIdThisAction,
                                    atoms: 0n,
                                    isMintBaton: true,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'MINT',
                                    tokenId: tokenIdThisAction,
                                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `An SLP_TOKEN_TYPE_FUNGIBLE MINT tx may only specify exactly 1 mint baton. Found second mint baton at outIdx 3.`,
                );
            });
            it('Throws if MINT action includes more than 1 mint qty', () => {
                const tokenIdThisAction = `11`.repeat(32);
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Mint qty output at outIdx 1, per spec
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    tokenId: tokenIdThisAction,
                                    atoms: 10n,
                                    isMintBaton: false,
                                },
                                // Non-genesis mint baton output is at outIdx 2
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    tokenId: tokenIdThisAction,
                                    atoms: 0n,
                                    isMintBaton: true,
                                },
                                // Another mint qty output
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    tokenId: tokenIdThisAction,
                                    atoms: 10n,
                                    isMintBaton: false,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'MINT',
                                    tokenId: tokenIdThisAction,
                                    tokenType: SLP_TOKEN_TYPE_FUNGIBLE,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `An SLP_TOKEN_TYPE_FUNGIBLE MINT tx may have only one mint qty output and it must be at outIdx 1. Found another mint qty output at outIdx 3.`,
                );
            });
            it('Throws if genesisAction includes mint baton at first output index', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                {
                                    sats: 546n,
                                    script: DUMMY_SCRIPT,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: true,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'GENESIS',
                                    tokenType:
                                        TOKEN_TYPE_SLP_TOKEN_TYPE_FUNGIBLE,
                                    genesisInfo: nullGenesisInfo,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_SLP_TOKEN_TYPE_FUNGIBLE],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    'Genesis action for SLP_TOKEN_TYPE_FUNGIBLE token specified, but no mint quantity output found at outIdx 1. This is a spec requirement for SLP SLP_TOKEN_TYPE_FUNGIBLE tokens.',
                );
            });
        });
        context('ALP_TOKEN_TYPE_STANDARD', () => {
            it('Throws if we have SEND and MINT actions associated with the same tokenId', () => {
                const tokenIdThisAction = `11`.repeat(32);
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Send output
                                {
                                    sats: 546n,
                                    tokenId: tokenIdThisAction,
                                    atoms: 1_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                                // Mint output
                                {
                                    sats: 546n,
                                    tokenId: tokenIdThisAction,
                                    atoms: 1_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'SEND',
                                    tokenId: tokenIdThisAction,
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                                {
                                    type: 'MINT',
                                    tokenId: tokenIdThisAction,
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                            ] as payment.TokenAction[],
                        },
                        [
                            {
                                ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                                    tokenId: tokenIdThisAction,
                                    atoms: 1_000_000_000n,
                                } as Token,
                            },
                        ],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `ecash-wallet does not support minting and sending the same token in the same Action. tokenActions MINT and SEND ${tokenIdThisAction}.`,
                );
            });
            it('Does not throw if we have SEND and MINT actions associated with different tokenIds', () => {
                expect(
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Send output
                                {
                                    sats: 546n,
                                    tokenId: '11'.repeat(32),
                                    atoms: 1_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                                // Mint output of a different token
                                {
                                    sats: 546n,
                                    tokenId: '22'.repeat(32),
                                    atoms: 1_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'SEND',
                                    tokenId: '11'.repeat(32),
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                                {
                                    type: 'MINT',
                                    tokenId: '22'.repeat(32),
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                            ] as payment.TokenAction[],
                        },
                        [
                            {
                                ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                                    tokenId: '11'.repeat(32),
                                    atoms: 1_000_000_000n,
                                } as Token,
                            },
                        ],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.equal(undefined);
            });
            it('Throws if action exceeds ALP_POLICY_MAX_OUTPUTS max outputs per tx', () => {
                const tokenIdThisAction = `11`.repeat(32);
                const tooManySendOutputs = Array(
                    ALP_POLICY_MAX_OUTPUTS + 1,
                ).fill({
                    sats: 546n,
                    tokenId: tokenIdThisAction,
                    atoms: 1_000_000n,
                    script: DUMMY_SCRIPT,
                    isMintBaton: false,
                });
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [{ sats: 0n }, ...tooManySendOutputs],
                            tokenActions: [
                                {
                                    type: 'SEND',
                                    tokenId: tokenIdThisAction,
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                            ] as payment.TokenAction[],
                        },
                        [
                            {
                                ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                                    tokenId: '11'.repeat(32),
                                    atoms:
                                        BigInt(ALP_POLICY_MAX_OUTPUTS + 1) *
                                        1_000_000n,
                                } as Token,
                            },
                        ],

                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `An ALP ALP_TOKEN_TYPE_STANDARD Action may not have more than ${ALP_POLICY_MAX_OUTPUTS} token outputs, and no outputs may be at outIdx > ${ALP_POLICY_MAX_OUTPUTS}. Found output at outIdx 30.`,
                );
            });
            it('Throws if action has non-consecutive MINT mint batons for a tokenId', () => {
                const tokenIdThisAction = `11`.repeat(32);

                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Mint baton
                                {
                                    sats: 546n,
                                    tokenId: tokenIdThisAction,
                                    atoms: 0n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: true,
                                },
                                // Normal XEC output
                                { sats: 1_000n, script: DUMMY_SCRIPT },
                                // Non-consecutive mint baton
                                {
                                    sats: 546n,
                                    tokenId: tokenIdThisAction,
                                    atoms: 0n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: true,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'MINT',
                                    tokenId: tokenIdThisAction,
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `An ALP ALP_TOKEN_TYPE_STANDARD Action may only have consecutive mint baton outputs for the same tokenId. Found non-consecutive mint baton output at outIdx 3 for tokenId ${tokenIdThisAction}.`,
                );
            });
            it('Throws if action has non-consecutive GENESIS mint batons for a tokenId', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Mint baton
                                {
                                    sats: 546n,
                                    atoms: 0n,
                                    script: DUMMY_SCRIPT,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: true,
                                },
                                // Normal XEC output
                                { sats: 1_000n, script: DUMMY_SCRIPT },
                                // Non-consecutive mint baton
                                {
                                    sats: 546n,
                                    atoms: 0n,
                                    script: DUMMY_SCRIPT,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: true,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'GENESIS',
                                    tokenType:
                                        TOKEN_TYPE_ALP_TOKEN_TYPE_STANDARD,
                                    genesisInfo: nullGenesisInfo,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `An ALP ALP_TOKEN_TYPE_STANDARD Action may only have consecutive mint baton outputs for the same tokenId. Found non-consecutive mint baton output at outIdx 3 for GENESIS action.`,
                );
            });
            it('Throws if action has mint qty outputs at higher outIdx than mint batons for the same tokenId', () => {
                const tokenIdThisAction = `11`.repeat(32);

                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Mint baton
                                {
                                    sats: 546n,
                                    tokenId: tokenIdThisAction,
                                    atoms: 0n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: true,
                                },
                                // mint qty
                                {
                                    sats: 546n,
                                    tokenId: tokenIdThisAction,
                                    atoms: 10n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'MINT',
                                    tokenId: tokenIdThisAction,
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `For a given tokenId, an ALP ALP_TOKEN_TYPE_STANDARD Action may not have mint qty outputs at a higher outIdx than mint baton outputs. Mint qty output for a tokenId with preceding mint batons found at outIdx 2.`,
                );
            });
            it('Throws if action has mint qty outputs at higher outIdx than mint batons for a GENESIS action', () => {
                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [
                                { sats: 0n },
                                // Mint baton
                                {
                                    sats: 546n,
                                    atoms: 0n,
                                    script: DUMMY_SCRIPT,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: true,
                                },
                                // mint qty
                                {
                                    sats: 546n,
                                    atoms: 10n,
                                    script: DUMMY_SCRIPT,
                                    tokenId:
                                        payment.GENESIS_TOKEN_ID_PLACEHOLDER,
                                    isMintBaton: false,
                                },
                            ],
                            tokenActions: [
                                {
                                    type: 'GENESIS',
                                    tokenType:
                                        TOKEN_TYPE_ALP_TOKEN_TYPE_STANDARD,
                                    genesisInfo: nullGenesisInfo,
                                },
                            ] as payment.TokenAction[],
                        },
                        [DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `For a given tokenId, an ALP ALP_TOKEN_TYPE_STANDARD Action may not have mint qty outputs at a higher outIdx than mint baton outputs. Mint qty output for GENESIS action with preceding mint batons found at outIdx 2.`,
                );
            });
            it('Does not throw for a complex but on-spec ALP tx', () => {
                expect(
                    finalizeOutputs(
                        {
                            outputs: [
                                // OP_RETURN placeholder
                                { sats: 0n },
                                // Send output
                                {
                                    sats: 546n,
                                    tokenId: '11'.repeat(32),
                                    atoms: 1_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                                // Mint output of a different token
                                {
                                    sats: 546n,
                                    tokenId: '22'.repeat(32),
                                    atoms: 1_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                                // Another send output of the first token
                                {
                                    sats: 546n,
                                    tokenId: '11'.repeat(32),
                                    atoms: 2_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                                // A non-consecutive mint qty of the minting token
                                {
                                    sats: 546n,
                                    tokenId: '22'.repeat(32),
                                    atoms: 2_000_000n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: false,
                                },
                                // A normal XEC send output
                                { sats: 10_000_000n, script: DUMMY_SCRIPT },
                                // A mint baton of the minting token
                                {
                                    sats: 546n,
                                    tokenId: '22'.repeat(32),
                                    atoms: 0n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: true,
                                },
                                // A consecutive mint baton of the minting token
                                {
                                    sats: 546n,
                                    tokenId: '22'.repeat(32),
                                    atoms: 0n,
                                    script: DUMMY_SCRIPT,
                                    isMintBaton: true,
                                },
                                // A normal XEC send output
                                { sats: 10_000_000n, script: DUMMY_SCRIPT },

                                // A normal XEC send output
                                { sats: 10_000_000n, script: DUMMY_SCRIPT },
                            ],
                            tokenActions: [
                                {
                                    type: 'SEND',
                                    tokenId: '11'.repeat(32),
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                                {
                                    type: 'MINT',
                                    tokenId: '22'.repeat(32),
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                            ] as payment.TokenAction[],
                        },
                        [
                            DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                            {
                                ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                                    tokenId: '11'.repeat(32),
                                    atoms: 1_000_000_000n,
                                } as Token,
                            },
                            {
                                ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                                    tokenId: '22'.repeat(32),
                                    atoms: 1_000_000_000n,
                                } as Token,
                            },
                        ],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.equal(undefined);
            });
            it('Throws if generating a token change output will cause us to exceed ALP_TOKEN_TYPE_STANDARD max outputs per tx', () => {
                const tokenIdThisAction = `11`.repeat(32);
                // Fill with max outputs, change will push it over the limit
                const tooManySendOutputs = Array(ALP_POLICY_MAX_OUTPUTS).fill({
                    sats: 546n,
                    tokenId: tokenIdThisAction,
                    atoms: 1_000_000n,
                    script: DUMMY_SCRIPT,

                    isMint: false,
                    isMintBaton: false,
                });

                expect(() =>
                    finalizeOutputs(
                        {
                            outputs: [{ sats: 0n }, ...tooManySendOutputs],
                            tokenActions: [
                                {
                                    type: 'SEND',
                                    tokenId: tokenIdThisAction,
                                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                                },
                            ] as payment.TokenAction[],
                        },
                        [
                            {
                                ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                                    tokenId: tokenIdThisAction,
                                    atoms: 1_000_000_000n,
                                } as Token,
                            },
                        ],
                        DUMMY_CHANGE_SCRIPT,
                    ),
                ).to.throw(
                    Error,
                    `Tx needs a token change output to avoid burning atoms of ${tokenIdThisAction}, but the token change output would be at outIdx 30 which is greater than the maximum allowed outIdx of ${ALP_POLICY_MAX_OUTPUTS} for ALP_TOKEN_TYPE_STANDARD.`,
                );
            });
            it('DOES NOT throw if output atoms exactly match input atoms at max outputs, so no change output is generated', () => {
                const tokenIdThisAction = `11`.repeat(32);
                // Fill it up with "just enough" outputs but requiredUtxos expect change
                const tooManySendOutputs = Array(ALP_POLICY_MAX_OUTPUTS).fill({
                    sats: 546n,
                    tokenId: tokenIdThisAction,
                    atoms: 1_000_000n,
                    script: DUMMY_SCRIPT,

                    isMint: false,
                    isMintBaton: false,
                });

                const testAction = {
                    outputs: [{ sats: 0n }, ...tooManySendOutputs],
                    tokenActions: [
                        {
                            type: 'SEND',
                            tokenId: tokenIdThisAction,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                    ] as payment.TokenAction[],
                };

                const result = finalizeOutputs(
                    testAction,
                    [
                        {
                            ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                            token: {
                                ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                                tokenId: tokenIdThisAction,
                                // So no change expected
                                atoms:
                                    BigInt(ALP_POLICY_MAX_OUTPUTS) * 1_000_000n,
                            } as Token,
                        },
                    ],
                    DUMMY_CHANGE_SCRIPT,
                );

                // No error thrown
                expect(result).to.equal(undefined);

                // No outputs added (+1 for the OP_RETURN 0-index output)
                expect(testAction.outputs.length).to.equal(
                    ALP_POLICY_MAX_OUTPUTS + 1,
                );
            });
            it('DOES NOT throw and adds change for MULTIPLE TOKENS if adding change does not push us over the output limit', () => {
                const tokenIdFirstSend = `11`.repeat(32);
                const tokenIdSecondSend = `22`.repeat(32);
                // Fill it with enough outputs so that 1 change output puts us at the max
                // Note that, when we have two tokens, this is not 29
                const firstSendOutputs = Array(4).fill({
                    sats: 546n,
                    tokenId: tokenIdFirstSend,
                    atoms: 1_000_000n,
                    script: DUMMY_SCRIPT,
                    isMintBaton: false,
                });
                const secondSendOutputs = Array(5).fill({
                    sats: 546n,
                    tokenId: tokenIdSecondSend,
                    atoms: 1_000_000n,
                    script: DUMMY_SCRIPT,
                    isMintBaton: false,
                });

                const testAction = {
                    outputs: [
                        { sats: 0n },
                        ...firstSendOutputs,
                        ...secondSendOutputs,
                    ],
                    tokenActions: [
                        {
                            type: 'SEND',
                            tokenId: tokenIdFirstSend,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                        {
                            type: 'SEND',
                            tokenId: tokenIdSecondSend,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                    ] as payment.TokenAction[],
                };

                const outputsLengthBeforeChange = testAction.outputs.length;
                expect(outputsLengthBeforeChange).to.equal(
                    1 + firstSendOutputs.length + secondSendOutputs.length,
                );

                const expectedChangeAtomsFirstToken = 55n;
                const expectedChangeAtomsSecondToken = 66n;

                const result = finalizeOutputs(
                    testAction,
                    [
                        {
                            ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                            token: {
                                ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                                tokenId: tokenIdFirstSend,
                                atoms:
                                    BigInt(firstSendOutputs.length) *
                                        1_000_000n +
                                    expectedChangeAtomsFirstToken,
                            } as Token,
                        },
                        {
                            ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                            token: {
                                ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                                tokenId: tokenIdSecondSend,
                                atoms:
                                    BigInt(secondSendOutputs.length) *
                                        1_000_000n +
                                    expectedChangeAtomsSecondToken,
                            } as Token,
                        },
                    ],
                    DUMMY_CHANGE_SCRIPT,
                );

                // No error thrown
                expect(result).to.equal(undefined);

                // Two outputs are added
                expect(testAction.outputs.length).to.equal(
                    outputsLengthBeforeChange + 2,
                );

                // We get the expected EMPP OP_RETURN
                expect(testAction.outputs[0].script.toHex()).to.equal(
                    `6a504c67534c5032000453454e4411111111111111111111111111111111111111111111111111111111111111110a40420f00000040420f00000040420f00000040420f0000000000000000000000000000000000000000000000000000000000000000003700000000004c6d534c5032000453454e4422222222222222222222222222222222222222222222222222222222222222220b00000000000000000000000000000000000000000000000040420f00000040420f00000040420f00000040420f00000040420f000000000000000000420000000000`,
                );
            });
            it('Throws if outputs are below ALP de facto max but OP_RETURN is above 223 bytes', () => {
                const burnAtomsFirstSend = 1n;
                const burnAtomsSecondSend = 2n;
                const tokenIdFirstSend = `11`.repeat(32);
                const tokenIdSecondSend = `22`.repeat(32);
                // Fill it with enough outputs so that 1 change output puts us at the max
                const firstSendOutputs = Array(5).fill({
                    sats: 546n,
                    tokenId: tokenIdFirstSend,
                    atoms: 1_000_000n,
                    script: DUMMY_SCRIPT,

                    isMint: false,
                    isMintBaton: false,
                });
                const secondSendOutputs = Array(5).fill({
                    sats: 546n,
                    tokenId: tokenIdSecondSend,
                    atoms: 1_000_000n,
                    script: DUMMY_SCRIPT,

                    isMint: false,
                    isMintBaton: false,
                });

                const testAction = {
                    outputs: [
                        { sats: 0n },
                        ...firstSendOutputs,
                        ...secondSendOutputs,
                    ],
                    tokenActions: [
                        {
                            type: 'SEND',
                            tokenId: tokenIdFirstSend,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                        {
                            type: 'SEND',
                            tokenId: tokenIdSecondSend,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                        {
                            type: 'BURN',
                            tokenId: tokenIdFirstSend,
                            burnAtoms: burnAtomsFirstSend,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                        {
                            type: 'BURN',
                            tokenId: tokenIdSecondSend,
                            burnAtoms: burnAtomsSecondSend,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                    ] as payment.TokenAction[],
                };

                const outputsLengthBeforeChange = testAction.outputs.length;
                expect(outputsLengthBeforeChange).to.equal(
                    1 + firstSendOutputs.length + secondSendOutputs.length,
                );

                const expectedChangeAtomsFirstToken = 55n;
                const expectedChangeAtomsSecondToken = 66n;

                const mockChangeScript = MOCK_DESTINATION_SCRIPT;
                expect(() =>
                    finalizeOutputs(
                        testAction,
                        [
                            {
                                ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                                    tokenId: tokenIdFirstSend,
                                    atoms:
                                        BigInt(firstSendOutputs.length) *
                                            1_000_000n +
                                        expectedChangeAtomsFirstToken,
                                } as Token,
                            },
                            {
                                ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                                token: {
                                    ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                                    tokenId: tokenIdSecondSend,
                                    atoms:
                                        BigInt(secondSendOutputs.length) *
                                            1_000_000n +
                                        expectedChangeAtomsSecondToken,
                                } as Token,
                            },
                        ],
                        mockChangeScript,
                    ),
                ).to.throw(
                    Error,
                    `Specified action results in OP_RETURN of 328 bytes, vs max allowed of 223.`,
                );
            });
            it('DOES NOT throw and adds adjusted change if BURN is specified and tx is otherwise valid, for 2 tokens', () => {
                const burnAtomsTokenOne = 1n;
                const burnAtomsTokenTwo = 2n;
                const tokenOne = `11`.repeat(32);
                const tokenTwo = `22`.repeat(32);
                // We will automatically generate an output as change for intentional burn
                const tokenOneOutputs: payment.PaymentOutput[] = [];
                const tokenTwoOutputs = [
                    {
                        sats: 546n,
                        tokenId: tokenTwo,
                        atoms: 1_000_000n,
                        script: DUMMY_SCRIPT,
                        isMintBaton: false,
                    },
                ];

                const testAction = {
                    outputs: [
                        { sats: 0n },
                        ...tokenOneOutputs,
                        ...tokenTwoOutputs,
                    ],
                    tokenActions: [
                        {
                            type: 'SEND',
                            tokenId: tokenOne,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        } as payment.SendAction,
                        {
                            type: 'SEND',
                            tokenId: tokenTwo,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        } as payment.SendAction,
                        {
                            type: 'BURN',
                            tokenId: tokenOne,
                            burnAtoms: burnAtomsTokenOne,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        } as payment.BurnAction,
                        {
                            type: 'BURN',
                            tokenId: tokenTwo,
                            burnAtoms: burnAtomsTokenTwo,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        } as payment.BurnAction,
                    ],
                };

                const outputsLengthBeforeChange = testAction.outputs.length;
                expect(outputsLengthBeforeChange).to.equal(
                    1 + tokenOneOutputs.length + tokenTwoOutputs.length,
                );

                const expectedChangeAtomsFirstToken = 55n;
                const expectedChangeAtomsSecondToken = 66n;

                const mockChangeScript = MOCK_DESTINATION_SCRIPT;

                const testUtxos = [
                    {
                        ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                        token: {
                            ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                            tokenId: tokenOne,
                            atoms:
                                BigInt(tokenOneOutputs.length) * 1_000_000n +
                                expectedChangeAtomsFirstToken,
                        } as Token,
                    },
                    {
                        ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD,
                        token: {
                            ...DUMMY_TOKEN_UTXO_ALP_TOKEN_TYPE_STANDARD.token,
                            tokenId: tokenTwo,
                            atoms:
                                BigInt(tokenTwoOutputs.length) * 1_000_000n +
                                expectedChangeAtomsSecondToken,
                        } as Token,
                    },
                ];

                const result = finalizeOutputs(
                    testAction,
                    testUtxos,
                    mockChangeScript,
                );

                // No error thrown
                expect(result).to.equal(undefined);

                // Two outputs are added
                expect(testAction.outputs.length).to.equal(
                    outputsLengthBeforeChange + 2,
                );

                const ALP_SEND = '53454e44';
                const ALP_BURN = '4255524e';

                // NB we do not parse this EMPP string to find the appropriate change values
                // This behavior is confirmed in transactions.test.ts
                const opReturnHex = testAction.outputs[0].script?.toHex();
                const sendOneEmpp = `37534c50320004${ALP_SEND}${tokenOne}02000000000000360000000000`;
                const sendTwoEmpp = `3d534c50320004${ALP_SEND}${tokenTwo}0340420f000000000000000000400000000000`;
                const burnOneEmpp = `30534c50320004${ALP_BURN}${tokenOne}010000000000`;
                const burnTwoEmpp = `30534c50320004${ALP_BURN}${tokenTwo}020000000000`;

                expect(opReturnHex).to.equal(
                    `6a` +
                        `50` +
                        sendOneEmpp +
                        sendTwoEmpp +
                        burnOneEmpp +
                        burnTwoEmpp,
                );

                // We can change the order of EMPP pushes by changing the order of tokenActions
                const testActionsRearranged = {
                    outputs: [
                        { sats: 0n },
                        ...tokenOneOutputs,
                        ...tokenTwoOutputs,
                    ],
                    tokenActions: [
                        {
                            type: 'BURN',
                            tokenId: tokenTwo,
                            burnAtoms: burnAtomsTokenTwo,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        } as payment.BurnAction,
                        {
                            type: 'SEND',
                            tokenId: tokenOne,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        } as payment.SendAction,
                        {
                            type: 'BURN',
                            tokenId: tokenOne,
                            burnAtoms: burnAtomsTokenOne,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        } as payment.BurnAction,
                        {
                            type: 'SEND',
                            tokenId: tokenTwo,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        } as payment.SendAction,
                    ],
                };

                finalizeOutputs(
                    testActionsRearranged,
                    testUtxos,
                    mockChangeScript,
                );
                const opReturnHexRearranged =
                    testActionsRearranged.outputs[0].script?.toHex();

                // EMPP order matches user-specified ordering in tokenActions
                expect(opReturnHexRearranged).to.equal(
                    `6a` +
                        `50` +
                        burnTwoEmpp +
                        sendOneEmpp +
                        burnOneEmpp +
                        sendTwoEmpp,
                );
            });
        });
    });
});

describe('static methods', () => {
    context('Can sum value of utxos', () => {
        it('Returns 0 if called with no utxos', () => {
            expect(Wallet.sumUtxosSats([])).to.equal(0n);
        });
        it('Can get total eCash satoshis held by all kinds of utxos', () => {
            expect(Wallet.sumUtxosSats(ALL_SUPPORTED_UTXOS)).to.equal(
                93751638n,
            );
        });
    });
});
