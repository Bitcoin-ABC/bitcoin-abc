// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import { toHex } from 'ecash-lib';
import { Alert } from 'components/Common/Atoms';
import Spinner from 'components/Common/Spinner';
import { getTokenGenesisInfo } from 'chronik';
import {
    ActiveOffers,
    StatusText,
    TokenList,
    TokenRow,
    TokenRowName,
    TokenRowTicker,
    SectionTitle,
    SwapPairIcons,
    SwapStatusRow,
    Wrapper,
} from './styled';
import { token as tokenConfig } from 'config/token';
import TokenIcon from 'components/Etokens/TokenIcon';
import CashtabCache, { CashtabCachedTokenInfo } from 'config/CashtabCache';
import { InlineLoader } from 'components/Common/Spinner';
import PrimaryButton, { SecondaryButton } from 'components/Common/Buttons';
import Modal from 'components/Common/Modal';
import ActionButtonRow from 'components/Common/ActionButtonRow';
import { alpSwap, FeaturedAgoraSwapPair } from 'config/alpSwap';
import AlpSwapExperimentalNotice from 'components/AlpSwap/ExperimentalNotice';
import {
    alpSwapPairPath,
    featuredPairsListedOnStatus,
    fetchStatus,
} from 'services/alpSwapService';

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
    const batchSize = Math.max(1, requestLimit);
    for (let i = 0; i < promises.length; i += batchSize) {
        const thisBatch = promises.slice(i, i + batchSize);
        await Promise.allSettled(thisBatch);
        if (i + batchSize < promises.length) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }
};

// Params for batching requests to chronik on the Agora screen
const POLITE_REQUEST_LIMIT = 25;
const POLITE_INTERVAL_MS = 5000;

const Agora: React.FC = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const { chronik, agora, cashtabState, updateCashtabState, ecashWallet } =
        ContextValue;
    const { cashtabCache } = cashtabState;
    if (!ecashWallet) {
        return null;
    }
    // Note that wallets must be a non-empty array of CashtabWallet[] here, because
    // context is loaded, and App component only renders Onboarding screen if user has no wallet
    const pk = toHex(ecashWallet.pk);

    // Use a state param to keep track of how many token rows we load at once (when loading all offers)
    const [loadedOrderBooksCount, setLoadedOrderBooksCount] =
        useState(POLITE_REQUEST_LIMIT);

    // null means "still loading"; [] means loaded with no listings
    const [myListedTokenIds, setMyListedTokenIds] = useState<null | string[]>(
        null,
    );
    const [chronikQueryError, setChronikQueryError] = useState<boolean>(false);

    // Agora by default loads a limited whitelist
    // But it is possible to load all available offers, if the user is determined
    // and patient
    const [loadAllZeOffers, setLoadAllZeOffers] = useState<boolean>(false);
    const [isLoadAllPaused, setIsLoadAllPaused] = useState<boolean>(false);
    const [showConfirmLoadAllModal, setShowConfirmLoadAllModal] =
        useState<boolean>(false);

    // State variable to hold the token orderbooks we present to the user
    const [renderedTokenIds, setRenderedTokenIds] = useState<null | string[]>(
        null,
    );

    const [allOfferedTokenIds, setAllOfferedTokenIds] = useState<
        null | string[]
    >(null);

    /** Featured AlpSwap pairs on alp-dex; null while /status is in flight. */
    const [listedSwapPairs, setListedSwapPairs] = useState<
        FeaturedAgoraSwapPair[] | null
    >(null);

    useEffect(() => {
        if (!loadAllZeOffers) {
            return;
        }
        if (allOfferedTokenIds === null) {
            return;
        }
        setRenderedTokenIds(allOfferedTokenIds.slice(0, loadedOrderBooksCount));
    }, [loadAllZeOffers, allOfferedTokenIds, loadedOrderBooksCount]);

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

    const getAllListedTokensInBackground = async () => {
        // Get all offered tokens only if user opted in to load all
        let offeredFungibleTokenIds: string[];
        try {
            offeredFungibleTokenIds = await agora.offeredFungibleTokenIds();
        } catch (err) {
            console.error(`Error getting agora.offeredFungibleTokenIds()`, err);
            return setChronikQueryError(true);
        }

        let blacklist: string[];
        try {
            const response = await fetch(
                `${tokenConfig.blacklistServerUrl}/blacklist`,
            );
            // === false: mocks that omit `ok` must still succeed (see useWallet)
            if (response.ok === false) {
                throw new Error(`Blacklist server returned ${response.status}`);
            }
            const serverBlacklistResponse: ServerBlacklistResponse =
                await response.json();
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

        // Sort noBlacklistedOfferedFungibleTokenIds by tokenId
        // This keeps the order fixed for every user
        // TODO sort by trading volume
        noBlacklistedOfferedFungibleTokenIds.sort();
        setAllOfferedTokenIds(noBlacklistedOfferedFungibleTokenIds);

        // Handy to check this in Cashtab
        console.info(
            `${noBlacklistedOfferedFungibleTokenIds.length} non-blacklisted tokens with active listings.`,
        );
    };

    const getMyListingsInBackground = async () => {
        let activeOffersByPubKey;
        const offeredFungibleTokenIdsThisWallet: Set<string> = new Set();
        try {
            activeOffersByPubKey = await agora.activeOffersByPubKey(pk);
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

        const myListed = Array.from(offeredFungibleTokenIdsThisWallet).sort();
        setMyListedTokenIds(myListed);
        addUncachedTokensToCacheAndUpdateCache(myListed);
    };

    const addUncachedTokensToCacheAndUpdateCache = async (
        tokenIdsWeNeedToCache: string[],
    ) => {
        const tokenInfoPromises = [];
        for (const tokenId of Array.from(tokenIdsWeNeedToCache)) {
            if (typeof cashtabCache.tokens.get(tokenId) !== 'undefined') {
                continue;
            }
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
        let cancelled = false;
        (async () => {
            try {
                const status = await fetchStatus();
                if (!cancelled) {
                    setListedSwapPairs(
                        featuredPairsListedOnStatus(
                            alpSwap.featuredAgoraPairs,
                            status,
                        ),
                    );
                }
            } catch (err) {
                console.error('Agora: failed to load AlpSwap catalog', err);
                if (!cancelled) {
                    setListedSwapPairs([]);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        // Update offers when the wallet changes and the new pk has loaded

        if (pk === null) {
            // Do nothing if pk has not yet been set
            return;
        }
        const { whitelist } = tokenConfig;
        // Render whitelist immediately and cache only these token infos on load
        setRenderedTokenIds(whitelist);
        setMyListedTokenIds(null);
        setAllOfferedTokenIds(null);
        setLoadAllZeOffers(false);
        setIsLoadAllPaused(false);
        setLoadedOrderBooksCount(POLITE_REQUEST_LIMIT);
        addUncachedTokensToCacheAndUpdateCache(whitelist);
        getMyListingsInBackground();
    }, [pk]);

    useEffect(() => {
        if (
            allOfferedTokenIds === null ||
            !loadAllZeOffers ||
            isLoadAllPaused
        ) {
            return;
        }

        const loadMoreTokens = () => {
            setLoadedOrderBooksCount(prevCount => {
                const newCount = prevCount + POLITE_REQUEST_LIMIT;
                if (newCount <= allOfferedTokenIds.length) {
                    return newCount;
                }
                return allOfferedTokenIds.length;
            });
        };

        const intervalId = setInterval(loadMoreTokens, POLITE_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [allOfferedTokenIds, loadAllZeOffers, isLoadAllPaused]);

    useEffect(() => {
        if (!loadAllZeOffers || allOfferedTokenIds !== null) {
            return;
        }
        getAllListedTokensInBackground();
    }, [loadAllZeOffers, allOfferedTokenIds]);

    const handleStopLoadingAllOffers = () => {
        setIsLoadAllPaused(true);
    };

    const handleContinueLoadingAllOffers = () => {
        setIsLoadAllPaused(false);
    };

    const totalOfferedTokenCount =
        allOfferedTokenIds === null ? 0 : allOfferedTokenIds.length;
    const renderedTokenCount =
        !loadAllZeOffers || renderedTokenIds === null
            ? 0
            : renderedTokenIds.length;
    const isFetchingAllOffers = loadAllZeOffers && allOfferedTokenIds === null;
    const isLoadAllCompleted =
        loadAllZeOffers &&
        allOfferedTokenIds !== null &&
        renderedTokenCount === totalOfferedTokenCount;
    const loadAllProgressPercent =
        totalOfferedTokenCount === 0
            ? 0
            : Math.floor((renderedTokenCount / totalOfferedTokenCount) * 100);

    return (
        <Wrapper>
            <ActionButtonRow variant="agora" activeIndex={0} />
            {chronikQueryError ? (
                <ActiveOffers title="Chronik Query Error">
                    <Alert>
                        Error querying listed tokens. Please try again later.
                    </Alert>
                </ActiveOffers>
            ) : (
                <>
                    {showConfirmLoadAllModal && (
                        <Modal
                            title="Load all offers?"
                            description="This will query and render a large marketplace list and may be slow. Continue?"
                            handleOk={() => {
                                setLoadAllZeOffers(true);
                                setShowConfirmLoadAllModal(false);
                            }}
                            handleCancel={() =>
                                setShowConfirmLoadAllModal(false)
                            }
                            showCancelButton
                        />
                    )}
                    {renderedTokenIds === null ? (
                        <Spinner title="Loading active offers" />
                    ) : (
                        <>
                            <ActiveOffers title="Active Offers">
                                {renderedTokenIds === null ? (
                                    <InlineLoader />
                                ) : (
                                    (() => {
                                        const myOfferIds =
                                            myListedTokenIds === null
                                                ? []
                                                : myListedTokenIds;
                                        const otherTokenIds =
                                            renderedTokenIds.filter(
                                                id => !myOfferIds.includes(id),
                                            );

                                        const renderTokenRow = (
                                            tokenId: string,
                                        ) => {
                                            const cached =
                                                cashtabCache.tokens.get(
                                                    tokenId,
                                                );
                                            const name =
                                                cached?.genesisInfo
                                                    ?.tokenName ?? tokenId;
                                            const ticker =
                                                cached?.genesisInfo
                                                    ?.tokenTicker ?? '—';
                                            return (
                                                <TokenRow
                                                    key={tokenId}
                                                    as={Link}
                                                    to={`/token/${tokenId}`}
                                                >
                                                    <TokenIcon
                                                        size={64}
                                                        tokenId={tokenId}
                                                    />
                                                    <TokenRowName>
                                                        {name}
                                                        <TokenRowTicker>
                                                            {ticker}
                                                        </TokenRowTicker>
                                                    </TokenRowName>
                                                </TokenRow>
                                            );
                                        };

                                        return (
                                            <>
                                                {myListedTokenIds === null ? (
                                                    <>
                                                        <SectionTitle>
                                                            Your Listings
                                                        </SectionTitle>
                                                        <InlineLoader title="Loading your listings..." />
                                                    </>
                                                ) : (
                                                    myOfferIds.length > 0 && (
                                                        <>
                                                            <SectionTitle>
                                                                Your Listings
                                                            </SectionTitle>
                                                            <TokenList>
                                                                {myOfferIds.map(
                                                                    renderTokenRow,
                                                                )}
                                                            </TokenList>
                                                        </>
                                                    )
                                                )}
                                                {myListedTokenIds !== null &&
                                                    myOfferIds.length === 0 && (
                                                        <>
                                                            <SectionTitle>
                                                                Your Listings
                                                            </SectionTitle>
                                                            <p>
                                                                You have no
                                                                active listings.
                                                            </p>
                                                        </>
                                                    )}
                                                <div
                                                    style={{
                                                        marginTop: 24,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            alignItems:
                                                                'center',
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <SectionTitle
                                                            style={{
                                                                margin: 0,
                                                            }}
                                                        >
                                                            Swaps
                                                        </SectionTitle>
                                                        <AlpSwapExperimentalNotice />
                                                    </div>
                                                    <TokenList>
                                                        {listedSwapPairs ===
                                                        null ? (
                                                            <SwapStatusRow>
                                                                <InlineLoader title="Loading swaps..." />
                                                            </SwapStatusRow>
                                                        ) : listedSwapPairs.length ===
                                                          0 ? (
                                                            <SwapStatusRow>
                                                                No alp swaps are
                                                                currently
                                                                available
                                                            </SwapStatusRow>
                                                        ) : (
                                                            listedSwapPairs.map(
                                                                pair => (
                                                                    <TokenRow
                                                                        key={`${pair.tokenIdA}:${pair.tokenIdB}`}
                                                                        as={
                                                                            Link
                                                                        }
                                                                        to={alpSwapPairPath(
                                                                            pair.tokenIdA,
                                                                            pair.tokenIdB,
                                                                        )}
                                                                        aria-label={`Swap ${pair.tickerA} and ${pair.tickerB}`}
                                                                    >
                                                                        <SwapPairIcons>
                                                                            <TokenIcon
                                                                                size={
                                                                                    64
                                                                                }
                                                                                tokenId={
                                                                                    pair.tokenIdA
                                                                                }
                                                                            />
                                                                            <TokenIcon
                                                                                size={
                                                                                    64
                                                                                }
                                                                                tokenId={
                                                                                    pair.tokenIdB
                                                                                }
                                                                            />
                                                                        </SwapPairIcons>
                                                                        <TokenRowName>
                                                                            {`${pair.tickerA} / ${pair.tickerB}`}
                                                                            <TokenRowTicker>
                                                                                AlpSwap
                                                                            </TokenRowTicker>
                                                                        </TokenRowName>
                                                                    </TokenRow>
                                                                ),
                                                            )
                                                        )}
                                                    </TokenList>
                                                </div>
                                                <div
                                                    style={{
                                                        marginTop: 24,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            alignItems:
                                                                'center',
                                                            gap: 8,
                                                            marginBottom: 8,
                                                        }}
                                                    >
                                                        <SectionTitle
                                                            style={{
                                                                margin: 0,
                                                            }}
                                                        >
                                                            Token Offers
                                                        </SectionTitle>
                                                    </div>
                                                    {otherTokenIds.length >
                                                    0 ? (
                                                        <TokenList>
                                                            {otherTokenIds.map(
                                                                renderTokenRow,
                                                            )}
                                                        </TokenList>
                                                    ) : !loadAllZeOffers ? (
                                                        <p>
                                                            No whitelisted
                                                            tokens are currently
                                                            listed for sale. Try
                                                            loading all offers.
                                                        </p>
                                                    ) : (
                                                        <p>
                                                            No tokens are
                                                            currently listed for
                                                            sale.
                                                        </p>
                                                    )}
                                                </div>
                                            </>
                                        );
                                    })()
                                )}
                            </ActiveOffers>
                            {!loadAllZeOffers && (
                                <PrimaryButton
                                    style={{
                                        marginTop: '12px',
                                    }}
                                    onClick={() =>
                                        setShowConfirmLoadAllModal(true)
                                    }
                                >
                                    Load all offers
                                </PrimaryButton>
                            )}
                            {loadAllZeOffers && (
                                <div
                                    style={{
                                        marginTop: '12px',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.05)',
                                    }}
                                >
                                    {isFetchingAllOffers && (
                                        <div
                                            style={{
                                                margin: '8px 0 0 0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                            }}
                                        >
                                            <InlineLoader />
                                            <StatusText style={{ margin: 0 }}>
                                                Fetching full offer list...
                                            </StatusText>
                                        </div>
                                    )}
                                    {allOfferedTokenIds !== null && (
                                        <>
                                            {isLoadAllCompleted ? (
                                                <StatusText
                                                    style={{
                                                        margin: '8px 0 0 0',
                                                    }}
                                                >
                                                    All{' '}
                                                    {totalOfferedTokenCount.toLocaleString()}{' '}
                                                    tokens with offers loaded
                                                </StatusText>
                                            ) : (
                                                <>
                                                    {isLoadAllPaused && (
                                                        <StatusText
                                                            style={{
                                                                margin: '8px 0 6px 0',
                                                            }}
                                                        >
                                                            Loading paused
                                                        </StatusText>
                                                    )}
                                                    <StatusText
                                                        style={{
                                                            margin: '8px 0 6px 0',
                                                        }}
                                                    >
                                                        Loading{' '}
                                                        {renderedTokenCount} of{' '}
                                                        {totalOfferedTokenCount}{' '}
                                                        tokens (
                                                        {loadAllProgressPercent}
                                                        %)
                                                    </StatusText>
                                                    <div
                                                        style={{
                                                            width: '100%',
                                                            height: '8px',
                                                            borderRadius:
                                                                '999px',
                                                            background:
                                                                'rgba(255,255,255,0.15)',
                                                            overflow: 'hidden',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: `${loadAllProgressPercent}%`,
                                                                height: '100%',
                                                                background:
                                                                    'linear-gradient(90deg,#01a0e0 0%,#0671c0 50%,#224da8 100%)',
                                                            }}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                    {!isLoadAllCompleted && (
                                        <SecondaryButton
                                            style={{ marginTop: '10px' }}
                                            onClick={
                                                isLoadAllPaused
                                                    ? handleContinueLoadingAllOffers
                                                    : handleStopLoadingAllOffers
                                            }
                                        >
                                            {isLoadAllPaused
                                                ? 'Continue loading offers'
                                                : 'Stop loading all offers'}
                                        </SecondaryButton>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </Wrapper>
    );
};

export default Agora;
