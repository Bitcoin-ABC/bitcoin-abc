// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Address, Script, Tx } from 'ecash-lib';
import { Wallet } from 'ecash-wallet';
import { hdGenesisInput0IconMinter } from 'components/Etokens/CreateTokenForm';

const wallet = {
    prefix: 'ecash',
    getKeypairForAddress: () => undefined,
} as unknown as Wallet;

const txWithScript = (outputScript: Script | undefined): Tx[] => [
    {
        inputs: [
            outputScript === undefined ? {} : { signData: { outputScript } },
        ],
    } as unknown as Tx,
];

describe('hdGenesisInput0IconMinter', () => {
    it('rejects a genesis tx with no input[0] script', () => {
        expect(() => hdGenesisInput0IconMinter(wallet, [])).toThrow(
            'Genesis transaction has no input[0]',
        );
        expect(() =>
            hdGenesisInput0IconMinter(wallet, txWithScript(undefined)),
        ).toThrow('Genesis transaction has no input[0]');
    });

    it('rejects scripts this HD wallet cannot sign', () => {
        const opReturn = new Script(new Uint8Array([0x6a]));
        const p2sh = Script.p2sh(new Uint8Array(20).fill(1));
        expect(() =>
            hdGenesisInput0IconMinter(wallet, txWithScript(opReturn)),
        ).toThrow('Only p2pkh is supported');
        expect(() =>
            hdGenesisInput0IconMinter(wallet, txWithScript(p2sh)),
        ).toThrow('Only p2pkh is supported');
    });

    it('returns the p2pkh address and its HD key', () => {
        const p2pkh = Script.p2pkh(new Uint8Array(20).fill(2));
        const address = Address.fromScript(p2pkh, 'ecash').toString();
        const sk = new Uint8Array(32).fill(3);
        const hdWallet = {
            prefix: 'ecash',
            getKeypairForAddress: (queried: string) =>
                queried === address
                    ? { sk, pk: new Uint8Array(33) }
                    : undefined,
        } as unknown as Wallet;

        expect(
            hdGenesisInput0IconMinter(hdWallet, txWithScript(p2pkh)),
        ).toEqual({ address, sk });
    });
});
