// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import appConfig from 'config/app';
import { explorer } from 'config/explorer';
import { alpSwap } from 'config/alpSwap';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import { setAlpSwapBuyerToastSuppressed } from 'components/AlpSwap/rememberSettleTxid';
import { walletWithXecAndTokensActive } from 'components/App/fixtures/mocks';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import {
    statusUrl,
    inventoryUrl,
    spotPriceUrl,
    swapTemplateUrl,
    settleUrl,
} from 'services/alpSwapService';

const TOKEN_A =
    '488fb8fb66ce0a0a3800b83720d45b7d5acd5337b4aba71d63590708bfb4688c';
const TOKEN_B =
    '4b7ac96d8348e48d7935bddb5d3cd1352f5e8f02a1ce4b6091cb63473b27056c';
const MAKER_FEE_PCT = 0.01;
const SWAP_TXID =
    'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

const statusResponse = {
    status: 'OK',
    specVersion: 1,
    timestamp: '2026-08-31T00:00:00.000Z',
    swapAddress: 'ecash:qpz4yqv604tupwczvrez5fpetxs7cxdeuvcwznu9xh',
    slushAddress: 'ecash:qphplaceholderxxxxxxxxxxxxxxxxxxxxxxx',
    feeAddress: 'ecash:qqk7skx0u94avx4znwfj2ryv49plngf855v32pfn3c',
    postage: { sats: '1000' },
    platformFeeEnabled: false,
    tradedTokens: [
        {
            tokenId: TOKEN_A,
            decimals: 4,
            utxoQty: 1,
            utxoAtoms: '10000',
            tokenTicker: 'TKA',
            tokenName: 'Token A',
        },
        {
            tokenId: TOKEN_B,
            decimals: 2,
            utxoQty: 1,
            utxoAtoms: '100',
            tokenTicker: 'TKB',
            tokenName: 'Token B',
        },
    ],
    tradedPairs: [
        {
            aTokenId: TOKEN_A,
            bTokenId: TOKEN_B,
            feePct: MAKER_FEE_PCT,
            aUtxoQty: 1,
            bUtxoQty: 1,
        },
    ],
};

const inventoryResponse = {
    [TOKEN_A]: '5000',
    [TOKEN_B]: '5000',
};

const spotResponse = {
    rate: '1',
    feePct: MAKER_FEE_PCT,
    source: 'local-liquidity',
    reserves: {
        [TOKEN_A]: '5000000',
        [TOKEN_B]: '50000',
    },
};

const templateResponse = {
    price: '0.990099',
    fee: '0.009901',
    rate: '0.9908',
    spotRate: '1',
    priceImpactPct: 0.92,
    feePct: MAKER_FEE_PCT,
    platformFee: '0',
    platformFeePct: 0,
    platformFeeAddress: null,
    outputs: [
        {
            tokenId: TOKEN_A,
            atoms: '9901',
            script: '76a9149ee291ccce035e375060873f38d848a3cc6a09d288ac',
        },
        {
            tokenId: TOKEN_A,
            script: '76a9142de858cfe16bd61aa29b93250c8ca943f9a127a588ac',
            atoms: '99',
        },
        {
            tokenId: TOKEN_B,
            atoms: '98',
        },
    ],
    slushScript: '76a9149ee291ccce035e375060873f38d848a3cc6a09d288ac',
};

const templateResponseLarge = {
    price: '1221.7822',
    fee: '12.2178',
    rate: '0.98',
    spotRate: '1',
    priceImpactPct: 0.92,
    feePct: MAKER_FEE_PCT,
    platformFee: '0',
    platformFeePct: 0,
    platformFeeAddress: null,
    outputs: [
        {
            tokenId: TOKEN_A,
            atoms: '12217822',
            script: '76a9149ee291ccce035e375060873f38d848a3cc6a09d288ac',
        },
        {
            tokenId: TOKEN_A,
            script: '76a9142de858cfe16bd61aa29b93250c8ca943f9a127a588ac',
            atoms: '122178',
        },
        {
            tokenId: TOKEN_B,
            atoms: '121052',
        },
    ],
    slushScript: '76a9149ee291ccce035e375060873f38d848a3cc6a09d288ac',
};

const jsonResponse = (body: unknown) => ({
    ok: true,
    status: 200,
    json: async () => body,
});

const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${appConfig.coingeckoId}&vs_currencies=usd&include_last_updated_at=true`;

const mockAlpSwapFetch = () => {
    global.fetch = jest.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url === priceApiUrl) {
                return jsonResponse({
                    ecash: {
                        usd: 0.00003,
                        last_updated_at: 1706644626,
                    },
                }) as Response;
            }
            if (url === statusUrl()) {
                return jsonResponse(statusResponse) as Response;
            }
            if (url === inventoryUrl()) {
                return jsonResponse(inventoryResponse) as Response;
            }
            if (
                url === spotPriceUrl(TOKEN_A, TOKEN_B) ||
                url === spotPriceUrl(TOKEN_B, TOKEN_A)
            ) {
                return jsonResponse(spotResponse) as Response;
            }
            if (
                url ===
                swapTemplateUrl(TOKEN_A, TOKEN_B, {
                    from: '1',
                    feePct: MAKER_FEE_PCT,
                })
            ) {
                return jsonResponse(templateResponse) as Response;
            }
            if (
                url ===
                swapTemplateUrl(TOKEN_A, TOKEN_B, {
                    from: '1234',
                    feePct: MAKER_FEE_PCT,
                })
            ) {
                return jsonResponse(templateResponseLarge) as Response;
            }
            if (
                url === settleUrl(TOKEN_A, TOKEN_B) &&
                init?.method === 'POST'
            ) {
                return jsonResponse({
                    success: true,
                    txid: SWAP_TXID,
                    postagePaidSats: '1000',
                }) as Response;
            }
            throw new Error(`Unexpected fetch: ${url}`);
        },
    ) as jest.Mock;
};

const seedTokenChronik = (mockedChronik: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setToken: (tokenId: string, token: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTx: (txid: string, tx: any) => void;
}) => {
    for (const [tokenId, ticker, name, decimals] of [
        [TOKEN_A, 'TKA', 'Token A', 4],
        [TOKEN_B, 'TKB', 'Token B', 2],
    ] as const) {
        mockedChronik.setToken(tokenId, {
            tokenId,
            tokenType: {
                protocol: 'ALP',
                type: 'ALP_TOKEN_TYPE_STANDARD',
                number: 0,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: ticker,
                tokenName: name,
                url: 'https://cashtab.com/',
                decimals,
                data: '',
                authPubkey: '00'.repeat(33),
            },
        });
        mockedChronik.setTx(tokenId, {
            txid: tokenId,
            version: 2,
            inputs: [],
            outputs: [{ sats: 0n, outputScript: '6a00' }],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 100,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        });
    }
};

const walletWithAlpSwapBalance = {
    ...walletWithXecAndTokensActive,
    state: {
        ...walletWithXecAndTokensActive.state,
        slpUtxos: [
            ...walletWithXecAndTokensActive.state.slpUtxos,
            {
                outpoint: {
                    txid: 'cc'.repeat(32),
                    outIdx: 1,
                },
                blockHeight: 800000,
                isCoinbase: false,
                sats: 546n,
                isFinal: true,
                token: {
                    tokenId: TOKEN_A,
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 100_000_000n,
                    isMintBaton: false,
                },
            },
        ],
        tokens: new Map([
            ...walletWithXecAndTokensActive.state.tokens,
            [TOKEN_A, '10000'],
            [TOKEN_B, '100'],
        ]),
    },
};

describe('<AlpSwap />', () => {
    beforeEach(() => {
        mockAlpSwapFetch();
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
        setAlpSwapBuyerToastSuppressed(false);
        await clearLocalForage(localforage);
    });

    it('Renders the AlpSwap screen and loads available pairs', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithAlpSwapBalance,
            localforage,
        );
        seedTokenChronik(
            mockedChronik as {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setToken: (tokenId: string, token: any) => void;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTx: (txid: string, tx: any) => void;
            },
        );

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alpswap" />);

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        expect(screen.getByTitle('AlpSwap')).toBeInTheDocument();
        expect(screen.getByText('Experimental')).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: 'AlpSwap experimental info' }),
        );
        expect(
            screen.getByText(/two ALP tokens can trade against each other/),
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'OK' }));
        expect(
            screen.queryByText(/two ALP tokens can trade against each other/),
        ).not.toBeInTheDocument();

        await waitFor(() =>
            expect(
                screen.getByRole('listitem', {
                    name: /Select pair TKA and TKB/i,
                }),
            ).toBeInTheDocument(),
        );

        expect(screen.getByLabelText(/You pay TKA/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/You receive TKB/i)).toBeInTheDocument();

        // Mock liquidity totals are 5000; Balance/Liquidity use toLocaleString.
        expect(screen.getByText(/Liquidity: 5,000/)).toBeInTheDocument();

        expect(fetch).toHaveBeenCalledWith(
            statusUrl(),
            expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
        expect(fetch).toHaveBeenCalledWith(
            inventoryUrl(),
            expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
    });

    it('Selects the pair from from/to query params', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithAlpSwapBalance,
            localforage,
        );
        seedTokenChronik(
            mockedChronik as {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setToken: (tokenId: string, token: any) => void;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTx: (txid: string, tx: any) => void;
            },
        );

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/alpswap?from=${TOKEN_B}&to=${TOKEN_A}`}
            />,
        );

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        await waitFor(() =>
            expect(screen.getByLabelText(/You pay TKB/i)).toBeInTheDocument(),
        );
        expect(screen.getByLabelText(/You receive TKA/i)).toBeInTheDocument();
    });

    it('Rejects an exact-in size that would receive 0 atoms', async () => {
        global.fetch = jest.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url === priceApiUrl) {
                return jsonResponse({
                    ecash: {
                        usd: 0.00003,
                        last_updated_at: 1706644626,
                    },
                }) as Response;
            }
            if (url === statusUrl()) {
                return jsonResponse(statusResponse) as Response;
            }
            if (url === inventoryUrl()) {
                return jsonResponse(inventoryResponse) as Response;
            }
            if (url === spotPriceUrl(TOKEN_B, TOKEN_A)) {
                return jsonResponse({
                    rate: '0',
                    feePct: MAKER_FEE_PCT,
                    source: 'local-liquidity',
                    reserves: {
                        [TOKEN_B]: '49930120824',
                        [TOKEN_A]: '33814928',
                    },
                }) as Response;
            }
            if (url === spotPriceUrl(TOKEN_A, TOKEN_B)) {
                return jsonResponse(spotResponse) as Response;
            }
            if (
                url.startsWith(
                    swapTemplateUrl(TOKEN_B, TOKEN_A, {
                        from: '1',
                        feePct: MAKER_FEE_PCT,
                    }).split('?')[0],
                )
            ) {
                return jsonResponse({
                    ...templateResponse,
                    price: '0.99',
                    rate: '0',
                    spotRate: '0',
                    outputs: [
                        {
                            tokenId: TOKEN_B,
                            atoms: '99',
                            script: '76a9149ee291ccce035e375060873f38d848a3cc6a09d288ac',
                        },
                        { tokenId: TOKEN_A, atoms: '0' },
                    ],
                }) as Response;
            }
            throw new Error(`Unexpected fetch: ${url}`);
        }) as jest.Mock;

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithAlpSwapBalance,
            localforage,
        );
        seedTokenChronik(
            mockedChronik as {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setToken: (tokenId: string, token: any) => void;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTx: (txid: string, tx: any) => void;
            },
        );

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/alpswap?from=${TOKEN_B}&to=${TOKEN_A}`}
            />,
        );

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const fromInput = await screen.findByLabelText('Swap from amount');
        // Ops case: 14.86 XECX looks like 1 FIRMA atom on a linear spot,
        // but CP exact-in still yields 0 atoms.
        await userEvent.type(fromInput, '14.86');

        await waitFor(() => {
            expect(
                screen.getByText(/Minimum swap is 14\.92 \(covers fees\)/),
            ).toBeInTheDocument();
        });
        expect(screen.getByLabelText('Swap to amount')).toHaveValue('');
        expect(screen.getByRole('button', { name: /^Swap$/ })).toBeDisabled();
    });

    it('Quotes an amount and settles a swap via the chosen maker', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithAlpSwapBalance,
            localforage,
        );
        seedTokenChronik(
            mockedChronik as {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setToken: (tokenId: string, token: any) => void;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTx: (txid: string, tx: any) => void;
            },
        );

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alpswap" />);

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const fromInput = await screen.findByLabelText('Swap from amount');
        await userEvent.type(fromInput, '1');

        await act(async () => {
            await new Promise(resolve =>
                setTimeout(resolve, alpSwap.quoteDebounceMs + 50),
            );
        });

        await waitFor(() => {
            expect(screen.getByLabelText('Swap to amount')).toHaveValue('0.98');
        });

        expect(screen.getByText('Fee: 1% · Impact: 0.92%')).toBeInTheDocument();

        const swapButton = screen.getByRole('button', { name: /^Swap$/ });
        await waitFor(() => expect(swapButton).not.toBeDisabled());
        await userEvent.click(swapButton);

        const postedSettleUrl = settleUrl(TOKEN_A, TOKEN_B);
        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(
                postedSettleUrl,
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                }),
            );
        });

        const settleCall = (fetch as jest.Mock).mock.calls.find(
            ([url, init]) =>
                url === postedSettleUrl && init && init.method === 'POST',
        );
        expect(settleCall).toBeDefined();
        const body = JSON.parse(settleCall![1].body);
        expect(body.tokenId).toBe(TOKEN_B);
        expect(body.atoms).toBe('98');
        expect(typeof body.serializedTxHex).toBe('string');
        expect(body.serializedTxHex.length).toBeGreaterThan(100);
        expect(body.prePostageInputSats).toBe('546');

        const successNotification = await screen.findByText(
            'Swapped 1 TKA → 0.98 TKB',
        );
        expect(successNotification).toHaveAttribute(
            'href',
            `${explorer.blockExplorerUrl}/tx/${SWAP_TXID}`,
        );
    });

    it('Rejects from-amounts too small to cover fee outputs', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithAlpSwapBalance,
            localforage,
        );
        seedTokenChronik(
            mockedChronik as {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setToken: (tokenId: string, token: any) => void;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTx: (txid: string, tx: any) => void;
            },
        );

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alpswap" />);

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for pairs UI, then flip TOKEN_A (4dp) → TOKEN_B (2dp) as from.
        const flipButton = await screen.findByRole('button', {
            name: 'Flip swap direction',
        });
        await userEvent.click(flipButton);

        await waitFor(() =>
            expect(screen.getByLabelText(/You pay TKB/i)).toBeInTheDocument(),
        );

        const fromInput = await screen.findByLabelText('Swap from amount');
        await userEvent.type(fromInput, '0.1');

        await waitFor(() => {
            expect(
                screen.getByText(
                    /Balance:.*— Minimum swap is 0\.51 \(covers fees\)/,
                ),
            ).toBeInTheDocument();
        });
        expect(
            screen.queryByText(/Minimum receive is/),
        ).not.toBeInTheDocument();

        expect(screen.getByRole('button', { name: /^Swap$/ })).toBeDisabled();

        // Fee rejection should short-circuit before a template GET for TOKEN_B.
        await act(async () => {
            await new Promise(resolve =>
                setTimeout(resolve, alpSwap.quoteDebounceMs + 50),
            );
        });
        expect(
            (fetch as jest.Mock).mock.calls.some(([url]) =>
                String(url).includes(`${TOKEN_B}/${TOKEN_A}/amm/`),
            ),
        ).toBe(false);
    });

    it('Rejects to-amounts too small to cover fee outputs with min receive', async () => {
        const highSpotRate = 149032;
        global.fetch = jest.fn(
            async (input: RequestInfo | URL, _init?: RequestInit) => {
                const url = String(input);
                if (url === priceApiUrl) {
                    return jsonResponse({
                        ecash: {
                            usd: 0.00003,
                            last_updated_at: 1706644626,
                        },
                    }) as Response;
                }
                if (url === statusUrl()) {
                    return jsonResponse(statusResponse) as Response;
                }
                if (url === inventoryUrl()) {
                    return jsonResponse(inventoryResponse) as Response;
                }
                if (
                    url === spotPriceUrl(TOKEN_A, TOKEN_B) ||
                    url === spotPriceUrl(TOKEN_B, TOKEN_A)
                ) {
                    return jsonResponse({
                        ...spotResponse,
                        rate: String(highSpotRate),
                    }) as Response;
                }
                throw new Error(`Unexpected fetch: ${url}`);
            },
        ) as jest.Mock;

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithAlpSwapBalance,
            localforage,
        );
        seedTokenChronik(
            mockedChronik as {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setToken: (tokenId: string, token: any) => void;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTx: (txid: string, tx: any) => void;
            },
        );

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alpswap" />);

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        await waitFor(() =>
            expect(screen.getByLabelText(/You pay TKA/i)).toBeInTheDocument(),
        );

        // Wait for spot rate so exact-out min uses the mocked high rate.
        await waitFor(() =>
            expect(
                screen.getByText(new RegExp(String(highSpotRate))),
            ).toBeInTheDocument(),
        );

        const toInput = await screen.findByLabelText('Swap to amount');
        await userEvent.type(toInput, '1');

        await waitFor(() => {
            expect(
                screen.getByText(/Minimum receive is 752\.54 \(covers fees\)/),
            ).toBeInTheDocument();
        });

        // Error is on the receive/liquidity line, not the from-token min.
        expect(
            screen.getByText(
                /Liquidity: 5,000 — Minimum receive is 752\.54 \(covers fees\)/,
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(/Minimum swap is 0\.0051/),
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/Balance:.*Minimum/)).not.toBeInTheDocument();
        expect(screen.getByLabelText('Swap from amount')).toHaveValue('');
        expect(screen.getByRole('button', { name: /^Swap$/ })).toBeDisabled();

        await act(async () => {
            await new Promise(resolve =>
                setTimeout(resolve, alpSwap.quoteDebounceMs + 50),
            );
        });
        expect(
            (fetch as jest.Mock).mock.calls.some(
                ([url]) =>
                    String(url).includes('?to=') ||
                    String(url).includes('/amm/'),
            ),
        ).toBe(false);
    });

    it('Shows an error banner when the pairs catalog is unreachable', async () => {
        const consoleError = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);
        global.fetch = jest.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url === priceApiUrl) {
                return jsonResponse({
                    ecash: {
                        usd: 0.00003,
                        last_updated_at: 1706644626,
                    },
                }) as Response;
            }
            if (url === statusUrl() || url === inventoryUrl()) {
                throw new TypeError('Failed to fetch');
            }
            throw new Error(`Unexpected fetch: ${url}`);
        }) as jest.Mock;

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithAlpSwapBalance,
            localforage,
        );
        seedTokenChronik(
            mockedChronik as {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setToken: (tokenId: string, token: any) => void;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTx: (txid: string, tx: any) => void;
            },
        );

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alpswap" />);

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        await waitFor(() => {
            expect(
                screen.getByText(alpSwap.unavailableMessage),
            ).toBeInTheDocument();
        });
        expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('list', { name: 'Trading pairs' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText('Swap from amount'),
        ).not.toBeInTheDocument();
        expect(consoleError).toHaveBeenCalled();
        consoleError.mockRestore();
    });

    it('Shows unavailable when /status lists pairs without feePct or utxoQty', async () => {
        const consoleError = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);
        global.fetch = jest.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url === priceApiUrl) {
                return jsonResponse({
                    ecash: {
                        usd: 0.00003,
                        last_updated_at: 1706644626,
                    },
                }) as Response;
            }
            if (url === statusUrl()) {
                return jsonResponse({
                    ...statusResponse,
                    tradedTokens: [
                        { tokenId: TOKEN_A, decimals: 4 },
                        { tokenId: TOKEN_B, decimals: 2 },
                    ],
                    tradedPairs: [
                        {
                            aTokenId: TOKEN_A,
                            bTokenId: TOKEN_B,
                            feePct: MAKER_FEE_PCT,
                        },
                    ],
                }) as Response;
            }
            if (url === inventoryUrl()) {
                return jsonResponse(inventoryResponse) as Response;
            }
            throw new Error(`Unexpected fetch: ${url}`);
        }) as jest.Mock;

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithAlpSwapBalance,
            localforage,
        );
        seedTokenChronik(
            mockedChronik as {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setToken: (tokenId: string, token: any) => void;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTx: (txid: string, tx: any) => void;
            },
        );

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alpswap" />);

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        await waitFor(() => {
            expect(
                screen.getByText(alpSwap.unavailableMessage),
            ).toBeInTheDocument();
        });
        expect(
            screen.queryByRole('list', { name: 'Trading pairs' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText('Swap from amount'),
        ).not.toBeInTheDocument();
        expect(consoleError).toHaveBeenCalled();
        consoleError.mockRestore();
    });

    it('Shows an error banner when the pairs API returns an error body', async () => {
        const consoleError = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);
        global.fetch = jest.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url === priceApiUrl) {
                return jsonResponse({
                    ecash: {
                        usd: 0.00003,
                        last_updated_at: 1706644626,
                    },
                }) as Response;
            }
            if (url === statusUrl()) {
                return {
                    ok: false,
                    status: 503,
                    json: async () => ({ error: 'Alp-dex unavailable' }),
                } as Response;
            }
            if (url === inventoryUrl()) {
                return jsonResponse(inventoryResponse) as Response;
            }
            throw new Error(`Unexpected fetch: ${url}`);
        }) as jest.Mock;

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithAlpSwapBalance,
            localforage,
        );
        seedTokenChronik(
            mockedChronik as {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setToken: (tokenId: string, token: any) => void;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTx: (txid: string, tx: any) => void;
            },
        );

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alpswap" />);

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        await waitFor(() => {
            expect(
                screen.getByText(alpSwap.unavailableMessage),
            ).toBeInTheDocument();
        });
        expect(
            screen.queryByText('Alp-dex unavailable'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText('Swap from amount'),
        ).not.toBeInTheDocument();
        expect(consoleError).toHaveBeenCalled();
        consoleError.mockRestore();
    });

    it('Shows a quote error when the alp-dex template endpoint fails after catalog load', async () => {
        global.fetch = jest.fn(
            async (input: RequestInfo | URL, init?: RequestInit) => {
                const url = String(input);
                if (url === priceApiUrl) {
                    return jsonResponse({
                        ecash: {
                            usd: 0.00003,
                            last_updated_at: 1706644626,
                        },
                    }) as Response;
                }
                if (url === statusUrl()) {
                    return jsonResponse(statusResponse) as Response;
                }
                if (url === inventoryUrl()) {
                    return jsonResponse(inventoryResponse) as Response;
                }
                if (
                    url === spotPriceUrl(TOKEN_A, TOKEN_B) ||
                    url === spotPriceUrl(TOKEN_B, TOKEN_A)
                ) {
                    return jsonResponse(spotResponse) as Response;
                }
                if (url.includes('?from=') || url.includes('?to=')) {
                    return {
                        ok: false,
                        status: 502,
                        json: async () => ({
                            error: 'No liquidity for this size',
                        }),
                    } as Response;
                }
                if (
                    url === settleUrl(TOKEN_A, TOKEN_B) &&
                    init?.method === 'POST'
                ) {
                    throw new Error('settle should not run');
                }
                throw new Error(`Unexpected fetch: ${url}`);
            },
        ) as jest.Mock;

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithAlpSwapBalance,
            localforage,
        );
        seedTokenChronik(
            mockedChronik as {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setToken: (tokenId: string, token: any) => void;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTx: (txid: string, tx: any) => void;
            },
        );

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alpswap" />);

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const fromInput = await screen.findByLabelText('Swap from amount');
        await userEvent.type(fromInput, '1');

        await act(async () => {
            await new Promise(resolve =>
                setTimeout(resolve, alpSwap.quoteDebounceMs + 50),
            );
        });

        await waitFor(() => {
            expect(
                screen.getByText('No liquidity for this size'),
            ).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: /^Swap$/ })).toBeDisabled();
        expect(screen.getByLabelText('Swap to amount')).toHaveValue('');
    });

    it('Formats typed and auto-calculated amounts with en-US separators', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithAlpSwapBalance,
            localforage,
        );
        seedTokenChronik(
            mockedChronik as {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setToken: (tokenId: string, token: any) => void;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTx: (txid: string, tx: any) => void;
            },
        );

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alpswap" />);

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const fromInput = await screen.findByLabelText('Swap from amount');
        await userEvent.type(fromInput, '1234');

        expect(fromInput).toHaveValue('1,234');

        await act(async () => {
            await new Promise(resolve =>
                setTimeout(resolve, alpSwap.quoteDebounceMs + 50),
            );
        });

        await waitFor(() => {
            expect(screen.getByLabelText('Swap to amount')).toHaveValue(
                '1,210.52',
            );
        });
    });
});
