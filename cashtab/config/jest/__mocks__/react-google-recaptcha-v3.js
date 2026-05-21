// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

module.exports = {
    GoogleReCaptchaProvider: ({ children }) => children,
    useGoogleReCaptcha: () => ({
        executeRecaptcha: async () => 'mocked-recaptcha-v3-token',
    }),
};
