// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import {
    Agora,
    AgoraOffer,
    AgoraOneshot,
    getAgoraOneshotAcceptFuelInputs,
    getAgoraCancelFuelInputs,
} from 'ecash-agora';
import wif from 'wif';
import CashtabCache, { CashtabCachedTokenInfo } from 'config/CashtabCache';
import CashtabSettings from 'config/CashtabSettings';
import { Alert, Info, TokenIdPreview } from 'components/Common/Atoms';
import { InlineLoader } from 'components/Common/Spinner';
import {
    CollectionWrapper,
    CollectionLoading,
    NftIcon,
    ListedNft,
    NftName,
    NftPrice,
    CollectionSummary,
    CollectionTitle,
    CollectionIcon,
    CollectionInfoRow,
    NftInfoRow,
    NftSwiperSlide,
    ModalFlex,
    ModalRow,
    Arrow,
    ArrowWrapper,
    CollapsibleContent,
    TitleAndIconAndCollapseArrow,
    ButtonRow,
} from './styled';
import Modal from 'components/Common/Modal';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import { getFormattedFiatPrice } from 'formatting';
import TokenIcon from 'components/Etokens/TokenIcon';
import PrimaryButton, { SecondaryButton } from 'components/Common/Buttons';
import { toast } from 'react-toastify';
import {
    toHex,
    Script,
    fromHex,
    P2PKHSignatory,
    ALL_BIP143,
    Ecc,
} from 'ecash-lib';
import {
    CashtabWallet,
    toXec,
    hasEnoughToken,
    DUMMY_KEYPAIR,
    CashtabUtxo,
} from 'wallet';
import { ignoreUnspendableUtxos } from 'transactions';
import appConfig from 'config/app';
import { ChronikClient } from 'chronik-client';
import { explorer } from 'config/explorer';
import { getTokenGenesisInfo } from 'chronik';
// Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

/**
 * Collection
 *
 * A react component for loading and rendering all active NFT offers
 * in a given SLP1 NFT Collection
 *
 * The component is designed to render even if cached token information is unavailable
 * Since NFTs are not expected to have decimals, missing cache info does not
 * impact trading quantities
 *
 * The parent component handles fetching and caching token information for the groupTokenId
 * and its child tokenIds. This is because we want to limit the numbe of write operations we
 * perform to CashtabCache.tokens, and because parent components of Collection typically
 * get and fetch this information already
 */

// Define the props interface if your component accepts props
interface CollectionProps {
    /** The tokenId of this SLP NFT1 Parent, aka Collection */
    groupTokenId: string;
    agora: Agora;
    chronik: ChronikClient;
    cashtabCache: CashtabCache;
    settings: CashtabSettings;
    fiatPrice: null | number;
    userLocale: string;
    wallet: CashtabWallet;
    // Import makerPk separately as parent component will have this
    // We do not want to calculate it in every Collection
    // TODO Cashtab should calc pk on wallet creation
    activePk: Uint8Array;
    chaintipBlockheight: number;
    ecc: Ecc;
    /**
     * Do not render token icon or name for the Collection.
     * Useful for rendering on page that already shows this info,
     * like Cashtab token page.
     */
    noCollectionInfo?: boolean;
    /**
     * Load component as a tile showing only the Collection info
     * User must click the tile to load the individual listings
     * Better for rendering multiple collections on the same screen
     */
    loadOnClick?: boolean;
}

export interface OneshotOffer extends AgoraOffer {
    variant: {
        type: 'ONESHOT';
        params: AgoraOneshot;
    };
}

/**
 * OneShotSwiper
 * Portable component swiper of Agora Oneshot offers
 */
interface OneshotSwiperProps {
    offers: OneshotOffer[];
    cashtabCache: CashtabCache;
    activePk: Uint8Array;
    settings: CashtabSettings;
    userLocale: string;
    fiatPrice: null | number;
    chronik: ChronikClient;
    ecc: Ecc;
    wallet: CashtabWallet;
    chaintipBlockheight: number;
    /**
     * We need the ability to manipulate this param in the higher order component
     * So, we pass a setter here
     * In this way, OneshotSwiper can remove offers that are bought or canceled
     * And its parent component can adjust its rendering accordingly, i.e. by showing
     * that there are now no active offers
     */
    setOffers: React.Dispatch<React.SetStateAction<null | OneshotOffer[]>>;
}
export const OneshotSwiper: React.FC<OneshotSwiperProps> = ({
    offers,
    cashtabCache,
    activePk,
    settings,
    userLocale,
    fiatPrice,
    wallet,
    chronik,
    ecc,
    chaintipBlockheight,
    setOffers,
}) => {
    const [selectedIndex, setSelectedIndex] = useState<null | number>(null);

    const removeSelectedOffer = () => {
        if (
            Array.isArray(offers) &&
            typeof selectedIndex === 'number' &&
            selectedIndex <= offers.length
        ) {
            // Reset offers to exclude selectedIndex, as it was just bought or canceled
            setOffers([
                ...offers.slice(0, selectedIndex),
                ...offers.slice(selectedIndex + 1),
            ]);
        }
        // No selectedIndex, hide confirm modals
        setSelectedIndex(null);
    };

    const acceptOffer = async (agoraOneshot: AgoraOffer) => {
        // Determine tx fee from settings
        const satsPerKb =
            settings.minFeeSends &&
            (hasEnoughToken(
                wallet.state.tokens,
                appConfig.vipTokens.grumpy.tokenId,
                appConfig.vipTokens.grumpy.vipBalance,
            ) ||
                hasEnoughToken(
                    wallet.state.tokens,
                    appConfig.vipTokens.cachet.tokenId,
                    appConfig.vipTokens.cachet.vipBalance,
                ))
                ? appConfig.minFee
                : appConfig.defaultFee;

        // Potential input utxos for this transaction
        // non-token utxos that are spendable
        const eligibleUtxos = ignoreUnspendableUtxos(
            wallet.state.nonSlpUtxos,
            chaintipBlockheight,
        );

        let acceptFuelInputs;
        try {
            acceptFuelInputs = getAgoraOneshotAcceptFuelInputs(
                agoraOneshot,
                eligibleUtxos,
                satsPerKb,
            ) as CashtabUtxo[];
        } catch (err) {
            console.error(
                'Error determining fuel inputs for offer accept',
                err,
            );
            return toast.error(`${err}`);
        }

        const signedFuelInputs = [];
        for (const fuelUtxo of acceptFuelInputs) {
            const pathInfo = wallet.paths.get(fuelUtxo.path);
            if (typeof pathInfo === 'undefined') {
                // Should never happen
                return toast.error(`No path info for ${fuelUtxo.path}`);
            }
            // Sign and prep utxos for ecash-lib inputs
            const recipientScript = Script.p2pkh(fromHex(pathInfo.hash));
            const sk = wif.decode(pathInfo.wif).privateKey;
            signedFuelInputs.push({
                input: {
                    prevOut: {
                        txid: fuelUtxo.outpoint.txid,
                        outIdx: fuelUtxo.outpoint.outIdx,
                    },
                    signData: {
                        value: fuelUtxo.value,
                        outputScript: recipientScript,
                    },
                },
                signatory: P2PKHSignatory(sk, activePk, ALL_BIP143),
            });
        }

        const defaultPathInfo = wallet.paths.get(appConfig.derivationPath);
        if (typeof defaultPathInfo === 'undefined') {
            // Should never happen
            return toast.error(`No path info for ${appConfig.derivationPath}`);
        }
        // Use an arbitrary sk, pk for the convenant
        const acceptTxSer = agoraOneshot
            .acceptTx({
                ecc,
                covenantSk: DUMMY_KEYPAIR.sk,
                covenantPk: DUMMY_KEYPAIR.pk,
                fuelInputs: signedFuelInputs,
                // Accept at default path, 1899
                recipientScript: Script.p2pkh(fromHex(defaultPathInfo.hash)),
                feePerKb: satsPerKb,
            })
            .ser();

        // We need hex so we can log it to get integration test mocks
        const hex = toHex(acceptTxSer);

        let resp;
        try {
            resp = await chronik.broadcastTx(hex);
            toast(
                <a
                    href={`${explorer.blockExplorerUrl}/tx/${resp.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {`Bought ${getNftName(agoraOneshot.token.tokenId)} for
                    ${getFormattedFiatPrice(
                        settings.fiatCurrency,
                        userLocale,
                        toXec(agoraOneshot.askedSats()),
                        fiatPrice,
                    )}`}
                </a>,
                {
                    icon: (
                        <TokenIcon
                            size={32}
                            tokenId={agoraOneshot.token.tokenId}
                        />
                    ),
                },
            );
            removeSelectedOffer();
        } catch (err) {
            console.error('Error accepting offer', err);
            toast.error(`${err}`);
        }
    };

    const cancelOffer = async (agoraOneshot: AgoraOffer) => {
        // Get user fee from settings
        const satsPerKb =
            settings.minFeeSends &&
            (hasEnoughToken(
                wallet.state.tokens,
                appConfig.vipTokens.grumpy.tokenId,
                appConfig.vipTokens.grumpy.vipBalance,
            ) ||
                hasEnoughToken(
                    wallet.state.tokens,
                    appConfig.vipTokens.cachet.tokenId,
                    appConfig.vipTokens.cachet.vipBalance,
                ))
                ? appConfig.minFee
                : appConfig.defaultFee;

        // Potential input utxos for this transaction
        // non-token utxos that are spendable
        const eligibleUtxos = ignoreUnspendableUtxos(
            wallet.state.nonSlpUtxos,
            chaintipBlockheight,
        );

        // Get utxos to cover the cancel fee
        let fuelUtxos;
        try {
            fuelUtxos = getAgoraCancelFuelInputs(
                agoraOneshot,
                eligibleUtxos,
                satsPerKb,
            ) as CashtabUtxo[];
        } catch (err) {
            console.error(
                'Error determining fuel inputs for offer cancel',
                err,
            );
            return toast.error(`${err}`);
        }

        const fuelInputs = [];
        for (const fuelUtxo of fuelUtxos) {
            const pathInfo = wallet.paths.get(fuelUtxo.path);
            if (typeof pathInfo === 'undefined') {
                // Should never happen
                return toast.error(`No path info for ${fuelUtxo.path}`);
            }
            //
            // Send the tokens back to the same address as the fuelUtxo
            const recipientScript = Script.p2pkh(fromHex(pathInfo.hash));

            // sk for the tx is the sk for this utxo
            const sk = wif.decode(pathInfo.wif).privateKey;

            // Convert from Cashtab utxo to signed ecash-lib input
            fuelInputs.push({
                input: {
                    prevOut: {
                        txid: fuelUtxo.outpoint.txid,
                        outIdx: fuelUtxo.outpoint.outIdx,
                    },
                    signData: {
                        value: fuelUtxo.value,
                        outputScript: recipientScript,
                    },
                },
                signatory: P2PKHSignatory(sk, activePk, ALL_BIP143),
            });
        }

        const defaultPathInfo = wallet.paths.get(appConfig.derivationPath);
        if (typeof defaultPathInfo === 'undefined') {
            // Should never happen
            return toast.error(`No path info for ${appConfig.derivationPath}`);
        }

        // Build the cancel tx
        const cancelTxSer = agoraOneshot
            .cancelTx({
                ecc,
                // Cashtab default path
                // This works here because we lookup cancelable offers by the same path
                // Would need a different approach if Cashtab starts supporting HD wallets
                cancelSk: wif.decode(defaultPathInfo.wif).privateKey,
                fuelInputs: fuelInputs,
                // Change to Cashtab default derivation path
                recipientScript: Script.p2pkh(fromHex(defaultPathInfo.hash)),
                feePerKb: satsPerKb,
            })
            .ser();

        // Convert to hex
        // Note that broadcastTx will accept cancelTxSer
        // But hex is a better way to store raw txs for integration tests
        const hex = toHex(cancelTxSer);

        // Broadcast the cancel tx
        let resp;
        try {
            resp = await chronik.broadcastTx(hex);
            toast(
                <a
                    href={`${explorer.blockExplorerUrl}/tx/${resp.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Canceled listing
                </a>,
                {
                    icon: (
                        <TokenIcon
                            size={32}
                            tokenId={agoraOneshot.token.tokenId}
                        />
                    ),
                },
            );
            removeSelectedOffer();
        } catch (err) {
            console.error('Error canceling offer', err);
            toast.error(`${err}`);
        }
    };

    const getNftName = (tokenId: string): string | JSX.Element => {
        const cachedNftInfo = cashtabCache.tokens.get(tokenId);
        return typeof cachedNftInfo !== 'undefined' ? (
            `${cachedNftInfo.genesisInfo.tokenName}${
                cachedNftInfo.genesisInfo.tokenTicker !== ''
                    ? ` (${cachedNftInfo.genesisInfo.tokenTicker})`
                    : ''
            }`
        ) : (
            <InlineLoader />
        );
    };

    const getConfirmationModal = () => {
        if (typeof selectedIndex !== 'number' || !Array.isArray(offers)) {
            // We can only build a confirmation modal if we have a selectedIndex
            return;
        }
        const selectedOffer = offers[selectedIndex];
        const tokenId = selectedOffer.token.tokenId;

        const nftName = getNftName(tokenId);

        const { params, type } = selectedOffer.variant;
        if (type !== 'ONESHOT') {
            //should never happen but type safety
            return;
        }
        // We know this is a ONESHOT offer but type safety
        const isMaker = toHex(activePk) === toHex(params.cancelPk);
        const priceSatoshis = params.enforcedOutputs[1].value;
        const priceXec = toXec(priceSatoshis);
        const formattedPrice = getFormattedFiatPrice(
            settings.fiatCurrency,
            userLocale,
            priceXec,
            fiatPrice,
        );

        return (
            <Modal
                height={325}
                title={`${isMaker ? 'Cancel' : 'Buy'} this listing?`}
                handleOk={
                    isMaker
                        ? () => cancelOffer(offers[selectedIndex])
                        : () => acceptOffer(offers[selectedIndex])
                }
                handleCancel={() => setSelectedIndex(null)}
            >
                <ModalFlex>
                    <ModalRow>{nftName}</ModalRow>
                    <ModalRow>
                        <TokenIcon size={128} tokenId={tokenId} />
                    </ModalRow>
                    <ModalRow>
                        <TokenIdPreview tokenId={tokenId} />
                    </ModalRow>
                    <ModalRow>{formattedPrice}</ModalRow>
                </ModalFlex>
            </Modal>
        );
    };
    return (
        <>
            {selectedIndex !== null && getConfirmationModal()}
            <Swiper
                pagination={{
                    type: 'fraction',
                }}
                navigation={true}
                modules={[Pagination, Navigation]}
                className="mySwiper"
            >
                {offers.map((offer: OneshotOffer, index: number) => {
                    const thisNftTokenId = offer.token.tokenId;
                    const cachedNftInfo =
                        cashtabCache.tokens.get(thisNftTokenId);
                    const nftName =
                        typeof cachedNftInfo !== 'undefined' ? (
                            `${cachedNftInfo.genesisInfo.tokenName}${
                                cachedNftInfo.genesisInfo.tokenTicker !== ''
                                    ? ` (${cachedNftInfo.genesisInfo.tokenTicker})`
                                    : ''
                            }`
                        ) : (
                            <InlineLoader />
                        );
                    const isMaker =
                        toHex(activePk) ===
                        toHex(offer.variant.params.cancelPk);
                    const priceSatoshis =
                        offer.variant.params.enforcedOutputs[1].value;
                    const priceXec = toXec(priceSatoshis);
                    const formattedPrice = getFormattedFiatPrice(
                        settings.fiatCurrency,
                        userLocale,
                        priceXec,
                        fiatPrice,
                    );
                    return (
                        <SwiperSlide key={offer.token.tokenId}>
                            <NftSwiperSlide>
                                <ListedNft>
                                    <NftName>{nftName}</NftName>
                                    <NftIcon
                                        tokenId={thisNftTokenId}
                                        size={256}
                                    />
                                    <NftInfoRow>
                                        <TokenIdPreview
                                            tokenId={thisNftTokenId}
                                        />
                                    </NftInfoRow>
                                    <NftPrice>{formattedPrice}</NftPrice>
                                    <ButtonRow>
                                        {isMaker ? (
                                            <SecondaryButton
                                                onClick={() =>
                                                    setSelectedIndex(index)
                                                }
                                            >
                                                Cancel {nftName}
                                            </SecondaryButton>
                                        ) : (
                                            <PrimaryButton
                                                onClick={() =>
                                                    setSelectedIndex(index)
                                                }
                                            >
                                                {typeof nftName === 'string'
                                                    ? `Buy ${nftName}`
                                                    : nftName}
                                            </PrimaryButton>
                                        )}
                                    </ButtonRow>
                                </ListedNft>
                            </NftSwiperSlide>
                        </SwiperSlide>
                    );
                })}
            </Swiper>
        </>
    );
};

const Collection: React.FC<CollectionProps> = ({
    groupTokenId,
    agora,
    chronik,
    cashtabCache,
    settings,
    fiatPrice,
    userLocale,
    wallet,
    activePk,
    chaintipBlockheight,
    ecc,
    noCollectionInfo = false,
    loadOnClick = false,
}) => {
    const [activeOffers, setActiveOffers] = useState<null | OneshotOffer[]>(
        null,
    );
    const [agoraQueryError, setAgoraQueryError] = useState<null | boolean>(
        null,
    );
    const [renderOffers, setRenderOffers] = useState(!loadOnClick);

    const getActiveOffersThisCollection = async () => {
        let activeOffersThisCollection;
        try {
            // We do not expect anything but OneshotOffer from activeOffersByGroupTokenId
            activeOffersThisCollection =
                (await agora.activeOffersByGroupTokenId(
                    groupTokenId,
                )) as OneshotOffer[];
            setActiveOffers(activeOffersThisCollection);

            // Which tokenIds do we need to cache?
            const unCachedTokenIds: Set<string> = new Set();
            for (const offer of activeOffersThisCollection) {
                const tokenId = offer.token.tokenId;
                const cachedTokenInfo = cashtabCache.tokens.get(tokenId);
                if (typeof cachedTokenInfo === 'undefined') {
                    unCachedTokenIds.add(tokenId);
                }
            }
            const tokensToCache = unCachedTokenIds.size > 0;
            const tokenCachePromises: Promise<void>[] = [];
            unCachedTokenIds.forEach(tokenId => {
                tokenCachePromises.push(
                    new Promise<void>((resolve, reject) => {
                        const tokenInfoPromise: Promise<CashtabCachedTokenInfo> =
                            getTokenGenesisInfo(
                                chronik,
                                tokenId,
                            ) as Promise<CashtabCachedTokenInfo>;
                        tokenInfoPromise.then(
                            cachedInfo => {
                                cashtabCache.tokens.set(tokenId, cachedInfo);
                                resolve();
                            },
                            err => {
                                reject(err);
                            },
                        );
                    }),
                );
            });
            if (tokensToCache) {
                await Promise.all(tokenCachePromises);
                // Note: we do not write to stored cache from this component
                // Too many can be rendered in parallel
            }
        } catch (err) {
            console.error(
                `Error fetching active offers for ${groupTokenId}`,
                err,
            );
            setAgoraQueryError(true);
        }
    };

    const addCollectionInfoToCache = async () => {
        const collectionTokenInfo = (await getTokenGenesisInfo(
            chronik,
            groupTokenId,
        )) as CashtabCachedTokenInfo;
        cashtabCache.tokens.set(groupTokenId, collectionTokenInfo);
        setCachedCollectionInfo(collectionTokenInfo);
    };

    useEffect(() => {
        // We load the collection info on load
        if (typeof cashtabCache.tokens.get(groupTokenId) === 'undefined') {
            addCollectionInfoToCache();
        }
    }, []);

    useEffect(() => {
        if (!renderOffers) {
            return;
        }
        getActiveOffersThisCollection();
    }, [renderOffers]);

    const [cachedCollectionInfo, setCachedCollectionInfo] = useState(
        cashtabCache.tokens.get(groupTokenId),
    );

    const collectionName =
        typeof cachedCollectionInfo !== 'undefined' ? (
            `${cachedCollectionInfo.genesisInfo.tokenName}${
                cachedCollectionInfo.genesisInfo.tokenTicker !== ''
                    ? ` (${cachedCollectionInfo.genesisInfo.tokenTicker})`
                    : ''
            }`
        ) : (
            <InlineLoader />
        );

    const toggleOffers = () => {
        setRenderOffers(!renderOffers);
    };
    return (
        <>
            <CollectionWrapper isCollapsed={!renderOffers}>
                {!noCollectionInfo && (
                    <CollectionSummary isCollapsed={!renderOffers}>
                        <TitleAndIconAndCollapseArrow onClick={toggleOffers}>
                            <CollectionIcon isCollapsed={!renderOffers}>
                                <TokenIcon tokenId={groupTokenId} size={256} />
                            </CollectionIcon>
                            <CollectionTitle>{collectionName}</CollectionTitle>
                            <ArrowWrapper isCollapsed={!renderOffers}>
                                <Arrow />
                            </ArrowWrapper>
                        </TitleAndIconAndCollapseArrow>
                        <CollectionInfoRow>
                            <TokenIdPreview tokenId={groupTokenId} />
                        </CollectionInfoRow>
                    </CollectionSummary>
                )}
                <CollapsibleContent isCollapsed={!renderOffers}>
                    {activeOffers === null && !agoraQueryError ? (
                        // We show a loader while querying Agora for offers
                        <CollectionLoading>
                            <InlineLoader />
                        </CollectionLoading>
                    ) : agoraQueryError ? (
                        // We show an alert if we have an error querying Agora
                        <Alert>Error querying agora offers</Alert>
                    ) : Array.isArray(activeOffers) &&
                      activeOffers.length === 0 ? (
                        // If we have no active offers, we show a notice
                        <Info>No active offers in this collection</Info>
                    ) : (
                        // Otherwise, we show the active offers in a carousel
                        <>
                            {Array.isArray(activeOffers) && (
                                <OneshotSwiper
                                    offers={activeOffers}
                                    setOffers={setActiveOffers}
                                    activePk={activePk}
                                    chronik={chronik}
                                    chaintipBlockheight={chaintipBlockheight}
                                    ecc={ecc}
                                    wallet={wallet}
                                    cashtabCache={cashtabCache}
                                    userLocale={userLocale}
                                    fiatPrice={fiatPrice}
                                    settings={settings}
                                />
                            )}
                        </>
                    )}
                </CollapsibleContent>
            </CollectionWrapper>
        </>
    );
};

export default Collection;
