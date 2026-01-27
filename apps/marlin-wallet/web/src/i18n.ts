// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import i18next from 'i18next';
import { DEFAULT_LOCALE, I18N_RESOURCES } from '../../i18n/locales';
import { sendMessageToBackend } from './common';

export { DEFAULT_LOCALE };

export async function initI18n(locale: string) {
    await i18next.init({
        lng: locale,
        fallbackLng: DEFAULT_LOCALE,
        resources: I18N_RESOURCES,
    });
    updateTranslations();
    sendMessageToBackend('LOCALE_CHANGED', locale);
}

export function getAvailableLocales() {
    return Object.entries(I18N_RESOURCES)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([code, data]) => ({
            code,
            name: data.name,
        }));
}

export function changeLocale(locale: string) {
    i18next.changeLanguage(locale);
    updateTranslations();
    sendMessageToBackend('LOCALE_CHANGED', locale);
}

export function t(key: string) {
    return i18next.t(key);
}

function updateTranslations() {
    // Lookup and update all html elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        if (!(element instanceof HTMLElement)) {
            return;
        }

        const i18nAttr = element.getAttribute('data-i18n');
        if (!i18nAttr) {
            // Empty attribute, ignore
            return;
        }

        // Parse the attribute value
        // Format can be:
        // - "key" -> update textContent/innerHTML
        // - "[attr]key" -> update specific attribute (e.g., [alt]main.title)
        // Only allow specific safe attributes: alt, title, or placeholder
        // Keys can contain dots for nested translations (e.g., main.title)
        const match = i18nAttr.match(
            /^\[(alt|title|placeholder)\]([a-zA-Z0-9._-]+)$/,
        );

        if (match) {
            const [_group, attr, key] = match;
            element.setAttribute(attr, i18next.t(key));
            return;
        }

        element.textContent = i18next.t(i18nAttr);
    });
}
