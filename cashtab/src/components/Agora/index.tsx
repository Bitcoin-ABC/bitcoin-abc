// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useRef, useState, useEffect, useContext } from 'react';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import { Alert } from 'components/Common/Atoms';
import Spinner from 'components/Common/Spinner';
import { getTokenGenesisInfo } from 'chronik';
import {
    ActiveOffers,
    OfferTitle,
    OfferTable,
    AgoraHeader,
    SortSwitch,
    ManageSwitch,
} from './styled';
import { getUserLocale } from 'helpers';
import OrderBook, { OrderBookInfo } from './OrderBook';
import { token as tokenConfig } from 'config/token';
import CashtabCache, { CashtabCachedTokenInfo } from 'config/CashtabCache';
import { InlineLoader } from 'components/Common/Spinner';
import PrimaryButton from 'components/Common/Buttons';
import Modal from 'components/Common/Modal';
import { FIRMA } from 'constants/tokens';

interface CashtabActiveOffers {
    offeredFungibleTokenIds: string[];
    offeredFungibleTokenIdsThisWallet: string[];
}

interface ServerBlacklistResponse {
    status: string;
    tokenIds: string[];
}

const askPolitelyForTokenInfo = async (
    promises: Promise<void>[],
    requestLimit: number,
    intervalMs: number,
) => {
    if (!Array.isArray(promises) || promises.length === 0) {
        return;
    }
    const requests = promises.length;
    const batchSize = Math.floor(requests / requestLimit);
    const batchCount = Math.floor(requests / batchSize) + 1;
    for (let i = 0; i < batchCount; i++) {
        const batchStart = i * batchSize;
        const thisBatch =
            i === batchCount - 1
                ? // The last batch is whatever is left in the array
                  promises.slice(batchStart)
                : // Other batches are batchsize entries starting from i
                  promises.slice(batchStart, batchStart + batchSize);

        await Promise.all(thisBatch);

        // Wait intervalMs before asking again
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
};

// Params for batching requests to chronik on the Agora screen
const POLITE_REQUEST_LIMIT = 25;
const POLITE_INTERVAL_MS = 5000;

const Agora: React.FC = () => {
    const userLocale = getUserLocale(navigator);
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const { chronik, agora, cashtabState, updateCashtabState } = ContextValue;
    const { cashtabCache, activeWallet } = cashtabState;
    if (typeof activeWallet === 'undefined') {
        return null;
    }
    // Note that wallets must be a non-empty array of CashtabWallet[] here, because
    // context is loaded, and App component only renders Onboarding screen if user has no wallet
    const wallet = activeWallet;
    const pk = wallet.pk;

    // Use a state param to keep track of how many orderbooks we load at once
    const [loadedOrderBooksCount, setLoadedOrderBooksCount] =
        useState(POLITE_REQUEST_LIMIT);

    // active agora partial offers organized for rendering this screen
    const [activeOffersCashtab, setActiveOffersCashtab] =
        useState<null | CashtabActiveOffers>(null);
    const [chronikQueryError, setChronikQueryError] = useState<boolean>(false);
    const [manageMyOffers, setManageMyOffers] = useState<boolean>(false);
    const orderBookInfoMapRef = useRef<Map<string, OrderBookInfo>>(new Map());

    const [allOrderBooksLoaded, setAllOrderBooksLoaded] =
        useState<boolean>(false);

    // Agora by default loads a limited whitelist
    // But it is possible to load all available offers, if the user is determined
    // and patient
    const [loadAllZeOffers, setLoadAllZeOffers] = useState<boolean>(false);

    // State variable to hold the token orderbooks we present to the user
    const [renderedTokenIds, setRenderedTokenIds] = useState<null | string[]>(
        null,
    );

    // Boolean to show a confirmation modal for alarming decision to loadAllZeOffers
    const [showConfirmLoadAllModal, setShowConfirmLoadAllModal] =
        useState<boolean>(false);

    // On load, assume all whitelisted tokens have active offers
    const [whitelistedTokensWithOffers, setWhitelistedTokensWithOffers] =
        useState<string[]>(tokenConfig.whitelist);

    interface SortSwitches {
        byOfferCount: boolean;
        byTokenId: boolean;
    }
    const sortSwitchesOff: SortSwitches = {
        byOfferCount: false,
        byTokenId: false,
    };

    // App loads with offers sorted by token ID, as this is the only sort available before
    // we analyze data available from agora API calls
    const [switches, setSwitches] = useState<SortSwitches>({
        ...sortSwitchesOff,
        byTokenId: true,
    });

    const sortOrderBooksByOfferCount = () => {
        if (!orderBookInfoMapRef.current || renderedTokenIds === null) {
            return;
        }

        const sortedTokenIds = [...renderedTokenIds].sort((a, b) => {
            const offerCountA =
                orderBookInfoMapRef.current.get(a)?.offerCount || 0;
            const offerCountB =
                orderBookInfoMapRef.current.get(b)?.offerCount || 0;
            return offerCountB - offerCountA; // Sort by descending offer count
        });

        // Update the state with sorted token IDs
        setRenderedTokenIds(sortedTokenIds);
    };

    const sortOrderBooksByTokenId = () => {
        if (!orderBookInfoMapRef.current || renderedTokenIds === null) {
            return;
        }

        const sortedTokenIds = [...renderedTokenIds].sort();

        // Update the state with sorted token IDs
        setRenderedTokenIds(sortedTokenIds);
    };

    useEffect(() => {
        if (allOrderBooksLoaded) {
            if (switches.byOfferCount) {
                sortOrderBooksByOfferCount();
            } else if (switches.byTokenId) {
                sortOrderBooksByTokenId();
            }
        }
    }, [allOrderBooksLoaded, switches]);

    useEffect(() => {
        if (
            activeOffersCashtab === null ||
            allOrderBooksLoaded ||
            !loadAllZeOffers
        ) {
            // If we have not yet loaded any offers
            // Or if we have loaded all the offers
            // Or if the user is not trying to loadAllZeOffers

            // Then we do not enter this useEffect
            return;
        }

        const loadMoreOrderBooks = () => {
            setLoadedOrderBooksCount(prevCount => {
                const newCount = prevCount + POLITE_REQUEST_LIMIT;
                // Only increase if there are more to load
                if (
                    newCount <=
                    activeOffersCashtab.offeredFungibleTokenIds.length
                ) {
                    return newCount;
                }
                // Clear the interval when all are loaded
                clearInterval(intervalId);
                // Use the total when we get there
                return activeOffersCashtab.offeredFungibleTokenIds.length;
            });
        };

        const intervalId = setInterval(loadMoreOrderBooks, POLITE_INTERVAL_MS);

        // Clean up the interval when component unmounts or when all order books are loaded
        return () => clearInterval(intervalId);
    }, [activeOffersCashtab, allOrderBooksLoaded, loadAllZeOffers]);

    useEffect(() => {
        if (activeOffersCashtab === null) {
            return;
        }

        // If the user wants to loadAllZeOffers, we do polite loading of activeOffersCashtab.offeredFungibleTokenIds
        // If the user has not manually agreed to loadAllZeOffers, we only show whitelisted tokenIds that have active offers
        const tokenIdsToRender = loadAllZeOffers
            ? activeOffersCashtab.offeredFungibleTokenIds.slice(
                  0,
                  loadedOrderBooksCount,
              )
            : whitelistedTokensWithOffers;

        setRenderedTokenIds(tokenIdsToRender);
    }, [
        loadAllZeOffers,
        activeOffersCashtab,
        loadedOrderBooksCount,
        whitelistedTokensWithOffers,
    ]);

    /**
     * Specialized helper function to support use of Promise.all in adding new tokens to cache
     * While this functionality could be extended to other parts of Cashtab, for now it is
     * only necessary on this screen
     * As it is extended, this function should be generalized and refactored out of this screen
     * Leave it here for now as a model of how to do it. Ensuring the cache (local storage) is properly
     * updated with the state may need to be handled differently in a different component
     */
    const returnGetAndCacheTokenInfoPromise = (
        cashtabCache: CashtabCache,
        tokenId: string,
    ): Promise<void> => {
        return new Promise((resolve, reject) => {
            const tokenInfoPromise: Promise<CashtabCachedTokenInfo> =
                getTokenGenesisInfo(
                    chronik,
                    tokenId,
                ) as Promise<CashtabCachedTokenInfo>;
            tokenInfoPromise.then(
                result => {
                    cashtabCache.tokens.set(tokenId, result);
                    resolve();
                },
                err => {
                    reject(err);
                },
            );
        });
    };

    const getListedTokens = async () => {
        // Render the whitelist before anything so the screen loads fast
        const { whitelist } = tokenConfig;
        setRenderedTokenIds(whitelist);

        // Get all offered tokens
        let offeredFungibleTokenIds: string[];
        try {
            offeredFungibleTokenIds = await agora.offeredFungibleTokenIds();
        } catch (err) {
            console.error(`Error getting agora.offeredFungibleTokenIds()`, err);
            return setChronikQueryError(true);
        }

        // Check which tokenIds we need to cache
        // Note that we get cache info for blacklisted tokenIds
        const tokenIdsWeNeedToCache = [];
        for (const tokenId of offeredFungibleTokenIds) {
            const isCached =
                typeof cashtabCache.tokens.get(tokenId) !== 'undefined';
            if (!isCached) {
                tokenIdsWeNeedToCache.push(tokenId);
            }
        }

        // Remove unwhitelisted tokens from init whitelist
        const initRenderedTokens = [];

        for (const whitelistedTokenId of whitelist) {
            if (offeredFungibleTokenIds.includes(whitelistedTokenId)) {
                initRenderedTokens.push(whitelistedTokenId);
            }
        }

        // Handle token caching for initially rendered tokens
        addUncachedTokensToCacheAndUpdateCache(initRenderedTokens);

        // Set this now and do the rest of our calcs below in the background, as we only need them
        // if the user wants to see all
        setWhitelistedTokensWithOffers(initRenderedTokens);

        let blacklist: string[];
        try {
            const serverBlacklistResponse: ServerBlacklistResponse = await (
                await fetch(`${tokenConfig.blacklistServerUrl}/blacklist`)
            ).json();
            blacklist = serverBlacklistResponse.tokenIds;
            if (!Array.isArray(blacklist)) {
                throw new Error('Error parsing server response');
            }
        } catch (err) {
            console.error(
                `Error fetching blacklist from ${tokenConfig.blacklistServerUrl}`,
                err,
            );
            // Fall back to locally maintained blacklist
            blacklist = tokenConfig.blacklist;
        }

        // Filter offeredFungibleTokenIds for blacklisted tokens
        const noBlacklistedOfferedFungibleTokenIds =
            offeredFungibleTokenIds.filter(
                tokenId => !blacklist.includes(tokenId),
            );
        const activeBlacklistedOffers =
            offeredFungibleTokenIds.length -
            noBlacklistedOfferedFungibleTokenIds.length;
        console.info(
            `${activeBlacklistedOffers} blacklisted offer${
                activeBlacklistedOffers === 1 ? '' : 's'
            }`,
        );

        // 2. Get all offers listed from the active wallet
        let activeOffersByPubKey;
        let offeredFungibleTokenIdsThisWallet: Set<string> | string[] =
            new Set();
        try {
            activeOffersByPubKey = await agora.activeOffersByPubKey(pk);
            // Just get the tokenIds as the Orderbook will load and prepare the offers by tokenId
            for (const activeOffer of activeOffersByPubKey) {
                if (activeOffer.variant.type === 'PARTIAL') {
                    offeredFungibleTokenIdsThisWallet.add(
                        activeOffer.token.tokenId,
                    );
                }
            }
        } catch (err) {
            console.error(`Error getting agora.activeOffersByPubKey()`, err);
            return setChronikQueryError(true);
        }

        // Sort noBlacklistedOfferedFungibleTokenIds by tokenId
        // This keeps the order fixed for every user
        // TODO sort by trading volume
        noBlacklistedOfferedFungibleTokenIds.sort();
        offeredFungibleTokenIdsThisWallet = Array.from(
            offeredFungibleTokenIdsThisWallet,
        ).sort();

        setActiveOffersCashtab({
            offeredFungibleTokenIds: noBlacklistedOfferedFungibleTokenIds,
            offeredFungibleTokenIdsThisWallet:
                offeredFungibleTokenIdsThisWallet,
        });

        // Handy to check this in Cashtab
        console.info(
            `${noBlacklistedOfferedFungibleTokenIds.length} non-blacklisted tokens with active listings.`,
        );

        // Even though we load with a limitied whitelist, we still cache all tokens in the background

        // Handle token caching for all tokens
        addUncachedTokensToCacheAndUpdateCache(tokenIdsWeNeedToCache);
    };

    const addUncachedTokensToCacheAndUpdateCache = async (
        tokenIdsWeNeedToCache: string[],
    ) => {
        const tokenInfoPromises = [];
        for (const tokenId of Array.from(tokenIdsWeNeedToCache)) {
            tokenInfoPromises.push(
                returnGetAndCacheTokenInfoPromise(cashtabCache, tokenId),
            );
        }
        try {
            await askPolitelyForTokenInfo(
                tokenInfoPromises,
                POLITE_REQUEST_LIMIT,
                POLITE_INTERVAL_MS,
            );
        } catch (err) {
            console.error(`Error in Promise.all(tokenInfoPromises)`, err);
            // Cache will not be updated, token names and IDs will show spinners
        }
        if (tokenInfoPromises.length > 0) {
            // If we had new tokens to cache, update the cache
            // We handle this in the parent component (e.g. Agora) and not in OrderBook
            // because updating the cache is a UI-locking write operation
            // We would rather write one big change once than 100s of changes
            updateCashtabState({
                cashtabCache: {
                    ...cashtabState.cashtabCache,
                    tokens: cashtabCache.tokens,
                },
            });
        }
    };

    useEffect(() => {
        // Update offers when the wallet changes and the new pk has loaded

        if (pk === null) {
            // Do nothing if pk has not yet been set
            return;
        }
        // Reset when pk changes
        setActiveOffersCashtab(null);
        getListedTokens();
    }, [pk]);

    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (activeOffersCashtab === null || renderedTokenIds === null) {
            // Do nothing until we have loaded tokens to render
            return;
        }

        if (!loadAllZeOffers) {
            // If we are not loading all of the offers, create the timeout based on renderedTokenIds
            intervalIdRef.current = setInterval(() => {
                const currentSize = orderBookInfoMapRef.current.size;
                if (currentSize === renderedTokenIds.length) {
                    // We have loaded all offer info, can enable search using this info
                    setAllOrderBooksLoaded(true);

                    // Clear the interval when orderBookInfoMap is loaded
                    if (intervalIdRef.current !== null) {
                        clearInterval(intervalIdRef.current);
                        intervalIdRef.current = null; // Reset the ref to null
                    }
                }
                // Check every 5 seconds. For whitelisted tokenIds, we do not expect to do this more than once
                // But the whitelist is expected to grow, so mb we will get there
            }, 5000);

            // Cleanup the interval when the component unmounts
            return () => {
                if (intervalIdRef.current) {
                    clearInterval(intervalIdRef.current);
                }
            };
        }

        if (
            allOrderBooksLoaded == true &&
            orderBookInfoMapRef.current.size <
                activeOffersCashtab.offeredFungibleTokenIds.length
        ) {
            // Reset allOrderBooksLoaded if all order books are in fact not loaded
            // Expected behavior if the user elects to loadAllZeOffers
            setAllOrderBooksLoaded(false);
        }

        // Start the interval when the component mounts
        intervalIdRef.current = setInterval(() => {
            const currentSize = orderBookInfoMapRef.current.size;
            if (
                currentSize ===
                activeOffersCashtab.offeredFungibleTokenIds.length
            ) {
                // We have loaded all offer info, can enable search using this info
                setAllOrderBooksLoaded(true);

                // Clear the interval when orderBookInfoMap is loaded
                if (intervalIdRef.current !== null) {
                    clearInterval(intervalIdRef.current);
                    intervalIdRef.current = null; // Reset the ref to null
                }
            }
        }, 5000); // Check every 5 seconds. This can take > 30s.

        // Cleanup the interval when the component unmounts
        return () => {
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
            }
        };
    }, [activeOffersCashtab, loadAllZeOffers, renderedTokenIds]);

    return (
        <>
            {chronikQueryError ? (
                <ActiveOffers title="Chronik Query Error">
                    <Alert>
                        Error querying listed tokens. Please try again later.
                    </Alert>
                </ActiveOffers>
            ) : (
                <>
                    {renderedTokenIds === null ? (
                        <Spinner title="Loading active offers" />
                    ) : (
                        <>
                            {showConfirmLoadAllModal &&
                                activeOffersCashtab !== null && (
                                    <Modal
                                        title={`Load all agora offers?`}
                                        description={`We have ${activeOffersCashtab.offeredFungibleTokenIds.length.toLocaleString(
                                            userLocale,
                                            {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            },
                                        )} listings. This will take a long time and the screen will be slow.`}
                                        handleOk={() => {
                                            // Manually update the sort switch to sort by tokenId
                                            // We need to update orderbookMap with all of the offers
                                            // before we can offer sort by other params
                                            setSwitches({
                                                ...sortSwitchesOff,
                                                byTokenId: true,
                                            });
                                            // Start loading all the offers
                                            setLoadAllZeOffers(true);
                                            // Hide this modal
                                            setShowConfirmLoadAllModal(false);
                                        }}
                                        handleCancel={() =>
                                            setShowConfirmLoadAllModal(false)
                                        }
                                    />
                                )}
                            <AgoraHeader>
                                <h2>Token Offers</h2>
                                <div>
                                    {!manageMyOffers && (
                                        <>
                                            Sort by:
                                            <SortSwitch
                                                disabled={false}
                                                active={switches.byTokenId}
                                                title="Sort by TokenId"
                                                onClick={() =>
                                                    setSwitches({
                                                        ...sortSwitchesOff,
                                                        byTokenId: true,
                                                    })
                                                }
                                            >
                                                TokenID
                                            </SortSwitch>
                                            <SortSwitch
                                                disabled={!allOrderBooksLoaded}
                                                active={switches.byOfferCount}
                                                title="Sort by Offer Count"
                                                onClick={
                                                    allOrderBooksLoaded
                                                        ? () =>
                                                              setSwitches({
                                                                  ...sortSwitchesOff,
                                                                  byOfferCount: true,
                                                              })
                                                        : undefined
                                                }
                                            >
                                                Offers
                                                {!allOrderBooksLoaded && (
                                                    <div>
                                                        <InlineLoader title="Loading OrderBook info..." />
                                                    </div>
                                                )}
                                            </SortSwitch>
                                        </>
                                    )}
                                    <ManageSwitch
                                        title="Toggle Active Offers"
                                        onClick={() => {
                                            setManageMyOffers(
                                                () => !manageMyOffers,
                                            );
                                        }}
                                    >
                                        {!manageMyOffers
                                            ? 'My Listings'
                                            : 'All Offers'}
                                    </ManageSwitch>
                                </div>
                            </AgoraHeader>
                            <ActiveOffers title="Active Offers">
                                {manageMyOffers ? (
                                    <>
                                        <OfferTitle>
                                            Manage your listings
                                        </OfferTitle>

                                        {activeOffersCashtab === null ? (
                                            <InlineLoader />
                                        ) : activeOffersCashtab
                                              .offeredFungibleTokenIdsThisWallet
                                              .length > 0 ? (
                                            <OfferTable>
                                                {activeOffersCashtab.offeredFungibleTokenIdsThisWallet.map(
                                                    offeredTokenId => {
                                                        return (
                                                            <OrderBook
                                                                key={
                                                                    offeredTokenId
                                                                }
                                                                tokenId={
                                                                    offeredTokenId
                                                                }
                                                                userLocale={
                                                                    userLocale
                                                                }
                                                            />
                                                        );
                                                    },
                                                )}
                                            </OfferTable>
                                        ) : (
                                            <p>
                                                You do not have any listed
                                                tokens
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {renderedTokenIds !== null &&
                                        renderedTokenIds.length > 0 ? (
                                            <OfferTable
                                                renderedOfferCount={
                                                    renderedTokenIds.length
                                                }
                                            >
                                                {renderedTokenIds.map(
                                                    offeredTokenId => {
                                                        return (
                                                            <OrderBook
                                                                key={
                                                                    offeredTokenId
                                                                }
                                                                tokenId={
                                                                    offeredTokenId
                                                                }
                                                                userLocale={
                                                                    userLocale
                                                                }
                                                                orderBookInfoMap={
                                                                    orderBookInfoMapRef.current
                                                                }
                                                                /**
                                                                 * We want to use Websockets
                                                                 * - When we manage our own offers (see above)
                                                                 * - When we only show whitelisted offers
                                                                 *
                                                                 * We DO NOT want to use websockets
                                                                 * - When we display all offers
                                                                 *
                                                                 * We may be able to use websockets for all
                                                                 * rendered OrderBooks after we get lazy loading right
                                                                 */
                                                                noWebsocket={
                                                                    loadAllZeOffers
                                                                }
                                                                priceInFiat={
                                                                    offeredTokenId ===
                                                                    FIRMA.tokenId
                                                                }
                                                            />
                                                        );
                                                    },
                                                )}
                                            </OfferTable>
                                        ) : (
                                            <>
                                                {!loadAllZeOffers ? (
                                                    <p>
                                                        No whitelisted tokens
                                                        are currently listed for
                                                        sale. Try loading all
                                                        offers.
                                                    </p>
                                                ) : (
                                                    <p>
                                                        No tokens are currently
                                                        listed for sale.
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </ActiveOffers>
                            {!loadAllZeOffers && !manageMyOffers && (
                                <PrimaryButton
                                    style={{
                                        marginTop: '12px',
                                    }}
                                    disabled={activeOffersCashtab === null}
                                    onClick={() =>
                                        setShowConfirmLoadAllModal(true)
                                    }
                                >
                                    {activeOffersCashtab === null ? (
                                        <InlineLoader />
                                    ) : (
                                        'Load all offers'
                                    )}
                                </PrimaryButton>
                            )}
                        </>
                    )}
                </>
            )}
        </>
    );
};

export default Agora;
