// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CashtabContact } from 'config/CashtabState';
import { StoredCashtabWallet } from 'wallet';
import { previewAddress } from 'helpers';
import { KNOWN_RECIPIENT_NAMES } from 'constants/recipients';
import { FIRMA_HANDLE_MAX_LENGTH } from 'config/firma';
import { isFirmaUsernameTokenId } from 'constants/tokens';
import { isValidCashAddress } from 'ecashaddrjs';
import appConfig from 'config/app';

export type RecipientMatchKind = 'contact' | 'wallet' | 'known' | 'firma';

export interface RecipientSearchMatch {
    kind: RecipientMatchKind;
    name: string;
    address: string;
}

/** Firma username paired with the cashaddr it resolved to */
export interface ResolvedFirmaRecipient {
    handle: string;
    address: string;
}

/**
 * Strip BIP21 query params so we resolve the address portion only.
 */
export const getAddressFromRecipientInput = (input: string): string => {
    if (typeof input !== 'string' || input === '') {
        return '';
    }
    return input.split('?')[0].trim();
};

/**
 * Firma handle to show for this recipient, or null if the stored resolve
 * does not match the active cashaddr (e.g. parent-driven prefill).
 *
 * @param addressOrBip21 Current recipient field (address or BIP21)
 * @param resolved Handle + cashaddr from Patron, if any
 */
export const getFirmaHandleForRecipient = (
    addressOrBip21: string,
    resolved?: ResolvedFirmaRecipient | null,
): string | null => {
    if (resolved == null || resolved.handle === '') {
        return null;
    }
    const address = getAddressFromRecipientInput(addressOrBip21);
    if (address === '' || address !== resolved.address) {
        return null;
    }
    return resolved.handle;
};

/**
 * Display label for a send recipient.
 * Priority: resolved Firma username → contact name → known alias → own
 * wallet name → address preview.
 *
 * @param resolvedFirma Username + cashaddr when this recipient was resolved
 * from a Firma handle (user intent is the username). Shown only when the
 * address still matches.
 */
export const getRecipientDisplayLabel = (
    addressOrBip21: string,
    contactList: CashtabContact[],
    wallets: StoredCashtabWallet[],
    resolvedFirma?: ResolvedFirmaRecipient | null,
): string => {
    const address = getAddressFromRecipientInput(addressOrBip21);
    if (address === '') {
        return '';
    }

    const firmaHandle = getFirmaHandleForRecipient(
        addressOrBip21,
        resolvedFirma,
    );
    if (firmaHandle !== null) {
        return `@${firmaHandle}`;
    }

    const contact = contactList.find(c => c.address === address);
    if (contact) {
        return contact.name;
    }

    const knownName = KNOWN_RECIPIENT_NAMES[address];
    if (typeof knownName === 'string') {
        return knownName;
    }

    const wallet = wallets.find(w => w.address === address);
    if (wallet) {
        return wallet.name;
    }

    return previewAddress(address);
};

/**
 * Head of the recipient field before `?`, with a leading `@` stripped.
 * Null when empty, a cashaddr, or it contains whitespace.
 *
 * @param raw Recipient input, optionally `username?bip21`
 */
export const getFirmaUsernameCandidate = (raw: string): string | null => {
    if (typeof raw !== 'string') {
        return null;
    }
    const trimmed = raw.trim();
    if (trimmed === '') {
        return null;
    }
    const head = trimmed.split('?')[0];
    if (isValidCashAddress(head, appConfig.prefix)) {
        return null;
    }
    const stripped = head.startsWith('@') ? head.slice(1) : head;
    if (stripped === '' || /\s/.test(stripped) || stripped.includes('@')) {
        return null;
    }
    return stripped.toLowerCase();
};

/**
 * True when the user explicitly typed a Firma username (`@…`).
 * Exactly one leading `@` — a second `@` is not a username.
 */
export const isExplicitFirmaUsernameInput = (value: string): boolean => {
    if (typeof value !== 'string') {
        return false;
    }
    const head = value.trim().split('?')[0];
    return head.startsWith('@') && !head.slice(1).includes('@');
};

/**
 * token_id from a BIP21 query suffix, or null.
 *
 * @param recipientInput Recipient field, optionally `username?token_id=…`
 */
export const getBip21TokenId = (recipientInput: string): string | null => {
    if (typeof recipientInput !== 'string' || !recipientInput.includes('?')) {
        return null;
    }
    const qs = recipientInput.split('?')[1];
    if (typeof qs !== 'string' || qs === '') {
        return null;
    }
    return new URLSearchParams(qs).get('token_id');
};

/**
 * Patron lookup is allowed only when sending FIRMA, fCHF, or fEUR
 * (selected token, or token_id in a BIP21 suffix).
 *
 * @param selectedTokenId Token selected in Send Token, or null on XEC send
 * @param recipientInput Current recipient field (may include BIP21)
 */
export const shouldResolveFirmaUsername = (
    selectedTokenId: string | null | undefined,
    recipientInput = '',
): boolean => {
    if (isFirmaUsernameTokenId(selectedTokenId)) {
        return true;
    }
    return isFirmaUsernameTokenId(getBip21TokenId(recipientInput));
};

/**
 * Validate a Firma username for send (no `@`). Empty string is not valid.
 * Matching apps/firma validateUsername (1–21 lowercase alphanumeric).
 *
 * @returns false if valid, otherwise a short user-facing error
 */
export const validateFirmaUsername = (username: string): false | string => {
    if (username.trim() === '') {
        return 'Username is required';
    }
    if (username.length < 1 || username.length > FIRMA_HANDLE_MAX_LENGTH) {
        return `Username must be between 1-${FIRMA_HANDLE_MAX_LENGTH} characters`;
    }
    if (!/^[a-z0-9]+$/.test(username)) {
        return 'Username must contain only lowercase letters and numbers';
    }
    return false;
};

/**
 * True when the input is a well-formed Firma username (optional `@`, optional BIP21).
 */
export const looksLikeFirmaUsernameInput = (value: string): boolean => {
    const candidate = getFirmaUsernameCandidate(value);
    if (candidate === null) {
        return false;
    }
    return validateFirmaUsername(candidate) === false;
};

/**
 * Whether the input looks like the user is typing an address / BIP21 string
 * rather than searching by contact or wallet name.
 */
export const looksLikeAddressInput = (value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed === '') {
        return false;
    }
    if (trimmed.includes(':') || trimmed.includes('?')) {
        return true;
    }
    // Cashaddr payloads are lowercase alphanumeric and typically long
    return /^[qp][a-z0-9]{20,}$/i.test(trimmed);
};

/**
 * Search contacts, own wallets, and known aliases by name (and address substring).
 * Deduplicates by address; contact beats wallet beats known.
 */
export const searchSendRecipients = (
    query: string,
    contactList: CashtabContact[],
    wallets: StoredCashtabWallet[],
): RecipientSearchMatch[] => {
    const normalized = query.trim().toLowerCase();
    if (normalized === '') {
        return [];
    }

    const byAddress = new Map<string, RecipientSearchMatch>();

    const maybeAdd = (match: RecipientSearchMatch) => {
        const existing = byAddress.get(match.address);
        if (!existing) {
            byAddress.set(match.address, match);
            return;
        }
        const rank = { contact: 0, wallet: 1, known: 2, firma: 3 };
        if (rank[match.kind] < rank[existing.kind]) {
            byAddress.set(match.address, match);
        }
    };

    for (const contact of contactList) {
        if (
            contact.name.toLowerCase().includes(normalized) ||
            contact.address.toLowerCase().includes(normalized)
        ) {
            maybeAdd({
                kind: 'contact',
                name: contact.name,
                address: contact.address,
            });
        }
    }

    for (const wallet of wallets) {
        if (
            wallet.name.toLowerCase().includes(normalized) ||
            wallet.address.toLowerCase().includes(normalized)
        ) {
            maybeAdd({
                kind: 'wallet',
                name: wallet.name,
                address: wallet.address,
            });
        }
    }

    for (const [address, name] of Object.entries(KNOWN_RECIPIENT_NAMES)) {
        if (
            name.toLowerCase().includes(normalized) ||
            address.toLowerCase().includes(normalized)
        ) {
            maybeAdd({
                kind: 'known',
                name,
                address,
            });
        }
    }

    return Array.from(byAddress.values()).slice(0, 8);
};
