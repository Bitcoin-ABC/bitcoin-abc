// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, I18N_RESOURCES } from '../i18n/locales';

i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources: I18N_RESOURCES,
    // This will be overridden by the locale set in the settings at runtime
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: {
        escapeValue: false, // React already escapes values
    },
});

export default i18n;
