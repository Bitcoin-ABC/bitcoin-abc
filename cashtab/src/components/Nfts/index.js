// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import { WalletContext } from 'wallet/context';
import { LoadingCtn } from 'components/Common/Atoms';
import Spinner from 'components/Common/Spinner';
import { getTokenGenesisInfo } from 'chronik';
import {
    AgoraOneshotCancelSignatory,
    AgoraOneshotSignatory,
} from 'ecash-agora';
import { Script, fromHex, toHex } from 'ecash-lib';
import {
    NftsCtn,
    OfferTitle,
    OfferTable,
    OfferCol,
    OfferRow,
    OfferIcon,
    ChronikErrorAlert,
} from './styled';
import { NftTokenIdAndCopyIcon } from 'components/Etokens/Token/styled';
import {
    TokenIconExpandButton,
    TokenSentLink,
} from 'components/Etokens/Token/styled';
import { getWalletState } from 'utils/cashMethods';
import TokenIcon from 'components/Etokens/TokenIcon';
import { explorer } from 'config/explorer';
import { hasEnoughToken } from 'wallet';
import { getUserLocale } from 'helpers';
import * as wif from 'wif';
import { getNftChildSendTargetOutputs } from 'slpv1';
import { sendXec } from 'transactions';
import appConfig from 'config/app';
import { toast } from 'react-toastify';
import NftListingActions from 'components/Common/NftListingActions';
import BrowseCollection from 'components/Common/BrowseCollection';
import { CopyIconButton } from 'components/Common/Buttons';
import { InlineLoader } from 'components/Common/Spinner';

const Nfts = () => {
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
    const walletState = getWalletState(wallet);
    const { tokens } = walletState;

    const [offeredNftsByGroupTokenId, setOfferedNftsByGroupTokenId] =
        useState(null);
    const [
        offeredNftsByGroupTokenIdThisWallet,
        setOfferedNftsByGroupTokenIdThisWallet,
    ] = useState(null);
    const [allOffersByNftTokenId, setAllOffersByNftTokenId] = useState(null);
    const [manageMyNft, setManageMyNft] = useState('');
    const [buyThisNft, setBuyThisNft] = useState('');
    const [activePublicKey, setActivePublicKey] = useState(null);
    const [chronikQueryError, setChronikQueryError] = useState(false);
    const [showMyCollectionTokenId, setShowMyCollectionTokenId] = useState('');
    const [displayedCollectionListings, setDisplayedCollectionListings] =
        useState(null);

    const getListedNfts = async sellerPk => {
        // 1. Get all offered group token IDs
        let offeredGroupTokenIds;
        try {
            offeredGroupTokenIds = await agora.offeredGroupTokenIds();
        } catch (err) {
            console.error(`Error getting agora.offeredGroupTokenIds()`, err);
            return setChronikQueryError(true);
        }

        // Initialize a set of all tokenIds where we need token info
        // This is both group tokenIds and child tokenIds
        const tokenIdsWeMayNeedToCache = new Set(offeredGroupTokenIds);

        // 2. Get all NFTs listed from the active wallet
        let activeOffersByPubKey;
        let activeOffersThisWalletTokenIds = [];

        try {
            activeOffersByPubKey = await agora.activeOffersByPubKey(
                toHex(sellerPk),
            );
            // We only want the tokenIds of these offers, so we can tell if they are
            // listed by the active wallet (can be managed) or some other wallet
            // (available to buy)

            for (const activeOffer of activeOffersByPubKey) {
                activeOffersThisWalletTokenIds.push(activeOffer.token.tokenId);
            }
        } catch (err) {
            console.error(`Error getting agora.offeredGroupTokenIds()`, err);
            return setChronikQueryError(true);
        }

        // 3. For each offeredGroupTokenId, get the offered NFTs
        // Create two maps.
        // One for the active wallet's listed NFTs (to manage them)
        // The other for all NFTs available to buy
        const offeredNftsByGroupTokenIdThisWallet = new Map();
        const offeredNftsByGroupTokenId = new Map();
        const allOffersByNftTokenId = new Map();
        for (const offeredGroupTokenId of offeredGroupTokenIds) {
            try {
                const offeredNftsThisGroup =
                    await agora.activeOffersByGroupTokenId(offeredGroupTokenId);

                // Iterate over all offered NFTS in this group to determine which are listed by this wallet
                // and which are not
                const offeredNftsThisWallet = [];
                const offeredNfts = [];
                for (const offeredNft of offeredNftsThisGroup) {
                    const { token } = offeredNft;
                    const { tokenId } = token;

                    // We also keep a map of all the offers, for easy reference
                    // This somewhat cumbersome arrangement (3 maps) is chosen to keep
                    // offers best organized for UX
                    // We need to have listings organized by pubkey, collection, and nft tokenid
                    // First map -- all NFTs by tokenId
                    allOffersByNftTokenId.set(tokenId, offeredNft);

                    tokenIdsWeMayNeedToCache.add(tokenId);
                    if (activeOffersThisWalletTokenIds.includes(tokenId)) {
                        offeredNftsThisWallet.push(offeredNft);
                    } else {
                        offeredNfts.push(offeredNft);
                    }
                }
                // We only add to the respective map if there are relevant offers
                if (offeredNftsThisWallet.length > 0) {
                    // Second map, NFTs listed by this wallet, by collection token ID
                    offeredNftsByGroupTokenIdThisWallet.set(
                        offeredGroupTokenId,
                        offeredNftsThisWallet,
                    );
                }
                if (offeredNfts.length > 0) {
                    // Third map, NFTs listed but NOT by this wallet, by collection token ID
                    offeredNftsByGroupTokenId.set(
                        offeredGroupTokenId,
                        offeredNfts,
                    );
                }
            } catch (err) {
                console.error(
                    `Error in agora.activeOffersByGroupTokenId(${offeredGroupTokenId})`,
                    err,
                );
                return setChronikQueryError(true);
            }
        }

        setOfferedNftsByGroupTokenId(offeredNftsByGroupTokenId);
        setOfferedNftsByGroupTokenIdThisWallet(
            offeredNftsByGroupTokenIdThisWallet,
        );
        setAllOffersByNftTokenId(allOffersByNftTokenId);

        // We need to get token info for all groups and NFTs to properly render UX
        let tokenCacheUpdateRequired = false;
        let tokenCache = cashtabCache.tokens;

        for (const tokenId of Array.from(tokenIdsWeMayNeedToCache)) {
            let thisTokenCachedInfo = tokenCache.get(tokenId);
            if (typeof thisTokenCachedInfo === 'undefined') {
                // If we have not cached this token before, cache it
                thisTokenCachedInfo = await getTokenGenesisInfo(
                    chronik,
                    tokenId,
                );
                tokenCache.set(tokenId, thisTokenCachedInfo);
                tokenCacheUpdateRequired = true;
            }
        }
        if (tokenCacheUpdateRequired) {
            updateCashtabState('cashtabCache', {
                ...cashtabState.cashtabCache,
                tokens: tokenCache,
            });
        }
    };

    useEffect(() => {
        if (!wallet) {
            // We only load logic if the user has an active wallet
            return;
        }
        // TODO define SK in wallet in ecash-lib-friendly format
        const sellerSk = wif.decode(
            wallet.paths.get(appConfig.derivationPath).wif,
        ).privateKey;
        const sellerPk = ecc.derivePubkey(sellerSk);
        setActivePublicKey(sellerPk);

        // On page load, look up all advertised NFTs
        getListedNfts(sellerPk);
    }, [wallet]);

    const buyListing = async () => {
        // Get info you need from the parsed Agora tx
        // The input is in the txBuilderInput key of the parsed Agora tx
        const { variant, txBuilderInput } =
            allOffersByNftTokenId.get(buyThisNft);

        const buyNftInputs = [
            {
                input: txBuilderInput,
                signatory: AgoraOneshotSignatory(
                    wif.decode(wallet.paths.get(appConfig.derivationPath).wif)
                        .privateKey,
                    activePublicKey,
                    variant.params.enforcedOutputs.length,
                ),
            },
        ];

        const buyNftTargetOutputs = [
            // enforcedOutputs are
            // index 0, slpSend script for the NFT, coloring output at index 2 as new NFT utxo
            // index 1, the payment to the seller
            ...variant.params.enforcedOutputs,
            // index 3, the colored utxo holding the NFT at the buyer's address
            {
                value: appConfig.dustSats,
                script: Script.p2pkh(
                    fromHex(wallet.paths.get(appConfig.derivationPath).hash),
                ),
            },
        ];

        let responseObj;
        try {
            responseObj = await sendXec(
                chronik,
                ecc,
                wallet,
                buyNftTargetOutputs,
                settings.minFeeSends &&
                    (hasEnoughToken(
                        tokens,
                        appConfig.vipTokens.grumpy.tokenId,
                        appConfig.vipTokens.grumpy.vipBalance,
                    ) ||
                        hasEnoughToken(
                            tokens,
                            appConfig.vipTokens.cachet.tokenId,
                            appConfig.vipTokens.cachet.vipBalance,
                        ))
                    ? appConfig.minFee
                    : appConfig.defaultFee,
                chaintipBlockheight,
                buyNftInputs,
            );

            toast(
                <TokenSentLink
                    href={`${explorer.blockExplorerUrl}/tx/${responseObj.response.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Bought NFT
                </TokenSentLink>,
                {
                    icon: <TokenIcon size={32} tokenId={buyThisNft} />,
                },
            );
        } catch (err) {
            toast.error(`${err}`);
        }

        // Hide the buy modal
        setBuyThisNft('');

        // Refresh NFT offerings
        getListedNfts(activePublicKey);
    };

    const cancelListing = async () => {
        const tokenInputs = [
            {
                input: allOffersByNftTokenId.get(manageMyNft).txBuilderInput,
                signatory: AgoraOneshotCancelSignatory(
                    wif.decode(wallet.paths.get(appConfig.derivationPath).wif)
                        .privateKey,
                ),
            },
        ];

        // Get target outputs for sending this NFT to yourself
        const cancelListingNftTargetOutputs = getNftChildSendTargetOutputs(
            manageMyNft,
            wallet.paths.get(appConfig.derivationPath).address,
        );

        let responseObj;
        try {
            responseObj = await sendXec(
                chronik,
                ecc,
                wallet,
                cancelListingNftTargetOutputs,
                settings.minFeeSends &&
                    (hasEnoughToken(
                        tokens,
                        appConfig.vipTokens.grumpy.tokenId,
                        appConfig.vipTokens.grumpy.vipBalance,
                    ) ||
                        hasEnoughToken(
                            tokens,
                            appConfig.vipTokens.cachet.tokenId,
                            appConfig.vipTokens.cachet.vipBalance,
                        ))
                    ? appConfig.minFee
                    : appConfig.defaultFee,
                chaintipBlockheight,
                tokenInputs,
            );

            toast(
                <TokenSentLink
                    href={`${explorer.blockExplorerUrl}/tx/${responseObj.response.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Canceled listing
                </TokenSentLink>,
                {
                    icon: <TokenIcon size={32} tokenId={manageMyNft} />,
                },
            );
        } catch (err) {
            toast.error(`${err}`);
        }

        setManageMyNft('');

        // Refresh NFT offerings
        getListedNfts(activePublicKey);
    };

    return (
        <>
            {(loading ||
                offeredNftsByGroupTokenId === null ||
                offeredNftsByGroupTokenIdThisWallet === null) &&
            !chronikQueryError ? (
                <LoadingCtn title="Loading tokens">
                    <Spinner />
                </LoadingCtn>
            ) : (
                <>
                    {showMyCollectionTokenId !== '' &&
                        typeof offeredNftsByGroupTokenIdThisWallet.get(
                            showMyCollectionTokenId,
                        ) !== 'undefined' && (
                            <BrowseCollection
                                collectionTokenId={showMyCollectionTokenId}
                                agoraOffers={offeredNftsByGroupTokenIdThisWallet.get(
                                    showMyCollectionTokenId,
                                )}
                                cashtabCache={cashtabCache}
                                settings={settings}
                                fiatPrice={fiatPrice}
                                userLocale={userLocale}
                                handleCancel={() =>
                                    setShowMyCollectionTokenId('')
                                }
                                handleNftIconClick={setManageMyNft}
                                listingsBelongToThisWallet={true}
                            ></BrowseCollection>
                        )}
                    {displayedCollectionListings !== null &&
                        typeof offeredNftsByGroupTokenId.get(
                            displayedCollectionListings,
                        ) !== 'undefined' && (
                            <BrowseCollection
                                collectionTokenId={displayedCollectionListings}
                                agoraOffers={offeredNftsByGroupTokenId.get(
                                    displayedCollectionListings,
                                )}
                                cashtabCache={cashtabCache}
                                settings={settings}
                                fiatPrice={fiatPrice}
                                userLocale={userLocale}
                                handleCancel={() =>
                                    setDisplayedCollectionListings(null)
                                }
                                handleNftIconClick={setBuyThisNft}
                                listingsBelongToThisWallet={false}
                            ></BrowseCollection>
                        )}
                    {manageMyNft !== '' && (
                        <NftListingActions
                            isMyNft={true}
                            title={'Manage my listed NFT'}
                            tokenId={manageMyNft}
                            cachedNftInfo={cashtabCache.tokens.get(manageMyNft)}
                            offerInfo={allOffersByNftTokenId.get(manageMyNft)}
                            fiatPrice={fiatPrice}
                            settings={settings}
                            userLocale={userLocale}
                            handleCancel={() => setManageMyNft('')}
                            handleOk={() => {
                                // Cancel listing
                                cancelListing();
                            }}
                        ></NftListingActions>
                    )}
                    {buyThisNft !== '' && (
                        <NftListingActions
                            isMyNft={false}
                            title={'Buy this NFT'}
                            tokenId={buyThisNft}
                            cachedNftInfo={cashtabCache.tokens.get(buyThisNft)}
                            offerInfo={allOffersByNftTokenId.get(buyThisNft)}
                            fiatPrice={fiatPrice}
                            settings={settings}
                            userLocale={userLocale}
                            handleCancel={() => setBuyThisNft('')}
                            handleOk={() => {
                                // Buy the NFT
                                buyListing();
                            }}
                        ></NftListingActions>
                    )}
                    {chronikQueryError ? (
                        <NftsCtn title="Chronik Query Error">
                            <ChronikErrorAlert>
                                Error querying listed NFTs. Please try again
                                later.
                            </ChronikErrorAlert>
                        </NftsCtn>
                    ) : (
                        <NftsCtn title="Listed NFTs">
                            <OfferTitle>Manage your listings</OfferTitle>

                            {offeredNftsByGroupTokenIdThisWallet.size > 0 ? (
                                <OfferTable>
                                    {Array.from(
                                        offeredNftsByGroupTokenIdThisWallet.keys(),
                                    ).map(collectionTokenId => {
                                        const cachedCollectionInfo =
                                            cashtabCache.tokens.get(
                                                collectionTokenId,
                                            );

                                        // Handle case of token info not available in cache
                                        let tokenName,
                                            tokenTicker,
                                            genesisSupply = <InlineLoader />;
                                        if (
                                            typeof cachedCollectionInfo !==
                                            'undefined'
                                        ) {
                                            tokenName =
                                                cachedCollectionInfo.genesisInfo
                                                    .tokenName;
                                            tokenTicker =
                                                cachedCollectionInfo.genesisInfo
                                                    .tokenTicker;
                                            genesisSupply =
                                                cachedCollectionInfo.genesisSupply;
                                        }

                                        const offeredNftsInThisGroup =
                                            offeredNftsByGroupTokenIdThisWallet.get(
                                                collectionTokenId,
                                            );

                                        return (
                                            <OfferCol key={collectionTokenId}>
                                                <TokenIconExpandButton
                                                    aria-label={`See your listed NFTs from the ${tokenName} collection`}
                                                    onClick={() =>
                                                        setShowMyCollectionTokenId(
                                                            collectionTokenId,
                                                        )
                                                    }
                                                >
                                                    <OfferIcon
                                                        title={
                                                            collectionTokenId
                                                        }
                                                        size={128}
                                                        tokenId={
                                                            collectionTokenId
                                                        }
                                                    />
                                                </TokenIconExpandButton>
                                                <OfferRow>
                                                    <NftTokenIdAndCopyIcon>
                                                        <a
                                                            href={`${explorer.blockExplorerUrl}/tx/${collectionTokenId}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {collectionTokenId.slice(
                                                                0,
                                                                3,
                                                            )}
                                                            ...
                                                            {collectionTokenId.slice(
                                                                -3,
                                                            )}
                                                        </a>
                                                        <CopyIconButton
                                                            data={
                                                                collectionTokenId
                                                            }
                                                            showToast
                                                            customMsg={`Collection Token ID "${collectionTokenId}" copied to clipboard`}
                                                        />
                                                    </NftTokenIdAndCopyIcon>
                                                </OfferRow>
                                                <OfferRow>
                                                    {tokenName} ({tokenTicker})
                                                </OfferRow>
                                                <OfferRow></OfferRow>
                                                <OfferRow>
                                                    {genesisSupply} NFTs
                                                </OfferRow>
                                                <OfferRow>
                                                    {
                                                        offeredNftsInThisGroup.length
                                                    }{' '}
                                                    listed
                                                </OfferRow>
                                            </OfferCol>
                                        );
                                    })}
                                </OfferTable>
                            ) : (
                                <p>You do not have any listed NFTs</p>
                            )}

                            <OfferTitle>Collections on the market</OfferTitle>

                            {offeredNftsByGroupTokenId.size > 0 ? (
                                <OfferTable>
                                    {Array.from(
                                        offeredNftsByGroupTokenId.keys(),
                                    ).map(collectionTokenId => {
                                        const cachedCollectionInfo =
                                            cashtabCache.tokens.get(
                                                collectionTokenId,
                                            );

                                        // Handle case of token info not available in cache
                                        let tokenName,
                                            tokenTicker,
                                            genesisSupply = <InlineLoader />;
                                        if (
                                            typeof cachedCollectionInfo !==
                                            'undefined'
                                        ) {
                                            tokenName =
                                                cachedCollectionInfo.genesisInfo
                                                    .tokenName;
                                            tokenTicker =
                                                cachedCollectionInfo.genesisInfo
                                                    .tokenTicker;
                                            genesisSupply =
                                                cachedCollectionInfo.genesisSupply;
                                        }

                                        const offeredNftsInThisGroup =
                                            offeredNftsByGroupTokenId.get(
                                                collectionTokenId,
                                            );

                                        return (
                                            <OfferCol key={collectionTokenId}>
                                                <TokenIconExpandButton
                                                    aria-label={`See listed NFTs from the ${tokenName} collection`}
                                                    onClick={() =>
                                                        setDisplayedCollectionListings(
                                                            collectionTokenId,
                                                        )
                                                    }
                                                >
                                                    <OfferIcon
                                                        title={
                                                            collectionTokenId
                                                        }
                                                        size={128}
                                                        tokenId={
                                                            collectionTokenId
                                                        }
                                                    />
                                                </TokenIconExpandButton>
                                                <OfferRow>
                                                    <NftTokenIdAndCopyIcon>
                                                        <a
                                                            href={`${explorer.blockExplorerUrl}/tx/${collectionTokenId}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {collectionTokenId.slice(
                                                                0,
                                                                3,
                                                            )}
                                                            ...
                                                            {collectionTokenId.slice(
                                                                -3,
                                                            )}
                                                        </a>
                                                        <CopyIconButton
                                                            data={
                                                                collectionTokenId
                                                            }
                                                            showToast
                                                            customMsg={`Collection Token ID "${collectionTokenId}" copied to clipboard`}
                                                        />
                                                    </NftTokenIdAndCopyIcon>
                                                </OfferRow>
                                                <OfferRow>
                                                    {tokenName} ({tokenTicker})
                                                </OfferRow>
                                                <OfferRow></OfferRow>
                                                <OfferRow>
                                                    {genesisSupply} NFTs
                                                </OfferRow>
                                                <OfferRow>
                                                    {
                                                        offeredNftsInThisGroup.length
                                                    }{' '}
                                                    listed
                                                </OfferRow>
                                            </OfferCol>
                                        );
                                    })}
                                </OfferTable>
                            ) : (
                                <p>No NFTs are currently listed for sale</p>
                            )}
                        </NftsCtn>
                    )}
                </>
            )}
        </>
    );
};

export default Nfts;
