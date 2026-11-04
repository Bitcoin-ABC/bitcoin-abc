// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { DEFAULT_DUST_SATS, Ecc, Script, shaRmd160, toHex } from 'ecash-lib';
import { MockChronikClient } from 'mock-chronik-client';

import type { FusionChronik } from '../../src/client/chronik.js';
import type { LoadedCoins } from '../../src/client/fusionClient.js';
import {
    buildParticipantContribution,
    fusionKeyFromMnemonic,
    parseParticipantEnv,
    PARTICIPANT_ENV_USAGE,
    ParticipantConfigError,
    runParticipant,
    startParticipant,
} from '../../src/cli/participant.js';
import { initProto } from '../../src/protocol/messages.js';
import {
    DEFAULT_CONTROL_PORT,
    DEFAULT_MIN_PLAYERS,
} from '../../src/protocol/constants.js';
import type { WireTokenInput } from '../../src/protocol/components.js';
import { contributionToComponents } from '../../src/protocol/components.js';
import { assembleFromComponents } from '../../src/tx/sign.js';

const TOKEN_ID =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const MNEMONIC =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const ALP = {
    protocol: 'ALP' as const,
    type: 'ALP_TOKEN_TYPE_STANDARD' as const,
    number: 0,
};

function expectConfigError(fn: () => unknown, snippet: string, exitCode = 1) {
    let threw: unknown;
    try {
        fn();
    } catch (err) {
        threw = err;
    }
    expect(threw).to.be.instanceOf(ParticipantConfigError);
    const err = threw as ParticipantConfigError;
    expect(err.message).to.include(snippet);
    expect(err.exitCode).to.equal(exitCode);
}

function baseEnv(): NodeJS.Dict<string> {
    return {
        MNEMONIC,
        CHRONIK_URLS: 'https://chronik.example',
        TOKEN_ID,
    };
}

function keyAt(tag: number) {
    const ecc = new Ecc();
    const sk = new Uint8Array(32);
    sk[31] = tag;
    const pubkey = ecc.derivePubkey(sk);
    const script = Script.p2pkh(shaRmd160(pubkey));
    return { sk, pubkey, script };
}

function coinsFor(tag: number, fuelSats: bigint): LoadedCoins {
    const { sk, pubkey, script } = keyAt(tag);
    const token: WireTokenInput = {
        prevOut: { txid: '11'.repeat(32), outIdx: tag },
        sats: DEFAULT_DUST_SATS,
        script,
        tokenId: TOKEN_ID,
        atoms: 50n,
        pubkey,
        sk,
    };
    return {
        tokenInputs: [token],
        fuelInputs: [
            {
                prevOut: { txid: '22'.repeat(32), outIdx: tag },
                sats: fuelSats,
                script,
                atoms: 0n,
                pubkey,
                sk,
            },
        ],
    };
}

describe('parseParticipantEnv', () => {
    it('requires MNEMONIC, CHRONIK_URLS, and TOKEN_ID', () => {
        expectConfigError(
            () => parseParticipantEnv({}),
            'MNEMONIC is required',
        );
        expectConfigError(
            () => parseParticipantEnv({ MNEMONIC }),
            'CHRONIK_URLS is required',
        );
        expectConfigError(
            () =>
                parseParticipantEnv({
                    MNEMONIC,
                    CHRONIK_URLS: 'https://chronik.example',
                }),
            'TOKEN_ID must be 64 hex characters',
        );
    });

    it('fills host, port, tier, and minPlayers', () => {
        expect(parseParticipantEnv(baseEnv())).to.deep.equal({
            mnemonic: MNEMONIC,
            chronikUrls: ['https://chronik.example'],
            tokenId: TOKEN_ID,
            atomTier: 0n,
            coordinatorHost: '127.0.0.1',
            controlPort: DEFAULT_CONTROL_PORT,
            minPlayers: DEFAULT_MIN_PLAYERS,
            once: false,
        });
    });

    it('accepts lab overrides and --once', () => {
        const parsed = parseParticipantEnv(
            {
                ...baseEnv(),
                ATOM_TIER: '100',
                COORDINATOR_HOST: 'fusion.example',
                CONTROL_PORT: '9000',
                MIN_PLAYERS: '2',
                TOKEN_ID: TOKEN_ID.toUpperCase(),
            },
            ['--once'],
        );
        expect(parsed.atomTier).to.equal(100n);
        expect(parsed.coordinatorHost).to.equal('fusion.example');
        expect(parsed.controlPort).to.equal(9000);
        expect(parsed.minPlayers).to.equal(2);
        expect(parsed.once).to.equal(true);
        expect(parsed.tokenId).to.equal(TOKEN_ID);
    });

    it('rejects a phrase that is not 12 or 24 lowercase words', () => {
        expectConfigError(
            () => parseParticipantEnv({ ...baseEnv(), MNEMONIC: 'too short' }),
            '12 or 24 lowercase words separated by single spaces',
        );
        expectConfigError(
            () =>
                parseParticipantEnv({
                    ...baseEnv(),
                    MNEMONIC: MNEMONIC.toUpperCase(),
                }),
            'lowercase words separated by single spaces',
        );
        expectConfigError(
            () =>
                parseParticipantEnv({
                    ...baseEnv(),
                    MNEMONIC: MNEMONIC.replace(' ', '  '),
                }),
            'single spaces',
        );
        expectConfigError(
            () => parseParticipantEnv({ ...baseEnv(), MIN_PLAYERS: '30' }),
            'MIN_PLAYERS must be an integer from 2 to 29',
        );
    });

    it('strips a leading -- so pnpm can forward --once', () => {
        const parsed = parseParticipantEnv(baseEnv(), ['--', '--once']);
        expect(parsed.once).to.equal(true);
    });

    it('prints usage on --help with exitCode 0', () => {
        expectConfigError(
            () => parseParticipantEnv(baseEnv(), ['--help']),
            PARTICIPANT_ENV_USAGE.trim(),
            0,
        );
    });
});

describe('buildParticipantContribution', () => {
    before(async () => {
        await initProto();
    });

    it('returns idle when fuel cannot cover dust change plus the fee share', () => {
        const built = buildParticipantContribution(coinsFor(1, 1n), 2);
        expect(built.tokenInputs).to.have.length(0);
    });

    it('assembles an equal-share round for 2 and 8 players', () => {
        for (const players of [2, 8]) {
            const contribs = [];
            for (let tag = 1; tag <= players; tag++) {
                const built = buildParticipantContribution(
                    coinsFor(tag, 80_000n + BigInt(tag)),
                    players,
                );
                expect(built.tokenInputs).to.have.length(1);
                expect(built.xecOutputs).to.have.length(1);
                contribs.push(built);
            }
            const blobs = contribs.flatMap(contrib =>
                contributionToComponents(contrib),
            );
            const { assembled } = assembleFromComponents(TOKEN_ID, blobs);
            expect(assembled.outputAtoms).to.equal(BigInt(players) * 50n);
            expect(
                assembled.inputSats - assembled.outputSats >= assembled.feeSats,
            ).to.equal(true);
            const back = contribs[0].xecOutputs![0];
            expect(
                assembled.tx.outputs.some(
                    out =>
                        out.sats === back.sats &&
                        Buffer.from(out.script.bytecode).equals(
                            Buffer.from(back.script.bytecode),
                        ),
                ),
            ).to.equal(true);
        }
    });
});

describe('startParticipant once', () => {
    it('loads Chronik UTXOs and runs one round', async () => {
        const key = fusionKeyFromMnemonic(MNEMONIC);
        const pkh = toHex(shaRmd160(key.pubkey));
        const chronik = new MockChronikClient();
        chronik.setUtxosByScript('p2pkh', pkh, [
            {
                outpoint: { txid: 'aa'.repeat(32), outIdx: 0 },
                blockHeight: 100,
                isCoinbase: false,
                sats: DEFAULT_DUST_SATS,
                isFinal: true,
                token: {
                    tokenId: TOKEN_ID,
                    tokenType: ALP,
                    atoms: 40n,
                    isMintBaton: false,
                },
            },
            {
                outpoint: { txid: 'bb'.repeat(32), outIdx: 1 },
                blockHeight: 100,
                isCoinbase: false,
                sats: 50_000n,
                isFinal: true,
            },
        ]);
        const logs: string[] = [];
        const started = await startParticipant(
            parseParticipantEnv({ ...baseEnv(), MIN_PLAYERS: '2', ONCE: '1' }),
            {
                createChronik: () => chronik as unknown as FusionChronik,
                runRound: async args => {
                    expect(args.contribution.tokenInputs).to.have.length(1);
                    expect(args.contribution.tokenInputs[0].atoms).to.equal(
                        40n,
                    );
                    expect(args.atomTier).to.equal(0n);
                    return {
                        rawTx: new Uint8Array([1]),
                        txid: 'cc'.repeat(32),
                    };
                },
                log: line => {
                    logs.push(line);
                },
            },
        );
        await runParticipant(started);
        expect(logs.some(line => line.includes('ecash:'))).to.equal(true);
        expect(logs.some(line => line.includes('cc'.repeat(32)))).to.equal(
            true,
        );
    });
});
