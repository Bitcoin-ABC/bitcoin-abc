// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Pool } from 'pg';

export type PushPlatform = 'ios' | 'android' | 'web';

export type PushDeviceTokenRow = {
    id: number;
    active_address: string;
    platform: PushPlatform;
    /** Firebase Cloud Messaging registration token. */
    fcm_token: string;
};

/**
 * Upsert an FCM device token for a wallet address.
 * `updated_at` is refreshed on every register attempt so stale subscriptions
 * can be purged later (e.g. delete rows where updated_at is older than N days).
 */
export const upsertPushDeviceToken = async (
    pool: Pool,
    activeAddress: string,
    platform: PushPlatform,
    fcmToken: string,
): Promise<void> => {
    await pool.query(
        `INSERT INTO push_device_tokens (active_address, platform, fcm_token)
         VALUES ($1, $2, $3)
         ON CONFLICT (fcm_token) DO UPDATE SET
           active_address = EXCLUDED.active_address,
           platform = EXCLUDED.platform,
           updated_at = NOW()`,
        [activeAddress, platform, fcmToken],
    );
};

export const deletePushDeviceToken = async (
    pool: Pool,
    activeAddress: string,
    fcmToken: string,
): Promise<boolean> => {
    const result = await pool.query(
        `DELETE FROM push_device_tokens
         WHERE active_address = $1 AND fcm_token = $2`,
        [activeAddress, fcmToken],
    );
    return (result.rowCount ?? 0) > 0;
};

export const listPushActiveAddresses = async (
    pool: Pool,
): Promise<string[]> => {
    const result = await pool.query<{ active_address: string }>(
        `SELECT DISTINCT active_address FROM push_device_tokens ORDER BY active_address`,
    );
    return result.rows.map(row => row.active_address);
};

export const listPushTokensForActiveAddress = async (
    pool: Pool,
    activeAddress: string,
): Promise<PushDeviceTokenRow[]> => {
    const result = await pool.query<PushDeviceTokenRow>(
        `SELECT id, active_address, platform, fcm_token
         FROM push_device_tokens
         WHERE active_address = $1
         ORDER BY updated_at DESC`,
        [activeAddress],
    );
    return result.rows;
};
