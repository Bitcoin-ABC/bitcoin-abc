// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CashtabContact } from 'config/CashtabState';
import { StoredCashtabWallet } from 'wallet';
import { previewAddress } from 'helpers';
import { KNOWN_RECIPIENT_NAMES } from 'constants/recipients';

export type RecipientMatchKind = 'contact' | 'wallet' | 'known';

export interface RecipientSearchMatch {
    kind: RecipientMatchKind;
    name: string;
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
 * Display label for a send recipient.
 * Priority: contact name → known alias → own wallet name → address preview.
 */
export const getRecipientDisplayLabel = (
    addressOrBip21: string,
    contactList: CashtabContact[],
    wallets: StoredCashtabWallet[],
): string => {
    const address = getAddressFromRecipientInput(addressOrBip21);
    if (address === '') {
        return '';
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
        const rank = { contact: 0, wallet: 1, known: 2 };
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
