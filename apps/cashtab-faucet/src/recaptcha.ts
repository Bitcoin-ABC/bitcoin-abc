// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import axios from 'axios';
import config from '../config';

export interface RecaptchaVerifyResponse {
    success: boolean;
    score?: number;
    action?: string;
}

/**
 * Verify a reCAPTCHA token with Google's siteverify API.
 */
export const verifyRecaptchaToken = async (
    secret: string,
    token: string,
): Promise<RecaptchaVerifyResponse> => {
    const recaptchaVerification = await axios.post(config.recaptchaUrl, null, {
        params: {
            secret,
            response: token,
        },
    });
    return recaptchaVerification.data;
};

export const validateRecaptchaV2 = (
    verification: RecaptchaVerifyResponse,
): string | null => {
    if (verification.success !== true) {
        return 'Recaptcha check failed. Are you a bot?';
    }
    return null;
};

export const validateRecaptchaV3 = (
    verification: RecaptchaVerifyResponse,
    minScore: number,
): string | null => {
    if (verification.success !== true) {
        return 'Recaptcha check failed. Are you a bot?';
    }
    if (
        typeof verification.score !== 'number' ||
        verification.score < minScore
    ) {
        return 'Recaptcha score too low. Are you a bot?';
    }
    return null;
};
