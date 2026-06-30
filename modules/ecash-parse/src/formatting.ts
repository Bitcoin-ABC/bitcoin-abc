// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const decimalizedTokenQtyToLocaleFormat = (
    decimalizedTokenQty: string,
    userLocale: string,
): string => {
    const localeDecimalSymbol = Number(1).toLocaleString(userLocale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })[1];

    const localeThousand = Number(1000).toLocaleString(userLocale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    const LOCALE_HAS_THOUSANDS_LENGTH = 5;
    const hasThousandSeparator =
        localeThousand.length === LOCALE_HAS_THOUSANDS_LENGTH;
    const localeThousandsSymbol = hasThousandSeparator ? localeThousand[1] : '';

    const beforeAndAfterDecimalStrings = decimalizedTokenQty.split('.');
    const beforeDecimalString = beforeAndAfterDecimalStrings[0];

    let localeTokenString = beforeDecimalString.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        localeThousandsSymbol,
    );
    if (beforeAndAfterDecimalStrings.length > 1) {
        localeTokenString = `${localeTokenString}${localeDecimalSymbol}${beforeAndAfterDecimalStrings[1]}`;
    }

    return localeTokenString;
};
