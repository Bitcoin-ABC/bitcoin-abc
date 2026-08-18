// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getAddressFromRecipientInput,
    getBip21TokenId,
    getFirmaHandleForRecipient,
    getFirmaUsernameCandidate,
    getRecipientDisplayLabel,
    isExplicitFirmaUsernameInput,
    looksLikeAddressInput,
    looksLikeFirmaUsernameInput,
    searchSendRecipients,
    shouldResolveFirmaUsername,
    validateFirmaUsername,
} from 'components/Send/helpers/recipientResolve';
import {
    FIRMA,
    FIRMA_CHF_TOKEN_ID,
    FIRMA_EUR_TOKEN_ID,
    isFirmaUsernameTokenId,
} from 'constants/tokens';
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

    it('getRecipientDisplayLabel prefers a resolved Firma username', () => {
        expect(
            getRecipientDisplayLabel(contacts[0].address, contacts, wallets, {
                handle: 'alice',
                address: contacts[0].address,
            }),
        ).toBe('@alice');
    });

    it('getRecipientDisplayLabel ignores a Firma handle for a different address', () => {
        expect(
            getRecipientDisplayLabel(contacts[0].address, contacts, wallets, {
                handle: 'alice',
                address: contacts[1].address,
            }),
        ).toBe('Alice');
    });

    it('getFirmaHandleForRecipient matches cashaddr including BIP21 suffix', () => {
        expect(
            getFirmaHandleForRecipient(
                `${contacts[0].address}?token_id=abc&token_decimalized_qty=1`,
                { handle: 'alice', address: contacts[0].address },
            ),
        ).toBe('alice');
        expect(
            getFirmaHandleForRecipient(contacts[0].address, {
                handle: 'alice',
                address: contacts[1].address,
            }),
        ).toBeNull();
    });

    it('parses Firma username candidates like apps/firma', () => {
        expect(getFirmaUsernameCandidate('@Alice')).toBe('alice');
        expect(getFirmaUsernameCandidate('alice?amount=10')).toBe('alice');
        expect(getFirmaUsernameCandidate(contacts[0].address)).toBeNull();
        expect(getFirmaUsernameCandidate('ali ce')).toBeNull();
        expect(getFirmaUsernameCandidate('@@alice')).toBeNull();
        expect(getFirmaUsernameCandidate('@ali@ce')).toBeNull();
        expect(isExplicitFirmaUsernameInput('@alice')).toBe(true);
        expect(isExplicitFirmaUsernameInput('alice')).toBe(false);
        expect(isExplicitFirmaUsernameInput('@@alice')).toBe(false);
        expect(isExplicitFirmaUsernameInput('@ali@ce')).toBe(false);
        expect(looksLikeFirmaUsernameInput('@alice')).toBe(true);
        expect(looksLikeFirmaUsernameInput('alice')).toBe(true);
        expect(looksLikeFirmaUsernameInput('alice-bob')).toBe(false);
        expect(validateFirmaUsername('alice')).toBe(false);
        expect(validateFirmaUsername('Alice')).toBe(
            'Username must contain only lowercase letters and numbers',
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

    it('isFirmaUsernameTokenId allows FIRMA, fCHF, and fEUR only', () => {
        expect(isFirmaUsernameTokenId(FIRMA.tokenId)).toBe(true);
        expect(isFirmaUsernameTokenId(FIRMA_CHF_TOKEN_ID)).toBe(true);
        expect(isFirmaUsernameTokenId(FIRMA_EUR_TOKEN_ID)).toBe(true);
        expect(isFirmaUsernameTokenId(null)).toBe(false);
        expect(isFirmaUsernameTokenId('')).toBe(false);
        expect(
            isFirmaUsernameTokenId(
                '2222222222222222222222222222222222222222222222222222222222222222',
            ),
        ).toBe(false);
    });

    it('shouldResolveFirmaUsername uses selected token or BIP21 token_id', () => {
        expect(shouldResolveFirmaUsername(null, '@alice')).toBe(false);
        expect(shouldResolveFirmaUsername(FIRMA.tokenId, '@alice')).toBe(true);
        expect(
            shouldResolveFirmaUsername(
                null,
                `@alice?token_id=${FIRMA.tokenId}&token_decimalized_qty=1`,
            ),
        ).toBe(true);
        expect(
            shouldResolveFirmaUsername(
                null,
                `@alice?token_id=${FIRMA_CHF_TOKEN_ID}`,
            ),
        ).toBe(true);
        expect(
            shouldResolveFirmaUsername(
                null,
                `@alice?token_id=${FIRMA_EUR_TOKEN_ID}`,
            ),
        ).toBe(true);
        expect(
            shouldResolveFirmaUsername(
                null,
                '@alice?token_id=2222222222222222222222222222222222222222222222222222222222222222',
            ),
        ).toBe(false);
        expect(getBip21TokenId('@alice')).toBeNull();
        expect(getBip21TokenId(`@alice?token_id=${FIRMA.tokenId}`)).toBe(
            FIRMA.tokenId,
        );
    });
});
