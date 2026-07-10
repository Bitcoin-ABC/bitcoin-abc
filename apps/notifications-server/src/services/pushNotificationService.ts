// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Pool } from 'pg';
import { getPushMessagingClient } from './pushFirebase';
import { listPushTokensForActiveAddress } from './pushTokenStore';

/** Drawable name in the Cashtab Android app (`res/drawable/`). */
const ANDROID_NOTIFICATION_ICON = 'ic_cashtab_notification';

export type PushNotificationType = 'tx_received' | 'manual';

export type PushPayloadData = Record<string, string>;

export type SendPushParams = {
    activeAddress: string;
    notificationType: PushNotificationType;
    title: string;
    body: string;
    data?: PushPayloadData;
};

export type SendPushResult = {
    sent: number;
    skippedNoTokens: boolean;
    skippedNoFirebase: boolean;
    invalidTokensRemoved: number;
};

const isInvalidFcmTokenError = (error: unknown): boolean => {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const code = (error as { code?: string }).code;
    return (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
    );
};

export const sendPushToActiveAddress = async (
    pool: Pool,
    params: SendPushParams,
): Promise<SendPushResult> => {
    const result: SendPushResult = {
        sent: 0,
        skippedNoTokens: false,
        skippedNoFirebase: false,
        invalidTokensRemoved: 0,
    };

    const tokens = await listPushTokensForActiveAddress(
        pool,
        params.activeAddress,
    );
    if (tokens.length === 0) {
        result.skippedNoTokens = true;
        return result;
    }

    const messaging = getPushMessagingClient();
    if (messaging === null) {
        result.skippedNoFirebase = true;
        return result;
    }

    const data: PushPayloadData = {
        type: params.notificationType,
        active_address: params.activeAddress,
        ...(params.data ?? {}),
    };

    for (const row of tokens) {
        const channelId =
            params.notificationType === 'tx_received'
                ? 'cashtab_payments'
                : 'cashtab_account';
        try {
            // Web: data-only so FCM does not auto-display while we also call
            // showNotification / new Notification in the client handlers.
            if (row.platform === 'web') {
                await messaging.send({
                    token: row.fcm_token,
                    data: {
                        ...data,
                        title: params.title,
                        body: params.body,
                    },
                });
            } else if (row.platform === 'android') {
                await messaging.send({
                    token: row.fcm_token,
                    notification: {
                        title: params.title,
                        body: params.body,
                    },
                    data,
                    android: {
                        priority: 'high',
                        notification: {
                            channelId,
                            icon: ANDROID_NOTIFICATION_ICON,
                        },
                    },
                });
            } else {
                await messaging.send({
                    token: row.fcm_token,
                    notification: {
                        title: params.title,
                        body: params.body,
                    },
                    data,
                    apns: {
                        payload: {
                            aps: {
                                sound: 'default',
                            },
                        },
                    },
                });
            }
            result.sent += 1;
        } catch (error) {
            if (isInvalidFcmTokenError(error)) {
                await pool.query(
                    `DELETE FROM push_device_tokens WHERE fcm_token = $1`,
                    [row.fcm_token],
                );
                result.invalidTokensRemoved += 1;
                continue;
            }
            console.error(
                `[push] FCM send failed for ${params.activeAddress} (${row.platform}):`,
                error,
            );
        }
    }

    return result;
};
