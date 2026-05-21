// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** Action label passed to Google reCAPTCHA v3 executeRecaptcha() */
export const TOKEN_REWARD_RECAPTCHA_ACTION = 'claim_token_reward';

export const isRecaptchaV3Configured = (): boolean => {
    const siteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;
    return typeof siteKey === 'string' && siteKey.length > 0;
};
