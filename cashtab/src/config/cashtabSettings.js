// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

// Default settings which can be modified within Cashtab
export class CashtabSettings {
    constructor(
        fiatCurrency = 'usd',
        sendModal = false,
        autoCameraOn = true,
        hideMessagesFromUnknownSenders = false,
        balanceVisible = true,
        minFeeSends = false,
    ) {
        this.fiatCurrency = fiatCurrency;
        this.sendModal = sendModal;
        this.autoCameraOn = autoCameraOn;
        this.hideMessagesFromUnknownSenders = hideMessagesFromUnknownSenders;
        this.balanceVisible = balanceVisible;
        this.minFeeSends = minFeeSends;
    }
}

// Cashtab supported fiat currencies
export const supportedFiatCurrencies = {
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

// Validation for cashtabSettings
export const cashtabSettingsValidation = {
    fiatCurrency: Object.keys(supportedFiatCurrencies),
    sendModal: [true, false],
    autoCameraOn: [true, false],
    hideMessagesFromUnknownSenders: [true, false],
    balanceVisible: [true, false],
    minFeeSends: [true, false],
};
