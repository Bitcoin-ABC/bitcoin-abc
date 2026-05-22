// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import axios from 'axios';
import config from '../config';

/** Action label passed to reCAPTCHA v3 execute() for token rewards */
export const TOKEN_REWARD_RECAPTCHA_ACTION = 'claim_token_reward';

/** Request body flag for Android native reCAPTCHA tokens */
export const RECAPTCHA_V3_ANDROID_CLIENT = 'android';

export interface RecaptchaVerifyResponse {
    success: boolean;
    score?: number;
    action?: string;
}

export interface RecaptchaEnterpriseSettings {
    projectId: string;
    apiKey: string;
    androidSiteKey: string;
}

interface RecaptchaEnterpriseAssessmentResponse {
    tokenProperties?: {
        valid?: boolean;
        invalidReason?: string;
        action?: string;
    };
    riskAnalysis?: {
        score?: number;
    };
}

export interface RecaptchaRequestMeta {
    userIpAddress?: string;
    userAgent?: string;
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

/**
 * Verify an Android native reCAPTCHA token with CreateAssessment.
 */
export const verifyRecaptchaEnterpriseToken = async (
    enterprise: RecaptchaEnterpriseSettings,
    token: string,
    expectedAction: string,
    requestMeta: RecaptchaRequestMeta = {},
): Promise<RecaptchaVerifyResponse> => {
    const url = `${config.recaptchaEnterpriseUrl}/projects/${enterprise.projectId}/assessments`;
    const response = await axios.post<RecaptchaEnterpriseAssessmentResponse>(
        url,
        {
            event: {
                token,
                siteKey: enterprise.androidSiteKey,
                expectedAction,
                ...(requestMeta.userIpAddress
                    ? { userIpAddress: requestMeta.userIpAddress }
                    : {}),
                ...(requestMeta.userAgent
                    ? { userAgent: requestMeta.userAgent }
                    : {}),
            },
        },
        {
            params: {
                key: enterprise.apiKey,
            },
        },
    );
    const { tokenProperties, riskAnalysis } = response.data;
    return {
        success: tokenProperties?.valid === true,
        score: riskAnalysis?.score,
        action: tokenProperties?.action,
    };
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
    expectedAction?: string,
): string | null => {
    if (verification.success !== true) {
        return 'Recaptcha check failed. Are you a bot?';
    }
    if (
        typeof expectedAction === 'string' &&
        typeof verification.action === 'string' &&
        verification.action !== expectedAction
    ) {
        return 'Recaptcha action mismatch. Are you a bot?';
    }
    if (
        typeof verification.score !== 'number' ||
        verification.score < minScore
    ) {
        return 'Recaptcha score too low. Are you a bot?';
    }
    return null;
};

export const verifyTokenRewardRecaptcha = async (
    token: string,
    recaptchaClient: string | undefined,
    recaptchaV3Secret: string,
    recaptchaV3MinScore: number,
    recaptchaEnterprise: RecaptchaEnterpriseSettings | null,
    requestMeta: RecaptchaRequestMeta = {},
): Promise<string | null> => {
    if (recaptchaClient === RECAPTCHA_V3_ANDROID_CLIENT) {
        if (recaptchaEnterprise === null) {
            return 'Android reCAPTCHA verification is not configured on this server';
        }
        const verification = await verifyRecaptchaEnterpriseToken(
            recaptchaEnterprise,
            token,
            TOKEN_REWARD_RECAPTCHA_ACTION,
            requestMeta,
        );
        return validateRecaptchaV3(
            verification,
            recaptchaV3MinScore,
            TOKEN_REWARD_RECAPTCHA_ACTION,
        );
    }

    const verification = await verifyRecaptchaToken(recaptchaV3Secret, token);
    return validateRecaptchaV3(verification, recaptchaV3MinScore);
};
