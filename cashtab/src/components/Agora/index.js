// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import { WalletContext } from 'wallet/context';
import { LoadingCtn, SwitchLabel } from 'components/Common/Atoms';
import Spinner from 'components/Common/Spinner';
import { getTokenGenesisInfo } from 'chronik';

import { toHex } from 'ecash-lib';
import {
    ActiveOffers,
    OfferTitle,
    OfferTable,
    ChronikErrorAlert,
} from './styled';
import { SwitchHolder } from 'components/Etokens/Token/styled';
import { getUserLocale } from 'helpers';
import * as wif from 'wif';
import appConfig from 'config/app';
import Switch from 'components/Common/Switch';
import OrderBook from './OrderBook';

const Agora = () => {
    const userLocale = getUserLocale(navigator);
    const ContextValue = React.useContext(WalletContext);
    const {
        ecc,
        fiatPrice,
        loading,
        chronik,
        agora,
        cashtabState,
        updateCashtabState,
        chaintipBlockheight,
    } = ContextValue;
    const { wallets, settings, cashtabCache } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;

    // active agora partial offers organized for rendering this screen
    const [activeOffersCashtab, setActiveOffersCashtab] = useState(null);
    const [activePk, setActivePk] = useState(null);
    // We reload offers when this changes state. Buying or canceling an offer toggles it.
    const [buyOrCancelCount, setBuyOrCancelCount] = useState(0);
    const [chronikQueryError, setChronikQueryError] = useState(false);
    const [manageMyOffers, setManageMyOffers] = useState(false);

    /**
     * This is a helper function to allow the use of Promise.all() in creating a map of all
     * partial offers by tokenId
     *
     * Because it does specialized work particular to this screen, we define it here
     * It is tested in the integration tests for this component
     * @param {object} cashtabCache
     * @param {string} offeredTokenId
     * @param {Map} activeOffersMap
     * @param {Set} tokenIdsWeNeedToCacheSet
     * @param {object} activeOfferCounter {count: <number>}
     * @returns {Promise}
     */
    const returnGetActiveOffersByTokenIdAndAddToMapPromise = (
        cashtabCache,
        offeredTokenId,
        activeOffersMap,
        tokenIdsWeNeedToCacheSet,
        activeOfferCounter,
    ) => {
        return new Promise((resolve, reject) => {
            agora.activeOffersByTokenId(offeredTokenId).then(
                activeOffers => {
                    const offerCount = activeOffers.length;
                    // If we have any offers, add them to the map
                    if (offerCount > 0) {
                        activeOfferCounter.count += offerCount;
                        // Token ID for sale in this active offer
                        const tokenId = activeOffers[0].token.tokenId;
                        // Calculate a spot price for each offer
                        // We need to do this because we need to sort them to get the "true" spot price, i.e. the lowest price
                        // Since we are doing it, we should save the info so we do not have to recalculate it
                        // Also get the largest offer of all the offers. This will help us build
                        // a styled orderbook.
                        let deepestActiveOfferedTokens = 0n;
                        for (const activeOffer of activeOffers) {
                            const maxOfferTokens = BigInt(
                                activeOffer.token.amount,
                            );
                            if (maxOfferTokens > deepestActiveOfferedTokens) {
                                deepestActiveOfferedTokens = maxOfferTokens;
                            }

                            const askedSats =
                                activeOffer.askedSats(maxOfferTokens);

                            const askedNanoSats = askedSats * BigInt(1e9);

                            // Note this price is nanosatoshis per token satoshi
                            const spotPriceNanoSatsPerTokenSat =
                                askedNanoSats / maxOfferTokens;

                            activeOffer.spotPriceNanoSats =
                                spotPriceNanoSatsPerTokenSat;
                        }
                        // Add relative depth to each offer. If you only have one offer, it's 1.
                        // This helps us to style the orderbook
                        for (const activeOffer of activeOffers) {
                            const depthPercent =
                                (100 * Number(activeOffer.token.amount)) /
                                Number(deepestActiveOfferedTokens);
                            activeOffer.depthPercent = depthPercent;
                        }
                        // Sort activeOffers by spot price, lowest to highest
                        activeOffers.sort(
                            (a, b) =>
                                Number(a.spotPriceNanoSats) -
                                Number(b.spotPriceNanoSats),
                        );
                        // Use the spot price of a "full" accept
                        activeOffersMap.set(tokenId, activeOffers);
                        if (
                            typeof cashtabCache.tokens.get(tokenId) ===
                            'undefined'
                        ) {
                            // If we do not have the token info for this NFT cached,
                            // Add it to a set to we can query for its token info
                            tokenIdsWeNeedToCacheSet.add(tokenId);
                        }
                    }
                    resolve(true);
                },
                err => {
                    console.error(
                        `Error getting active offers for ${offeredTokenId}`,
                        err,
                    );
                    reject(err);
                },
            );
        });
    };

    /**
     * Specialized helper function to support use of Promise.all in adding new tokens to cache
     * While this functionality could be extended to other parts of Cashtab, for now it is
     * only necessary on this screen
     * As it is extended, this function should be generalized and refactored out of this screen
     * Leave it here for now as a model of how to do it. Ensuring the cache (local storage) is properly
     * updated with the state may need to be handled differently in a different component
     * @param {object} cashtabCache
     * @param {string} tokenId
     * @returns {Promise}
     */
    const returnGetAndCacheTokenInfoPromise = (cashtabCache, tokenId) => {
        return new Promise((resolve, reject) => {
            getTokenGenesisInfo(chronik, tokenId).then(
                result => {
                    cashtabCache.tokens.set(tokenId, result);
                    resolve(true);
                },
                err => {
                    reject(err);
                },
            );
        });
    };

    const getListedTokens = async () => {
        // 1. Get all offered tokens
        let offeredFungibleTokenIds;
        try {
            offeredFungibleTokenIds = await agora.offeredFungibleTokenIds();
        } catch (err) {
            console.error(`Error getting agora.offeredFungibleTokenIds()`, err);
            return setChronikQueryError(true);
        }

        // Initialize a set of all tokenIds where we need token info
        // This is both group tokenIds and child tokenIds
        const tokenIdsWeNeedToCache = new Set();

        // 2. Get all offers listed from the active wallet
        let activeOffersByPubKey;

        try {
            activeOffersByPubKey = await agora.activeOffersByPubKey(
                toHex(activePk),
            );
            // Note that for SLP Partials, unlike for NFTs
            // The active wallet may have some listings for a token
            // And other wallets may also have some listings for the same token
            // So, we cannot take the NFT shortcut of just saving the tokenIds
        } catch (err) {
            console.error(`Error getting agora.activeOffersByPubKey()`, err);
            return setChronikQueryError(true);
        }

        // 3. Create two maps.
        // One - all active offers by tokenId
        // Two - the active wallet's active offers by token ID (to manage them)
        const activeOffersByTokenId = new Map();
        const activeOffersByTokenIdThisWallet = new Map();

        // Initialize an array of specialized promises to load the UI for this screen
        const getActiveOffersByTokenIdAndAddToMapPromises = [];
        // Initialize a counter object for logging total open agora partials
        // We use an object so we can do the counting with promise.all()
        const activeOfferCounter = { count: 0 };
        for (const offeredTokenId of offeredFungibleTokenIds) {
            if (
                typeof cashtabCache.tokens.get(offeredTokenId) === 'undefined'
            ) {
                // If we do not have token info for this collection cached, keep track of it
                tokenIdsWeNeedToCache.add(offeredTokenId);
            }
            getActiveOffersByTokenIdAndAddToMapPromises.push(
                returnGetActiveOffersByTokenIdAndAddToMapPromise(
                    cashtabCache,
                    offeredTokenId,
                    activeOffersByTokenId,
                    tokenIdsWeNeedToCache,
                    activeOfferCounter,
                ),
            );
        }

        // Iterate over activeOffersByPubKey and build a map, organizing user offers by tokenId
        for (const offer of activeOffersByPubKey) {
            const tokenId = offer.token.tokenId;

            // Check if we already have offers for this tokenId
            const offersForThisToken =
                activeOffersByTokenIdThisWallet.get(tokenId);
            if (typeof offersForThisToken === 'undefined') {
                // Initialize an array
                activeOffersByTokenIdThisWallet.set(tokenId, [offer]);
            } else {
                // Add the offer to the array
                offersForThisToken.push(offer);
            }
        }

        // Calculate offer helpers
        // Need to wait until you have built activeOffersByPubKey so you know you have all offers
        // organized by tokenId
        let deepestActiveOfferedTokens = 0n;
        for (const tokenId of activeOffersByTokenIdThisWallet.keys()) {
            const activeOffers = activeOffersByTokenIdThisWallet.get(tokenId);
            for (const activeOffer of activeOffers) {
                const maxOfferTokens = BigInt(activeOffer.token.amount);
                if (maxOfferTokens > deepestActiveOfferedTokens) {
                    deepestActiveOfferedTokens = maxOfferTokens;
                }

                const askedSats = activeOffer.askedSats(maxOfferTokens);

                const NANOSATS_PER_SAT = 1e9;
                const askedNanoSats = askedSats * BigInt(NANOSATS_PER_SAT);

                const spotPriceNanoSats = askedNanoSats / maxOfferTokens;

                activeOffer.spotPriceNanoSats = spotPriceNanoSats;
            }

            // Add relative depth to each offer. If you only have one offer, it's 1.
            // This helps us to style the orderbook
            for (const activeOffer of activeOffers) {
                const depthPercent =
                    (100 * Number(activeOffer.token.amount)) /
                    Number(deepestActiveOfferedTokens);
                activeOffer.depthPercent = depthPercent;
            }
            // Sort activeOffers by spot price, lowest to highest
            activeOffers.sort(
                (a, b) =>
                    Number(a.spotPriceNanoSats) - Number(b.spotPriceNanoSats),
            );
        }

        try {
            await Promise.all(getActiveOffersByTokenIdAndAddToMapPromises);
        } catch (err) {
            console.error(
                `Error in Promise.all(
                getActiveOffersByTokenIdAndAddToMapPromises,
            )`,
                err,
            );
            return setChronikQueryError(true);
        }

        // Sort active offers by tokenId
        // This keeps the order fixed for every user
        // TODO sort by trading volume
        const sortedActiveOffersByTokenId = new Map(
            [...activeOffersByTokenId.entries()].sort((a, b) =>
                a[0].localeCompare(b[0]),
            ),
        );

        const sortedActiveOffersByTokenIdThisWallet = new Map(
            [...activeOffersByTokenIdThisWallet.entries()].sort((a, b) =>
                a[0].localeCompare(b[0]),
            ),
        );

        setActiveOffersCashtab({
            activeOffersByTokenId: sortedActiveOffersByTokenId,
            activeOffersByTokenIdThisWallet:
                sortedActiveOffersByTokenIdThisWallet,
        });

        // Handy to check this in Cashtab
        console.info(
            `${activeOffersByTokenId.size} tokens with active listings.`,
        );
        console.info(`${activeOfferCounter.count} open agora partial offers`);

        // Build an array of promises to get token info for all unknown NFTs and collections
        const tokenInfoPromises = [];
        for (const tokenId of Array.from(tokenIdsWeNeedToCache)) {
            tokenInfoPromises.push(
                returnGetAndCacheTokenInfoPromise(cashtabCache, tokenId),
            );
        }
        try {
            await Promise.all(tokenInfoPromises);
        } catch (err) {
            console.error(`Error in Promise.all(tokenInfoPromises)`, err);
            // Cache will not be updated, token names and IDs will show spinners
        }
        if (tokenInfoPromises.length > 0) {
            // If we had new tokens to cache, update the cache
            // This will replace the inline spinners with tokenIds
            // and also update cashtabCache in local storage
            updateCashtabState('cashtabCache', {
                ...cashtabState.cashtabCache,
                tokens: cashtabCache.tokens,
            });
        }
    };

    useEffect(() => {
        if (!wallet) {
            // We only load logic if the user has an active wallet
            return;
        }
        const sk = wif.decode(
            wallet.paths.get(appConfig.derivationPath).wif,
        ).privateKey;
        const pk = ecc.derivePubkey(sk);
        setActivePk(pk);
    }, [wallet]);

    useEffect(() => {
        // Update offers when the wallet changes and the new pk has loaded

        if (activePk === null) {
            // Do nothing if activePk has not yet been set
            return;
        }
        getListedTokens();
    }, [activePk]);

    // We do not actually need to count how many buys or cancels happen
    // But, we want to update the offer set every time there is a buy or cancel
    // Except, we do not want to update the offer set twice when the page loads
    // It is already updating when the public key loads
    // So we bail out here if buyOrCancelCount is 0
    useEffect(() => {
        if (buyOrCancelCount === 0) {
            // We only refresh state after a buy or cancel
            return;
        }
        // Update agora offers when they change
        getListedTokens();
    }, [buyOrCancelCount]);

    return (
        <>
            {(loading || activeOffersCashtab === null) && !chronikQueryError ? (
                <LoadingCtn title="Loading active offers">
                    <Spinner />
                </LoadingCtn>
            ) : (
                <>
                    {chronikQueryError ? (
                        <ActiveOffers title="Chronik Query Error">
                            <ChronikErrorAlert>
                                Error querying listed tokens. Please try again
                                later.
                            </ChronikErrorAlert>
                        </ActiveOffers>
                    ) : (
                        <ActiveOffers title="Active Offers">
                            <SwitchHolder>
                                <Switch
                                    name="Toggle Active Offers"
                                    on=""
                                    off=""
                                    checked={manageMyOffers}
                                    handleToggle={() => {
                                        setManageMyOffers(
                                            () => !manageMyOffers,
                                        );
                                    }}
                                />
                                <SwitchLabel>
                                    Toggle Buy / Manage Listings
                                </SwitchLabel>
                            </SwitchHolder>
                            {manageMyOffers ? (
                                <>
                                    <OfferTitle>
                                        Manage your listings
                                    </OfferTitle>

                                    {activeOffersCashtab
                                        .activeOffersByTokenIdThisWallet.size >
                                    0 ? (
                                        <OfferTable>
                                            {Array.from(
                                                activeOffersCashtab.activeOffersByTokenIdThisWallet.keys(),
                                            ).map(offeredTokenId => {
                                                return (
                                                    <OrderBook
                                                        key={offeredTokenId}
                                                        tokenId={offeredTokenId}
                                                        activeOffers={activeOffersCashtab.activeOffersByTokenIdThisWallet.get(
                                                            offeredTokenId,
                                                        )}
                                                        cachedTokenInfo={cashtabCache.tokens.get(
                                                            offeredTokenId,
                                                        )}
                                                        settings={settings}
                                                        userLocale={userLocale}
                                                        fiatPrice={fiatPrice}
                                                        activePk={activePk}
                                                        wallet={wallet}
                                                        ecc={ecc}
                                                        chronik={chronik}
                                                        chaintipBlockheight={
                                                            chaintipBlockheight
                                                        }
                                                        onAgoraAcceptOrCancel={() => {
                                                            setBuyOrCancelCount(
                                                                buyOrCancelCount +
                                                                    1,
                                                            );
                                                        }}
                                                    />
                                                );
                                            })}
                                        </OfferTable>
                                    ) : (
                                        <p>You do not have any listed tokens</p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <OfferTitle>Token Offers</OfferTitle>

                                    {activeOffersCashtab.activeOffersByTokenId
                                        .size > 0 ? (
                                        <OfferTable>
                                            {Array.from(
                                                activeOffersCashtab.activeOffersByTokenId.keys(),
                                            ).map(offeredTokenId => {
                                                return (
                                                    <OrderBook
                                                        key={offeredTokenId}
                                                        tokenId={offeredTokenId}
                                                        activeOffers={activeOffersCashtab.activeOffersByTokenId.get(
                                                            offeredTokenId,
                                                        )}
                                                        cachedTokenInfo={cashtabCache.tokens.get(
                                                            offeredTokenId,
                                                        )}
                                                        settings={settings}
                                                        userLocale={userLocale}
                                                        fiatPrice={fiatPrice}
                                                        activePk={activePk}
                                                        wallet={wallet}
                                                        ecc={ecc}
                                                        chronik={chronik}
                                                        chaintipBlockheight={
                                                            chaintipBlockheight
                                                        }
                                                        onAgoraAcceptOrCancel={() => {
                                                            setBuyOrCancelCount(
                                                                buyOrCancelCount +
                                                                    1,
                                                            );
                                                        }}
                                                    />
                                                );
                                            })}
                                        </OfferTable>
                                    ) : (
                                        <p>
                                            No tokens are currently listed for
                                            sale
                                        </p>
                                    )}
                                </>
                            )}
                        </ActiveOffers>
                    )}
                </>
            )}
        </>
    );
};

export default Agora;
