// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Capacitor, registerPlugin } from '@capacitor/core';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useCallback } from 'react';
import {
    isRecaptchaV3Configured,
    RECAPTCHA_V3_ANDROID_CLIENT,
} from 'constants/recaptcha';

interface CashtabRecaptchaPlugin {
    execute(options: {
        action: string;
        siteKey: string;
    }): Promise<{ token: string }>;
}

/** In-app Capacitor plugin (registered in MainActivity.java) */
const CashtabRecaptcha =
    registerPlugin<CashtabRecaptchaPlugin>('CashtabRecaptcha');

export const usesNativeRecaptchaV3 = (): boolean =>
    Capacitor.getPlatform() === 'android' && isRecaptchaV3Configured();

export const executeNativeRecaptchaV3 = async (
    action: string,
): Promise<string> => {
    const siteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;
    if (!siteKey) {
        throw new Error('VITE_RECAPTCHA_V3_SITE_KEY is not configured');
    }
    const { token } = await CashtabRecaptcha.execute({ action, siteKey });
    return token;
};

export const buildTokenRewardClaimBody = (
    token: string,
): { token: string; recaptchaClient?: typeof RECAPTCHA_V3_ANDROID_CLIENT } => {
    const body: {
        token: string;
        recaptchaClient?: typeof RECAPTCHA_V3_ANDROID_CLIENT;
    } = { token };
    if (usesNativeRecaptchaV3()) {
        body.recaptchaClient = RECAPTCHA_V3_ANDROID_CLIENT;
    }
    return body;
};

/**
 * Unified execute for reCAPTCHA v3 token rewards.
 * Android uses the native SDK; web/extension uses react-google-recaptcha-v3.
 */
export const useRecaptchaV3Execute = () => {
    const { executeRecaptcha: executeWebRecaptcha } = useGoogleReCaptcha();

    const executeRecaptchaV3 = useCallback(
        async (action: string): Promise<string | null> => {
            if (usesNativeRecaptchaV3()) {
                try {
                    return await executeNativeRecaptchaV3(action);
                } catch (err) {
                    console.error(
                        'Error executing native reCAPTCHA v3 for token rewards',
                        err,
                    );
                    return null;
                }
            }
            if (!executeWebRecaptcha) {
                return null;
            }
            try {
                return await executeWebRecaptcha(action);
            } catch (err) {
                console.error(
                    'Error executing reCAPTCHA v3 for token rewards',
                    err,
                );
                return null;
            }
        },
        [executeWebRecaptcha],
    );

    return { executeRecaptchaV3 };
};
