// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { renderHook, waitFor } from '@testing-library/react';
import { getFirmaHandleLookupUrl } from 'config/firma';
import {
    FIRMA_USERNAME_NOT_FOUND,
    FIRMA_USERNAME_SERVICE_ERROR,
} from 'config/firma';
import { useFirmaUsernameSearch } from 'hooks/useFirmaUsernameSearch';

describe('useFirmaUsernameSearch', () => {
    const address = 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y';

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('resolves an explicit @username after debounce', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ status: 'OCCUPIED', address }),
        } as Response);

        const { result } = renderHook(() =>
            useFirmaUsernameSearch({
                query: '@Alice',
                enabled: true,
                debounceMs: 0,
            }),
        );

        await waitFor(() =>
            expect(result.current).toEqual({
                status: 'found',
                handle: 'alice',
                address,
            }),
        );
        expect(fetch).toHaveBeenCalledWith(getFirmaHandleLookupUrl('alice'), {
            method: 'GET',
            signal: expect.any(AbortSignal),
        });
    });

    it('reports not found when Patron has no address', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ status: 'AVAILABLE' }),
        } as Response);

        const { result } = renderHook(() =>
            useFirmaUsernameSearch({
                query: '@missing',
                enabled: true,
                debounceMs: 0,
            }),
        );

        await waitFor(() =>
            expect(result.current).toEqual({
                status: 'none',
                handle: 'missing',
                message: FIRMA_USERNAME_NOT_FOUND,
            }),
        );
    });

    it('reports a service error when the lookup throws', async () => {
        jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));

        const { result } = renderHook(() =>
            useFirmaUsernameSearch({
                query: '@alice',
                enabled: true,
                debounceMs: 0,
            }),
        );

        await waitFor(() =>
            expect(result.current).toEqual({
                status: 'error',
                handle: 'alice',
                message: FIRMA_USERNAME_SERVICE_ERROR,
            }),
        );
    });

    it('validates explicit @ input without fetching', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');

        const { result } = renderHook(() =>
            useFirmaUsernameSearch({
                query: '@alice-bob',
                enabled: true,
                debounceMs: 0,
            }),
        );

        await waitFor(() => expect(result.current.status).toBe('invalid'));
        expect(result.current).toMatchObject({
            status: 'invalid',
            handle: 'alice-bob',
        });
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
