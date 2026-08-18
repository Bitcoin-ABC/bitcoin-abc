// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { getFirmaHandleLookupUrl } from 'config/firma';
import { resolveFirmaHandleToAddress } from 'services/firmaHandleService';

describe('resolveFirmaHandleToAddress', () => {
    const handle = 'alice';
    const address = 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y';

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns the address when Patron reports OCCUPIED', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ status: 'OCCUPIED', address }),
        } as Response);

        await expect(resolveFirmaHandleToAddress(handle)).resolves.toBe(
            address,
        );
        expect(fetch).toHaveBeenCalledWith(getFirmaHandleLookupUrl(handle), {
            method: 'GET',
            signal: expect.any(AbortSignal),
        });
    });

    it('returns null when the handle is AVAILABLE', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ status: 'AVAILABLE' }),
        } as Response);

        await expect(resolveFirmaHandleToAddress(handle)).resolves.toBeNull();
    });

    it('returns null on 404', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: false,
            status: 404,
        } as Response);

        await expect(resolveFirmaHandleToAddress(handle)).resolves.toBeNull();
    });

    it('throws on unexpected HTTP errors', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: false,
            status: 500,
        } as Response);

        await expect(resolveFirmaHandleToAddress(handle)).rejects.toThrow(
            'Failed to resolve handle',
        );
    });

    it('throws without fetching when the caller signal is already aborted', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        const controller = new AbortController();
        controller.abort();

        await expect(
            resolveFirmaHandleToAddress(handle, controller.signal),
        ).rejects.toThrow('Failed to resolve handle');
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
