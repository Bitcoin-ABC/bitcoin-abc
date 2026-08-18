// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { useEffect, useState } from 'react';
import {
    FIRMA_USERNAME_NOT_FOUND,
    FIRMA_USERNAME_SERVICE_ERROR,
} from 'config/firma';
import { resolveFirmaHandleToAddress } from 'services/firmaHandleService';
import {
    getFirmaUsernameCandidate,
    isExplicitFirmaUsernameInput,
    validateFirmaUsername,
} from 'components/Send/helpers/recipientResolve';

export const FIRMA_USERNAME_SEARCH_DEBOUNCE_MS = 500;

export type FirmaUsernameSearchResult =
    | { status: 'idle' }
    | { status: 'checking'; handle: string }
    | { status: 'found'; handle: string; address: string }
    | { status: 'none'; handle: string; message: string }
    | { status: 'invalid'; handle: string; message: string }
    | { status: 'error'; handle: string; message: string };

interface UseFirmaUsernameSearchOptions {
    query: string;
    enabled: boolean;
    debounceMs?: number;
}

/**
 * Debounced Patron lookup for a typed Firma username (with or without @).
 * Same flow as apps/firma useRecipientSearch for the handle branch.
 */
export const useFirmaUsernameSearch = ({
    query,
    enabled,
    debounceMs = FIRMA_USERNAME_SEARCH_DEBOUNCE_MS,
}: UseFirmaUsernameSearchOptions): FirmaUsernameSearchResult => {
    const [result, setResult] = useState<FirmaUsernameSearchResult>({
        status: 'idle',
    });

    useEffect(() => {
        if (!enabled) {
            setResult({ status: 'idle' });
            return;
        }

        const explicit = isExplicitFirmaUsernameInput(query);
        const candidate = getFirmaUsernameCandidate(query);
        if (candidate === null) {
            if (explicit) {
                setResult({
                    status: 'invalid',
                    handle: '',
                    message: 'Username is required',
                });
                return;
            }
            setResult({ status: 'idle' });
            return;
        }

        const validationError = validateFirmaUsername(candidate);
        if (validationError !== false) {
            if (explicit) {
                setResult({
                    status: 'invalid',
                    handle: candidate,
                    message: validationError,
                });
                return;
            }
            setResult({ status: 'idle' });
            return;
        }

        let cancelled = false;
        const controller = new AbortController();
        setResult({ status: 'checking', handle: candidate });

        const timer = window.setTimeout(async () => {
            try {
                const address = await resolveFirmaHandleToAddress(
                    candidate,
                    controller.signal,
                );
                if (cancelled) {
                    return;
                }
                setResult(
                    address === null
                        ? {
                              status: 'none',
                              handle: candidate,
                              message: FIRMA_USERNAME_NOT_FOUND,
                          }
                        : {
                              status: 'found',
                              handle: candidate,
                              address,
                          },
                );
            } catch {
                if (!cancelled) {
                    setResult({
                        status: 'error',
                        handle: candidate,
                        message: FIRMA_USERNAME_SERVICE_ERROR,
                    });
                }
            }
        }, debounceMs);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query, enabled, debounceMs]);

    return result;
};
