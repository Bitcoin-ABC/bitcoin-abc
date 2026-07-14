// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Pool } from 'pg';
import { getPushMessagingClient } from './pushFirebase';
import { listPushTokensForActiveAddress } from './pushTokenStore';

/** Drawable name in the Cashtab Android app (`res/drawable/`). Status-bar icon. */
const ANDROID_NOTIFICATION_ICON = 'ic_cashtab_notification';

/**
 * Must match an intent-filter action on MainActivity so tapping a system
 * notification opens / focuses the app.
 */
const ANDROID_NOTIFICATION_CLICK_ACTION = 'OPEN_CASHTAB';

/** Token-server serves /512 /256 /128 /64 /32; 128 fits inline notification icons. */
const TOKEN_ICONS_BASE_URL = 'https://icons.etokens.cash';
const TOKEN_ICON_SIZE = 128;

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

const getTokenNotificationImageUrl = (tokenId: string): string =>
    `${TOKEN_ICONS_BASE_URL}/${TOKEN_ICON_SIZE}/${tokenId}.png`;

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
    const tokenImageUrl =
        typeof data.token_id === 'string' && data.token_id.length > 0
            ? getTokenNotificationImageUrl(data.token_id)
            : undefined;

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
                        ...(tokenImageUrl !== undefined
                            ? { imageUrl: tokenImageUrl }
                            : {}),
                    },
                    data,
                    android: {
                        priority: 'high',
                        notification: {
                            channelId,
                            // Small status-bar icon must be a local white drawable.
                            icon: ANDROID_NOTIFICATION_ICON,
                            // Open MainActivity (OPEN_CASHTAB intent-filter) on tap.
                            clickAction: ANDROID_NOTIFICATION_CLICK_ACTION,
                            // Token icon beside the notification text (FCM large icon).
                            ...(tokenImageUrl !== undefined
                                ? { imageUrl: tokenImageUrl }
                                : {}),
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
