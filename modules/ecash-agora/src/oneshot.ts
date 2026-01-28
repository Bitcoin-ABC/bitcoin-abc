// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    ALL_ANYONECANPAY_BIP143,
    ALL_BIP143,
    Bytes,
    DEFAULT_DUST_SATS,
    DEFAULT_FEE_SATS_PER_KB,
    Ecc,
    OP_0,
    OP_1,
    OP_2,
    OP_3DUP,
    OP_CAT,
    OP_CHECKDATASIGVERIFY,
    OP_CHECKSIG,
    OP_CHECKSIGVERIFY,
    OP_CODESEPARATOR,
    OP_DROP,
    OP_ELSE,
    OP_ENDIF,
    OP_EQUAL,
    OP_EQUALVERIFY,
    OP_HASH256,
    OP_IF,
    OP_NIP,
    OP_NUM2BIN,
    OP_OVER,
    OP_ROT,
    OP_SHA256,
    OP_SPLIT,
    OP_SWAP,
    Script,
    shaRmd160,
    slpSend,
    SLP_NFT1_CHILD,
    SLP_TOKEN_TYPE_NFT1_CHILD,
    Tx,
    TxBuilder,
    TxBuilderOutput,
    TxOutput,
    UnsignedTxInput,
    Writer,
    WriterBytes,
    WriterLength,
    flagSignature,
    isPushOp,
    payment,
    pushBytesOp,
    readTxOutput,
    sha256d,
    strToBytes,
    writeTxOutput,
} from 'ecash-lib';
import { BuiltAction, Wallet } from 'ecash-wallet';
import { AGORA_LOKAD_ID } from './consts.js';
import { getAgoraAdFuelSats } from './inputs.js';

/**
 * Agora offer that has to be accepted in "one shot", i.e. all or nothing.
 * This is useful for offers that offer exactly 1 token, especially NFTs.
 *
 * The covenant is reasonably simple, see
 * https://read.cash/@pein/bch-covenants-with-spedn-4a980ed3 for an explanation of the
 * covenant mechanism, but uses two optimizations:
 * 1. It uses ANYONECANPAY as sighash for the "accept" path, which makes the sighash
 *    preimage start with `1000....00000`, which can be created with
 *    `OP_1 68 OP_NUM2BIN`, saving around 64 bytes.
 * 2. It uses OP_CODESEPARATOR before the OP_CHECKSIG, which cuts out the entire script
 *    code, leaving only the OP_CHECKSIG behind. The scriptCode part in the BIP143
 *    sighash now just becomes `01ac`, which is both easier to deal with in the OP_SPLIT
 *    and also saves 100 bytes or so (depending on the enforced outputs).
 **/
export class AgoraOneshot {
    public static COVENANT_VARIANT = 'ONESHOT';

    public enforcedOutputs: TxOutput[];
    public cancelPk: Uint8Array;

    constructor({
        enforcedOutputs,
        cancelPk,
    }: {
        enforcedOutputs: TxOutput[];
        cancelPk: Uint8Array;
    }) {
        this.enforcedOutputs = enforcedOutputs;
        this.cancelPk = cancelPk;
    }

    /** Build the Script enforcing the Agora offer covenant. */
    public script(): Script {
        const serEnforcedOutputs = (writer: Writer) => {
            for (const output of this.enforcedOutputs) {
                writeTxOutput(output, writer);
            }
        };
        const writerLength = new WriterLength();
        serEnforcedOutputs(writerLength);
        const writer = new WriterBytes(writerLength.length);
        serEnforcedOutputs(writer);
        const enforcedOutputsSer = writer.data;

        return Script.fromOps([
            OP_IF, // if is_accept

            pushBytesOp(enforcedOutputsSer), // push enforced_outputs
            OP_SWAP, // swap buyer_outputs, enforced_outputs
            OP_CAT, // outputs = OP_CAT(enforced_outputs, buyer_outputs)
            OP_HASH256, // expected_hash_outputs = OP_HASH256(outputs)

            OP_OVER, // duplicate preimage_4_10,
            // push hash_outputs_idx:
            pushBytesOp(
                new Uint8Array([
                    36 + // 4. outpoint
                        2 + // 5. scriptCode, truncated to 01ac via OP_CODESEPARATOR
                        8 + // 6. value
                        4, // 7. sequence
                ]),
            ),
            OP_SPLIT, // split into preimage_4_7 and preimage_8_10
            OP_NIP, // remove preimage_4_7
            pushBytesOp(new Uint8Array([32])), // push 32 onto the stack
            OP_SPLIT, // split into actual_hash_outputs and preimage_9_10
            OP_DROP, // drop preimage_9_10

            OP_EQUALVERIFY, // expected_hash_outputs === actual_hash_outputs
            OP_2, // push tx version
            // length of BIP143 preimage parts 1 to 3
            pushBytesOp(new Uint8Array([4 + 32 + 32])),
            // build BIP143 preimage parts 1 to 3 for ANYONECANPAY using OP_NUM2BIN
            OP_NUM2BIN,
            OP_SWAP, // swap preimage_4_10 and preimage_1_3
            OP_CAT, // preimage = OP_CAT(preimage_1_3, preimage_4_10)
            OP_SHA256, // preimage_sha256 = OP_SHA256(preimage)
            OP_3DUP, // OP_3DUP(covenant_pk, covenant_sig, preimage_sha256)
            OP_ROT, // -> covenant_sig | preimage_sha256 | covenant_pk
            OP_CHECKDATASIGVERIFY, // verify preimage matches covenant_sig
            OP_DROP, // drop preimage_sha256
            // push ALL|ANYONECANPAY|BIP143 onto the stack
            pushBytesOp(new Uint8Array([ALL_ANYONECANPAY_BIP143.toInt()])),
            OP_CAT, // append sighash flags onto covenant_sig
            OP_SWAP, // swap covenant_pk, covenant_sig_flagged

            OP_ELSE, // cancel path

            pushBytesOp(this.cancelPk), // pubkey that can cancel the covenant

            OP_ENDIF,

            // cut out everything except the OP_CHECKSIG from the BIP143 scriptCode
            OP_CODESEPARATOR,
            OP_CHECKSIG,
        ]);
    }

    public static fromRedeemScript(
        redeemScript: Script,
        opreturnScript: Script,
    ): AgoraOneshot {
        const ops = redeemScript.ops();
        const outputsSerOp = ops.next();
        if (!isPushOp(outputsSerOp)) {
            throw new Error('Op 0 expected to be pushop for outputsSer');
        }
        if (ops.next() !== OP_DROP) {
            throw new Error('Op 1 expected to be OP_DROP');
        }
        const cancelPkOp = ops.next();
        if (!isPushOp(cancelPkOp)) {
            throw new Error('Op 2 expected to be pushop for cancelPk');
        }
        if (cancelPkOp.data.length != 33) {
            throw new Error(`Expected cancelPk to be 33 bytes`);
        }
        if (ops.next() !== OP_CHECKSIGVERIFY) {
            throw new Error('Op 3 expected to be OP_CHECKSIGVERIFY');
        }
        const covenantVariantOp = ops.next();
        if (!isPushOp(covenantVariantOp)) {
            throw new Error('Op 4 expected to be pushop for covenantVariant');
        }
        if (ops.next() !== OP_EQUALVERIFY) {
            throw new Error('Op 5 expected to be OP_EQUALVERIFY');
        }
        const lokadIdOp = ops.next();
        if (!isPushOp(lokadIdOp)) {
            throw new Error('Op 6 expected to be pushop for LOKAD ID');
        }
        const outputsSerBytes = new Bytes(outputsSerOp.data);
        const enforcedOutputs: TxOutput[] = [
            {
                sats: 0n,
                script: opreturnScript,
            },
        ];
        while (outputsSerBytes.data.length > outputsSerBytes.idx) {
            enforcedOutputs.push(readTxOutput(outputsSerBytes));
        }
        return new AgoraOneshot({
            enforcedOutputs,
            cancelPk: cancelPkOp.data,
        });
    }

    public adScript(): Script {
        const serOutputs = (writer: Writer) => {
            for (const output of this.enforcedOutputs.slice(1)) {
                writeTxOutput(output, writer);
            }
        };
        const writerLength = new WriterLength();
        serOutputs(writerLength);
        const writer = new WriterBytes(writerLength.length);
        serOutputs(writer);
        const outputsSer = writer.data;

        return Script.fromOps([
            pushBytesOp(outputsSer),
            OP_DROP,
            pushBytesOp(this.cancelPk),
            OP_CHECKSIGVERIFY,
            pushBytesOp(strToBytes(AgoraOneshot.COVENANT_VARIANT)),
            OP_EQUALVERIFY,
            pushBytesOp(AGORA_LOKAD_ID),
            OP_EQUAL,
        ]);
    }

    public askedSats(): bigint {
        return this.enforcedOutputs.reduce(
            (prev, output) => prev + output.sats,
            0n,
        );
    }

    /**
     * Build and broadcast a chained transaction to list an SLP NFT token.
     * This creates an "ad prep" transaction followed by the actual offer transaction.
     *
     * @param params - Parameters for listing the NFT
     * @returns Promise resolving to broadcast result
     * @throws Error if token type is not SLP NFT
     */
    public async list(params: {
        /**
         * An initialized Wallet from ecash-wallet.
         * This wallet must hold the NFT token to be listed.
         */
        wallet: Wallet;
        /**
         * Token ID of the NFT to list (in big-endian hex).
         */
        tokenId: string;
        /**
         * Token type - must be SLP_TOKEN_TYPE_NFT1_CHILD.
         */
        tokenType: typeof SLP_TOKEN_TYPE_NFT1_CHILD;
        /**
         * Dust amount to use for the token output.
         */
        dustSats?: bigint;
        /**
         * Fee per kB to use when building the tx.
         */
        feePerKb?: bigint;
    }): Promise<{
        success: boolean;
        broadcasted: string[];
        unbroadcasted?: string[];
        errors?: string[];
    }> {
        // Validate token type - only SLP NFT is supported
        if (params.tokenType.type !== 'SLP_TOKEN_TYPE_NFT1_CHILD') {
            throw new Error(
                'AgoraOneshot.list() only supports SLP NFT tokens (SLP_TOKEN_TYPE_NFT1_CHILD)',
            );
        }

        const dustSats = params.dustSats ?? DEFAULT_DUST_SATS;
        const feePerKb = params.feePerKb ?? DEFAULT_FEE_SATS_PER_KB;

        // Build the ad script and P2SH address
        const agoraAdScript = this.adScript();
        const agoraAdP2sh = Script.p2sh(shaRmd160(agoraAdScript.bytecode));

        // Determine the offer tx parameters before building txs, so we can
        // accurately calculate its fee
        const agoraScript = this.script();
        const agoraP2sh = Script.p2sh(shaRmd160(agoraScript.bytecode));

        const offerTargetOutputs: TxBuilderOutput[] = [
            {
                sats: 0n,
                script: slpSend(params.tokenId, SLP_NFT1_CHILD, [1n]),
            },
            { sats: dustSats, script: agoraP2sh },
        ];

        const offerTxFuelSats = getAgoraAdFuelSats(
            agoraAdScript,
            AgoraOneshotAdSignatory(params.wallet.sk),
            offerTargetOutputs,
            feePerKb,
        );

        // The ad prep tx must include an output with fuel that covers this fee
        // This will be dust + fee
        const adFuelOutputSats = dustSats + offerTxFuelSats;

        // Build the ad setup tx using ecash-wallet (without broadcasting)
        let adSetupTx: Tx;
        let adSetupTxid: string;
        try {
            // Build payment.Action for ad setup transaction
            // This sends the NFT to the P2SH address with fuel for the offer tx
            // Output 0: OP_RETURN (ecash-wallet will build the script from tokenActions)
            // Output 1: P2SH output with NFT (for the offer tx)
            // ecash-wallet will automatically select the NFT UTXO based on the token send action
            const adSetupOutputs: payment.PaymentOutput[] = [
                { sats: 0n }, // OP_RETURN - ecash-wallet will build the script
                {
                    sats: adFuelOutputSats,
                    script: agoraAdP2sh,
                    tokenId: params.tokenId,
                    atoms: 1n, // NFT quantity is always 1
                },
            ];

            const adSetupAction: payment.Action = {
                outputs: adSetupOutputs,
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: params.tokenId,
                        tokenType: params.tokenType,
                    },
                ],
                feePerKb,
            };

            // Build without broadcasting to get the txid
            const builtAdSetupAction = params.wallet
                .action(adSetupAction)
                .build();
            adSetupTx = builtAdSetupAction.txs[0];
            adSetupTxid = builtAdSetupAction.builtTxs[0].txid;
        } catch (err) {
            console.error(`Error building NFT listing ad tx`, err);
            return {
                success: false,
                broadcasted: [],
                unbroadcasted: [],
                errors: [`Error building NFT listing ad tx: ${err}`],
            };
        }

        // Build the offer transaction
        // This uses a P2SH input with custom signatory, so we build it manually with TxBuilder
        let offerTx: Tx;
        try {
            const offerInputs = [
                {
                    input: {
                        prevOut: {
                            // Use the txid from the built (but not yet broadcast) ad tx
                            txid: adSetupTxid,
                            outIdx: 1,
                        },
                        signData: {
                            sats: adFuelOutputSats,
                            redeemScript: agoraAdScript,
                        },
                    },
                    signatory: AgoraOneshotAdSignatory(params.wallet.sk),
                },
            ];

            // Build the offer transaction using TxBuilder
            const offerTxBuilder = new TxBuilder({
                inputs: offerInputs,
                outputs: offerTargetOutputs,
            });

            offerTx = offerTxBuilder.sign({
                feePerKb,
                dustSats,
            });
        } catch (err) {
            console.error(`Error building NFT listing offer tx`, err);
            return {
                success: false,
                broadcasted: [],
                unbroadcasted: [],
                errors: [`Error building NFT listing offer tx: ${err}`],
            };
        }

        // Broadcast both transactions together
        try {
            const builtAction = new BuiltAction(
                params.wallet,
                [adSetupTx, offerTx],
                feePerKb,
            );
            const broadcastResult = await builtAction.broadcast();
            return broadcastResult;
        } catch (err) {
            console.error(`Error broadcasting NFT listing txs`, err);
            return {
                success: false,
                broadcasted: [],
                unbroadcasted: [],
                errors: [`Error broadcasting NFT listing txs: ${err}`],
            };
        }
    }
}

export const AgoraOneshotSignatory = (
    covenantSk: Uint8Array,
    covenantPk: Uint8Array,
    numEnforcedOutputs: number,
) => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const preimage = input.sigHashPreimage(ALL_ANYONECANPAY_BIP143, 0);
        const sighash = sha256d(preimage.bytes);
        const covenantSig = ecc.schnorrSign(covenantSk, sighash);
        const serBuyerOutputs = (writer: Writer) => {
            for (const output of input.unsignedTx.tx.outputs.slice(
                numEnforcedOutputs,
            )) {
                writeTxOutput(output, writer);
            }
        };
        const writerLength = new WriterLength();
        serBuyerOutputs(writerLength);
        const writer = new WriterBytes(writerLength.length);
        serBuyerOutputs(writer);
        const buyerOutputsSer = writer.data;

        return Script.fromOps([
            pushBytesOp(covenantPk),
            pushBytesOp(covenantSig),
            pushBytesOp(preimage.bytes.slice(4 + 32 + 32)), // preimage_4_10
            pushBytesOp(buyerOutputsSer),
            OP_1, // is_accept = true
            pushBytesOp(preimage.redeemScript.bytecode),
        ]);
    };
};

export const AgoraOneshotCancelSignatory = (cancelSk: Uint8Array) => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const preimage = input.sigHashPreimage(ALL_BIP143, 0);
        const sighash = sha256d(preimage.bytes);
        const cancelSig = flagSignature(
            ecc.schnorrSign(cancelSk, sighash),
            ALL_BIP143,
        );
        return Script.fromOps([
            pushBytesOp(cancelSig),
            OP_0, // is_accept = false
            pushBytesOp(preimage.redeemScript.bytecode),
        ]);
    };
};

export const AgoraOneshotAdSignatory = (cancelSk: Uint8Array) => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const preimage = input.sigHashPreimage(ALL_BIP143);
        const sighash = sha256d(preimage.bytes);
        const cancelSig = flagSignature(
            ecc.schnorrSign(cancelSk, sighash),
            ALL_BIP143,
        );
        return Script.fromOps([
            pushBytesOp(AGORA_LOKAD_ID),
            pushBytesOp(strToBytes(AgoraOneshot.COVENANT_VARIANT)),
            pushBytesOp(cancelSig),
            pushBytesOp(preimage.redeemScript.bytecode),
        ]);
    };
};
