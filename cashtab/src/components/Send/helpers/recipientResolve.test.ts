// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getAddressFromRecipientInput,
    getRecipientDisplayLabel,
    looksLikeAddressInput,
    searchSendRecipients,
} from 'components/Send/helpers/recipientResolve';
import {
    BLITZ_CHIPS_GAME_ADDRESS,
    EVERY_DAY_JACKPOT_GAME_ADDRESS,
} from 'constants/recipients';
import { previewAddress } from 'helpers';

describe('recipientResolve helpers', () => {
    const contacts = [
        {
            name: 'Alice',
            address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
        },
        {
            name: 'Bob',
            address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        },
    ];
    const wallets = [
        {
            name: 'Spending',
            mnemonic: 'test',
            address: 'ecash:qzs4zzxs0gvfrc6e2wqhkmvj4dmmh332cvfpd7yjep',
            hash: 'a',
            sk: '00',
            pk: '00',
        },
        {
            name: 'Savings',
            mnemonic: 'test',
            address: 'ecash:qzj4u2pl2nv3kampdnnjc2c30f9lwl50uvvg4nfkfz',
            hash: 'b',
            sk: '00',
            pk: '00',
        },
    ];

    it('getAddressFromRecipientInput strips BIP21 query params', () => {
        expect(
            getAddressFromRecipientInput(
                'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=10',
            ),
        ).toBe('ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6');
    });

    it('getRecipientDisplayLabel prefers contact name', () => {
        expect(
            getRecipientDisplayLabel(contacts[0].address, contacts, wallets),
        ).toBe('Alice');
    });

    it('getRecipientDisplayLabel resolves known destinations', () => {
        expect(getRecipientDisplayLabel(BLITZ_CHIPS_GAME_ADDRESS, [], [])).toBe(
            'BlitzChips',
        );
        expect(
            getRecipientDisplayLabel(EVERY_DAY_JACKPOT_GAME_ADDRESS, [], []),
        ).toBe('EveryDayJackpot');
    });

    it('getRecipientDisplayLabel uses own wallet name', () => {
        expect(getRecipientDisplayLabel(wallets[1].address, [], wallets)).toBe(
            'Savings',
        );
    });

    it('getRecipientDisplayLabel falls back to address preview', () => {
        const addr = 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y';
        expect(getRecipientDisplayLabel(addr, [], [])).toBe(
            previewAddress(addr),
        );
    });

    it('looksLikeAddressInput detects address-like strings', () => {
        expect(looksLikeAddressInput('Alice')).toBe(false);
        expect(looksLikeAddressInput('ecash:qp89')).toBe(true);
        expect(
            looksLikeAddressInput(
                'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=1',
            ),
        ).toBe(true);
    });

    it('searchSendRecipients matches contacts, wallets, and known names', () => {
        const aliceMatches = searchSendRecipients('ali', contacts, wallets);
        expect(aliceMatches).toEqual([
            {
                kind: 'contact',
                name: 'Alice',
                address: contacts[0].address,
            },
        ]);

        const walletMatches = searchSendRecipients('sav', contacts, wallets);
        expect(walletMatches).toEqual([
            {
                kind: 'wallet',
                name: 'Savings',
                address: wallets[1].address,
            },
        ]);

        const knownMatches = searchSendRecipients('blitz', contacts, wallets);
        expect(knownMatches).toEqual([
            {
                kind: 'known',
                name: 'BlitzChips',
                address: BLITZ_CHIPS_GAME_ADDRESS,
            },
        ]);
    });
});
