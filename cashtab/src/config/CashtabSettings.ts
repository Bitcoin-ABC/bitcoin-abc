// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    FEE_SATS_PER_KB_XEC_MINIMUM,
    FEE_SATS_PER_KB_MAXIMUM,
} from 'constants/transactions';

interface CashtabSettingsInterface {
    fiatCurrency: string;
    sendModal: boolean;
    autoCameraOn: boolean;
    hideMessagesFromUnknownSenders: boolean;
    balanceVisible: boolean;
    satsPerKb: number;
}

// Default settings which can be modified within Cashtab
class CashtabSettings implements CashtabSettingsInterface {
    fiatCurrency: string;
    sendModal: boolean;
    autoCameraOn: boolean;
    hideMessagesFromUnknownSenders: boolean;
    balanceVisible: boolean;
    satsPerKb: number;
    constructor(
        fiatCurrency = 'usd',
        sendModal = false,
        autoCameraOn = false,
        hideMessagesFromUnknownSenders = false,
        balanceVisible = true,
        satsPerKb = FEE_SATS_PER_KB_XEC_MINIMUM,
    ) {
        this.fiatCurrency = fiatCurrency;
        this.sendModal = sendModal;
        this.autoCameraOn = autoCameraOn;
        this.hideMessagesFromUnknownSenders = hideMessagesFromUnknownSenders;
        this.balanceVisible = balanceVisible;
        this.satsPerKb = satsPerKb;
    }
}
export default CashtabSettings;

interface FiatCurrency {
    name: string;
    symbol: string;
    slug: string;
}

// Cashtab supported fiat currencies
export const supportedFiatCurrencies: Record<string, FiatCurrency> = {
    usd: { name: 'US Dollar', symbol: '$', slug: 'usd' },
    aed: { name: 'UAE Dirham', symbol: 'Dh', slug: 'aed' },
    aud: { name: 'Australian Dollar', symbol: '$', slug: 'aud' },
    bhd: { name: 'Bahraini Dinar', symbol: 'BD', slug: 'bhd' },
    brl: { name: 'Brazilian Real', symbol: 'R$', slug: 'brl' },
    gbp: { name: 'British Pound', symbol: '£', slug: 'gbp' },
    cad: { name: 'Canadian Dollar', symbol: '$', slug: 'cad' },
    clp: { name: 'Chilean Peso', symbol: '$', slug: 'clp' },
    cny: { name: 'Chinese Yuan', symbol: '元', slug: 'cny' },
    eur: { name: 'Euro', symbol: '€', slug: 'eur' },
    hkd: { name: 'Hong Kong Dollar', symbol: 'HK$', slug: 'hkd' },
    inr: { name: 'Indian Rupee', symbol: '₹', slug: 'inr' },
    idr: { name: 'Indonesian Rupiah', symbol: 'Rp', slug: 'idr' },
    ils: { name: 'Israeli Shekel', symbol: '₪', slug: 'ils' },
    jpy: { name: 'Japanese Yen', symbol: '¥', slug: 'jpy' },
    krw: { name: 'Korean Won', symbol: '₩', slug: 'krw' },
    myr: { name: 'Malaysian Ringgit', symbol: 'RM', slug: 'myr' },
    ngn: { name: 'Nigerian Naira', symbol: '₦', slug: 'ngn' },
    nzd: { name: 'New Zealand Dollar', symbol: '$', slug: 'nzd' },
    nok: { name: 'Norwegian Krone', symbol: 'kr', slug: 'nok' },
    php: { name: 'Philippine Peso', symbol: '₱', slug: 'php' },
    rub: { name: 'Russian Ruble', symbol: 'р.', slug: 'rub' },
    twd: { name: 'New Taiwan Dollar', symbol: 'NT$', slug: 'twd' },
    sar: { name: 'Saudi Riyal', symbol: 'SAR', slug: 'sar' },
    zar: { name: 'South African Rand', symbol: 'R', slug: 'zar' },
    chf: { name: 'Swiss Franc', symbol: 'Fr.', slug: 'chf' },
    try: { name: 'Turkish Lira', symbol: '₺', slug: 'try' },
    vnd: { name: 'Vietnamese đồng', symbol: 'đ', slug: 'vnd' },
};

type FiatCurrencyCode = keyof typeof supportedFiatCurrencies;

export interface CashtabSettingsValidation {
    fiatCurrency: FiatCurrencyCode[];
    sendModal: boolean[];
    autoCameraOn: boolean[];
    hideMessagesFromUnknownSenders: boolean[];
    balanceVisible: boolean[];
    satsPerKb: {
        min: number;
        max: number;
    };
}

// Validation for CashtabSettings
export const cashtabSettingsValidation: CashtabSettingsValidation = {
    fiatCurrency: Object.keys(supportedFiatCurrencies),
    sendModal: [true, false],
    autoCameraOn: [true, false],
    hideMessagesFromUnknownSenders: [true, false],
    balanceVisible: [true, false],
    // Note: satsPerKb is not currently exposed to users in the UI
    satsPerKb: {
        min: FEE_SATS_PER_KB_XEC_MINIMUM,
        max: FEE_SATS_PER_KB_MAXIMUM,
    },
};
