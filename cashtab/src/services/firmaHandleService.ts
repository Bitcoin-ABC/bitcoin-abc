// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    FIRMA_HANDLE_LOOKUP_TIMEOUT_MS,
    getFirmaHandleLookupUrl,
} from 'config/firma';

const LOOKUP_FAILED = 'Failed to resolve handle';

/**
 * Abort `controller` when `signal` fires, or immediately if already aborted.
 */
const followAbortSignal = (
    controller: AbortController,
    signal?: AbortSignal,
): (() => void) => {
    if (signal === undefined) {
        return () => undefined;
    }
    const onAbort = () => {
        controller.abort();
    };
    if (signal.aborted) {
        controller.abort();
        return () => undefined;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    return () => {
        signal.removeEventListener('abort', onAbort);
    };
};

/**
 * Resolve a Firma username to an ecash address via Patron.
 * Mirrors apps/firma handleService.resolveHandleToAddress.
 *
 * GET only — no Content-Type, so the browser can skip a CORS preflight.
 *
 * @param handle Username without `@`, already lowercased
 * @param signal Optional caller abort (hook cleanup)
 * @returns Address if occupied, null if available / restricted / missing
 */
export const resolveFirmaHandleToAddress = async (
    handle: string,
    signal?: AbortSignal,
): Promise<string | null> => {
    const controller = new AbortController();
    const stopFollowing = followAbortSignal(controller, signal);
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, FIRMA_HANDLE_LOOKUP_TIMEOUT_MS);

    try {
        if (controller.signal.aborted) {
            throw new Error(LOOKUP_FAILED);
        }

        const response = await fetch(getFirmaHandleLookupUrl(handle), {
            method: 'GET',
            signal: controller.signal,
        });

        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(LOOKUP_FAILED);
        }

        const result: { status?: string; address?: string } =
            await response.json();
        if (
            result.status === 'OCCUPIED' &&
            typeof result.address === 'string'
        ) {
            return result.address;
        }
        return null;
    } catch (err) {
        if (controller.signal.aborted) {
            throw new Error(LOOKUP_FAILED);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
        stopFollowing();
    }
};
