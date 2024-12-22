// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * OrderBook
 *
 * Component renders all open AgoraOffers type === 'PARTIAL' for a given tokenId
 * Offers are rendered as depth bars
 * Offers are rendered by price, with the lowest price (spot) at the bottom, as on exchanges
 * The spot price offer is selected by default, but the user may select another offer by clicking on it
 * Amount accepted is set with a slider. Manual input is disabled because Agora Partial offers can only
 * be accepted at discrete intervals. The slider will only show valid discrete intervals.
 * If the user created an offer, he can only Cancel. Partially canceling an offer is not (currently) supported.
 * If the user did not create an offer, he can buy any supported partial amount.
 *
 * Note that Cashtab validation prevents a user from buying an Agora Partial such that the remaining tokens
 * are below the min accepted token threshold of that offer. Such an offer would be unacceptable and could
 * only be canceled by its creator.
 *
 * This component is tested in the tests for its parent component, Agora/index.js
 */

import React, { useState, useEffect } from 'react';
import { Slider } from 'components/Common/Inputs';
import { InlineLoader } from 'components/Common/Spinner';
import { explorer } from 'config/explorer';
import {
    nanoSatoshisToXec,
    decimalizeTokenAmount,
    toXec,
    getAgoraPartialAcceptFuelInputs,
    getAgoraCancelFuelInputs,
    hasEnoughToken,
    DUMMY_KEYPAIR,
    toBigInt,
    CashtabWallet,
    SlpDecimals,
} from 'wallet';
import { ignoreUnspendableUtxos } from 'transactions';
import {
    toFormattedXec,
    getFormattedFiatPrice,
    decimalizedTokenQtyToLocaleFormat,
} from 'utils/formatting';
import { TokenSentLink } from 'components/Etokens/Token/styled';
import {
    DepthBarCol,
    OfferIcon,
    DepthBar,
    TentativeAcceptBar,
    OrderBookRow,
    OrderbookPrice,
    SliderRow,
    OrderBookLoading,
    OfferWrapper,
    OfferHeader,
    OfferTitleCtn,
    OfferDetailsCtn,
    BuyOrderCtn,
} from './styled';
import PrimaryButton, { SecondaryButton } from 'components/Common/Buttons';
import Modal from 'components/Common/Modal';
import {
    Script,
    P2PKHSignatory,
    ALL_BIP143,
    toHex,
    fromHex,
    Ecc,
} from 'ecash-lib';
import appConfig from 'config/app';
import { toast } from 'react-toastify';
import TokenIcon from 'components/Etokens/TokenIcon';
import { getAgoraPartialAcceptTokenQtyError } from 'validation';
import { Alert, Info, CopyTokenId } from 'components/Common/Atoms';
import { CashtabCachedTokenInfo } from 'config/CashtabCache';
import CashtabSettings from 'config/CashtabSettings';
import { Agora, AgoraOffer, AgoraPartial } from 'ecash-agora';
import { ChronikClient } from 'chronik-client';

export interface PartialOffer extends AgoraOffer {
    variant: {
        type: 'PARTIAL';
        params: AgoraPartial;
    };
    depthPercent?: number;
    spotPriceNanoSatsPerTokenSat?: bigint;
}

interface OrderBookProps {
    tokenId: string;
    cachedTokenInfo: CashtabCachedTokenInfo | undefined;
    settings: CashtabSettings;
    userLocale: string;
    fiatPrice: null | number;
    activePk: null | Uint8Array;
    wallet: CashtabWallet;
    ecc: Ecc;
    chronik: ChronikClient;
    agora: Agora;
    chaintipBlockheight: number;
    noIcon?: boolean;
}
const OrderBook: React.FC<OrderBookProps> = ({
    tokenId,
    cachedTokenInfo,
    settings,
    userLocale,
    fiatPrice,
    activePk,
    wallet,
    ecc,
    chronik,
    agora,
    chaintipBlockheight,
    noIcon,
}) => {
    const cancelOffer = async (agoraPartial: PartialOffer) => {
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
                agoraPartial,
                eligibleUtxos,
                satsPerKb,
            );
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
            const { sk, hash } = pathInfo;

            // Convert from Cashtab utxo to signed ecash-lib input
            fuelInputs.push({
                input: {
                    prevOut: {
                        txid: fuelUtxo.outpoint.txid,
                        outIdx: fuelUtxo.outpoint.outIdx,
                    },
                    signData: {
                        value: fuelUtxo.value,
                        // Send the tokens back to the same address as the fuelUtxo
                        outputScript: Script.p2pkh(fromHex(hash)),
                    },
                },
                signatory: P2PKHSignatory(
                    sk,
                    activePk as Uint8Array,
                    ALL_BIP143,
                ),
            });
        }

        const defaultPathInfo = wallet.paths.get(appConfig.derivationPath);
        if (typeof defaultPathInfo === 'undefined') {
            // Should never happen
            return toast.error(`No path info for ${appConfig.derivationPath}`);
        }
        const { sk, hash } = defaultPathInfo;

        // Build the cancel tx
        const cancelTxSer = agoraPartial
            .cancelTx({
                ecc,
                // Cashtab default path
                // This works here because we lookup cancelable offers by the same path
                // Would need a different approach if Cashtab starts supporting HD wallets
                cancelSk: sk,
                fuelInputs: fuelInputs,
                // Change to Cashtab default derivation path
                recipientScript: Script.p2pkh(fromHex(hash)),
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
                <TokenSentLink
                    href={`${explorer.blockExplorerUrl}/tx/${resp.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Canceled listing
                </TokenSentLink>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId} />,
                },
            );
            setShowConfirmCancelModal(false);
            // Update offers
            fetchAndPrepareActiveOffers();
        } catch (err) {
            console.error('Error canceling offer', err);
            toast.error(`${err}`);
        }
    };

    const acceptOffer = async (agoraPartial: PartialOffer) => {
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
            acceptFuelInputs = getAgoraPartialAcceptFuelInputs(
                agoraPartial,
                eligibleUtxos,
                toBigInt(takeTokenSatoshis),
                satsPerKb,
            );
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
            const { sk, hash } = pathInfo;

            // Sign and prep utxos for ecash-lib inputs
            signedFuelInputs.push({
                input: {
                    prevOut: {
                        txid: fuelUtxo.outpoint.txid,
                        outIdx: fuelUtxo.outpoint.outIdx,
                    },
                    signData: {
                        value: fuelUtxo.value,
                        outputScript: Script.p2pkh(fromHex(hash)),
                    },
                },
                signatory: P2PKHSignatory(
                    sk,
                    activePk as Uint8Array,
                    ALL_BIP143,
                ),
            });
        }

        const defaultPathInfo = wallet.paths.get(appConfig.derivationPath);
        if (typeof defaultPathInfo === 'undefined') {
            // Should never happen
            return toast.error(`No path info for ${appConfig.derivationPath}`);
        }

        // Use an arbitrary sk, pk for the convenant
        const acceptTxSer = agoraPartial
            .acceptTx({
                ecc,
                covenantSk: DUMMY_KEYPAIR.sk,
                covenantPk: DUMMY_KEYPAIR.pk,
                fuelInputs: signedFuelInputs,
                // Accept at default path, 1899
                recipientScript: Script.p2pkh(fromHex(defaultPathInfo.hash)),
                feePerKb: satsPerKb,
                // Need to use Number() to deal with values in scientific notation
                acceptedTokens: toBigInt(takeTokenSatoshis),
            })
            .ser();

        // We need hex so we can log it to get integration test mocks
        const hex = toHex(acceptTxSer);

        let resp;
        try {
            resp = await chronik.broadcastTx(hex);
            toast(
                <TokenSentLink
                    href={`${explorer.blockExplorerUrl}/tx/${resp.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {`Bought ${decimalizeTokenAmount(
                        takeTokenSatoshis,
                        decimals as SlpDecimals,
                    )} ${tokenName}${
                        tokenTicker !== '' ? ` (${tokenTicker})` : ''
                    } for
                    ${toXec(askedSats).toLocaleString(userLocale)} XEC
                    ${
                        fiatPrice !== null
                            ? ` (${getFormattedFiatPrice(
                                  settings.fiatCurrency,
                                  userLocale,
                                  toXec(askedSats),
                                  fiatPrice,
                              )})`
                            : ''
                    }`}
                </TokenSentLink>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId} />,
                },
            );
            setShowConfirmBuyModal(false);
            // Update offers
            fetchAndPrepareActiveOffers();
        } catch (err) {
            console.error('Error accepting offer', err);
            toast.error(`${err}`);
        }
    };

    // Modal flags
    const [showLargeIconModal, setShowLargeIconModal] =
        useState<boolean>(false);
    const [showAcceptedQtyInfo, setShowAcceptedQtyInfo] =
        useState<boolean>(false);
    const [showConfirmBuyModal, setShowConfirmBuyModal] =
        useState<boolean>(false);
    const [showConfirmCancelModal, setShowConfirmCancelModal] =
        useState<boolean>(false);

    const [activeOffers, setActiveOffers] = useState<null | PartialOffer[]>(
        null,
    );
    // On load, we select the offer at the 0-index
    // This component sorts offers by spot price; so this is the spot offer
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [askedSats, setAskedSats] = useState<number>(0);
    // Note that takeTokenSatoshis is a string because slider values are strings
    const [takeTokenSatoshis, setTakeTokenSatoshis] = useState<string>('0');

    // Errorrs
    const [takeTokenSatoshisError, setTakeTokenSatoshisError] = useState<
        false | string
    >(false);
    const [agoraQueryError, setAgoraQueryError] = useState<boolean>(false);

    const handleTakeTokenSatoshisSlide = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        // JS slider components will only take string input, and only convert to number
        // So, unless you build your own custom component, you cannot avoid precision loss
        // TODO custom component
        // Prepare value before setting
        const preparedTokenSatoshis = (
            selectedOffer as PartialOffer
        ).variant.params.prepareAcceptedTokens(toBigInt(e.target.value));
        setTakeTokenSatoshis(preparedTokenSatoshis.toString());
    };

    // We can only calculate params to render the orderbook depth chart and slider after
    // we have successfully called fetchAndPrepareActiveOffers() and set activeOffers in state
    let selectedOffer: undefined | PartialOffer,
        tokenSatoshisMin: undefined | bigint,
        tokenSatoshisMax: undefined | bigint,
        tokenSatoshisStep: undefined | bigint;

    // We will not allow fungible token sales if we do not have
    // token cached info
    // This is because we need the decimals to really know the quantity
    let decimals: undefined | SlpDecimals,
        decimalizedTokenQtyMin: undefined | string,
        decimalizedTokenQtyMax: undefined | string,
        decimalizedTokenQtyStep: undefined | string;

    // We can't render the trading features of an orderbook until cached token info is available
    // But we can render other parts, like the token icon, token id
    // Set placeholders for values that need to wait for cache
    const tokenName =
        typeof cachedTokenInfo !== 'undefined' ? (
            cachedTokenInfo.genesisInfo.tokenName
        ) : (
            <InlineLoader />
        );
    const tokenTicker =
        typeof cachedTokenInfo !== 'undefined' ? (
            cachedTokenInfo.genesisInfo.tokenTicker === '' ? (
                ''
            ) : (
                `${cachedTokenInfo.genesisInfo.tokenTicker}`
            )
        ) : (
            <InlineLoader />
        );

    // Determine if the active wallet created this offer
    // Used to render Buy or Cancel option to the user
    // Validate activePk as it could be null from Agora/index.js (not yet calculated)
    let isMaker;
    if (Array.isArray(activeOffers) && activeOffers.length > 0) {
        selectedOffer = activeOffers[selectedIndex];
        tokenSatoshisMax = BigInt(selectedOffer.token.amount);
        const { params } = selectedOffer.variant;
        const { truncTokens, makerPk } = params;

        tokenSatoshisMin = params.minAcceptedTokens();

        // Agora Partial offers may only be accepted in discrete amounts
        // We configure the slider to render only these amounts
        tokenSatoshisStep = BigInt(tokenSatoshisMax) / truncTokens;

        try {
            isMaker = toHex(activePk as Uint8Array) === toHex(makerPk);
        } catch (err) {
            console.error(`Error comparing activePk with makerPk`);
            console.error(`activePk`, activePk);
            console.error(`makerPk`, makerPk);
        }

        if (typeof cachedTokenInfo !== 'undefined') {
            decimals = cachedTokenInfo.genesisInfo.decimals as SlpDecimals;

            // We need undecimimalized amounts as BigInts so we do not have JS number math effects
            // The sliders need to work under the hood with token sats as BigInts
            // But we need decimalized amounts to show the user

            // We calculate decimalized values to show the user what he is buying
            decimalizedTokenQtyMin = decimalizeTokenAmount(
                tokenSatoshisMin.toString(),
                decimals,
            );

            decimalizedTokenQtyStep = decimalizeTokenAmount(
                tokenSatoshisStep.toString(),
                decimals,
            );

            decimalizedTokenQtyMax = decimalizeTokenAmount(
                tokenSatoshisMax.toString(),
                decimals,
            );
        }
    }

    // Shorthand variable to let us know we have all the info we need to successfully render the orderbook
    // let decimals, decimalizedTokenQtyMin, decimalizedTokenQtyMax, decimalizedTokenQtyStep;
    const canRenderOrderbook =
        Array.isArray(activeOffers) &&
        activeOffers.length > 0 &&
        typeof selectedOffer !== 'undefined' &&
        typeof tokenSatoshisMin !== 'undefined' &&
        typeof tokenSatoshisMax !== 'undefined' &&
        typeof tokenSatoshisStep !== 'undefined' &&
        typeof decimals !== 'undefined' &&
        typeof decimalizedTokenQtyMin !== 'undefined' &&
        typeof decimalizedTokenQtyMax !== 'undefined' &&
        typeof decimalizedTokenQtyStep !== 'undefined' &&
        typeof isMaker === 'boolean';

    /**
     * Get all activeOffers for this tokenId
     * Prepare by adding two params used in this component
     * spotPriceNanoSatsPerTokenSat - the price (in nanosatoshis) of accepting the full offer qty
     * depthPercent - the relative size of the offer at this spot price compared to other active offers for this token
     */
    const fetchAndPrepareActiveOffers = async () => {
        try {
            const activeOffers = (await agora.activeOffersByTokenId(
                tokenId,
            )) as PartialOffer[];

            // Calculate a spot price for each offer
            // We need to do this because we need to sort them to get the "true" spot price, i.e. the lowest price
            // Since we are doing it, we should save the info so we do not have to recalculate it
            // Also get the largest offer of all the offers. This will help us build
            // a styled orderbook.
            let deepestActiveOfferedTokens = 0n;
            for (const activeOffer of activeOffers) {
                const maxOfferTokens = BigInt(activeOffer.token.amount);
                if (maxOfferTokens > deepestActiveOfferedTokens) {
                    deepestActiveOfferedTokens = maxOfferTokens;
                }

                const askedSats = activeOffer.askedSats(maxOfferTokens);

                // We convert to askedNanoSats before calculating the spot price,
                // so that we get a bigint spot price
                const askedNanoSats = askedSats * BigInt(1e9);

                // Note this price is nanosatoshis per token satoshi
                const spotPriceNanoSatsPerTokenSat =
                    askedNanoSats / maxOfferTokens;

                activeOffer.spotPriceNanoSatsPerTokenSat =
                    spotPriceNanoSatsPerTokenSat;
            }
            // Add relative depth to each offer. If you only have one offer, it's 1.
            // This helps us to style the orderbook
            // We do not use a bignumber library because accuracy is not critical here, only used
            // for rendering depth bars
            for (const activeOffer of activeOffers) {
                const depthPercent =
                    (100 * Number(activeOffer.token.amount)) /
                    Number(deepestActiveOfferedTokens);
                activeOffer.depthPercent = depthPercent;
            }
            // Sort activeOffers by spot price, lowest to highest
            activeOffers.sort(
                (a, b) =>
                    Number(a.spotPriceNanoSatsPerTokenSat) -
                    Number(b.spotPriceNanoSatsPerTokenSat),
            );
            setActiveOffers(activeOffers);
        } catch (err) {
            console.error(`Error loading activeOffers for ${tokenId}`, err);
            setAgoraQueryError(true);
        }
    };

    /**
     * On component load, query agora to get activeOffers for this tokenId orderbook
     */
    useEffect(() => {
        fetchAndPrepareActiveOffers();
    }, []);

    // When activeOffers loads, select the spot price and make necessary calcs
    useEffect(() => {
        if (Array.isArray(activeOffers) && activeOffers.length > 0) {
            // Set selected offer to spot price when activeOffers changes from [] to active offers
        }
    }, [activeOffers]);

    /**
     * Update validation and asking price if the selected offer or qty
     * changes
     */
    useEffect(() => {
        if (!canRenderOrderbook) {
            // If we are still loading token info, do nothing
            return;
        }

        setTakeTokenSatoshisError(
            getAgoraPartialAcceptTokenQtyError(
                toBigInt(takeTokenSatoshis),
                tokenSatoshisMin as bigint,
                tokenSatoshisMax as bigint,
                decimals as SlpDecimals,
            ),
        );

        // takeTokenSatoshis is only set to state by agora methods that prepareAcceptedTokens
        const spotPriceSatsThisQty = (selectedOffer as PartialOffer).askedSats(
            toBigInt(takeTokenSatoshis),
        );

        // The state parameter "askedSats" is only used for rendering pricing information,
        // So it does not require bigint token satoshis precision
        // Instead it must be a number so we can convert it to XEC and fiat and render
        // the correct price
        setAskedSats(Number(spotPriceSatsThisQty));

        // Update when token qty changes
        // In practice, this means we also update when selectedOffer changes,
        // as changing selectedOffer will reset takeTokenSatoshis to the min accept
        // qty of the new selected offer
    }, [takeTokenSatoshis]);

    // Update the slider when the user selects a different offer
    useEffect(() => {
        if (Array.isArray(activeOffers) && activeOffers.length > 0) {
            // Select the minAcceptedTokens amount every time the order changes
            setTakeTokenSatoshis(
                activeOffers[selectedIndex].variant.params
                    .minAcceptedTokens()
                    .toString(),
            );
        }
    }, [activeOffers, selectedIndex]);

    return (
        <>
            {showLargeIconModal && (
                <Modal
                    height={275}
                    showButtons={false}
                    handleCancel={() => setShowLargeIconModal(false)}
                >
                    <TokenIcon size={256} tokenId={tokenId} />
                </Modal>
            )}
            {showAcceptedQtyInfo && (
                <Modal
                    title={`Accepted Qty`}
                    height={250}
                    description={`The amount you are able to accept depends on how the offer was created. This slider allows you to accept all possible amounts.`}
                    handleOk={() => setShowAcceptedQtyInfo(false)}
                    handleCancel={() => setShowAcceptedQtyInfo(false)}
                />
            )}
            {showConfirmBuyModal && (
                <Modal
                    title={`Buy ${decimalizedTokenQtyToLocaleFormat(
                        decimalizeTokenAmount(
                            takeTokenSatoshis,
                            decimals as SlpDecimals,
                        ),
                        userLocale,
                    )} ${tokenName}${
                        tokenTicker !== '' ? ` (${tokenTicker})` : ''
                    } for ${toXec(askedSats).toLocaleString(userLocale)} XEC${
                        fiatPrice !== null
                            ? ` (${getFormattedFiatPrice(
                                  settings.fiatCurrency,
                                  userLocale,
                                  toXec(askedSats),
                                  fiatPrice,
                              )})?`
                            : '?'
                    }`}
                    height={290}
                    showCancelButton
                    handleOk={() => acceptOffer(selectedOffer as PartialOffer)}
                    handleCancel={() => setShowConfirmBuyModal(false)}
                >
                    <TokenIcon size={128} tokenId={tokenId} />
                </Modal>
            )}
            {showConfirmCancelModal &&
                typeof decimalizedTokenQtyMax === 'string' && (
                    <Modal
                        title={`Cancel your offer to sell ${decimalizedTokenQtyToLocaleFormat(
                            decimalizedTokenQtyMax,
                            userLocale,
                        )} ${tokenName}${
                            tokenTicker !== '' ? ` (${tokenTicker})` : ''
                        } for ${toXec(askedSats).toLocaleString(
                            userLocale,
                        )} XEC${
                            fiatPrice !== null
                                ? ` (${getFormattedFiatPrice(
                                      settings.fiatCurrency,
                                      userLocale,
                                      toXec(askedSats),
                                      fiatPrice,
                                  )})?`
                                : '?'
                        }`}
                        description={`Note that canceling an offer will cancel the entire offer`}
                        height={250}
                        showCancelButton
                        handleOk={() =>
                            cancelOffer(selectedOffer as PartialOffer)
                        }
                        handleCancel={() => setShowConfirmCancelModal(false)}
                    />
                )}

            {Array.isArray(activeOffers) && activeOffers.length > 0 ? (
                <OfferWrapper borderRadius={!noIcon}>
                    {!noIcon && (
                        <OfferHeader>
                            <OfferIcon
                                title={tokenId}
                                size={64}
                                tokenId={tokenId}
                                aria-label={`View larger icon for ${
                                    typeof tokenName === 'string'
                                        ? tokenName
                                        : tokenId
                                }`}
                                onClick={() => setShowLargeIconModal(true)}
                            />
                            <OfferTitleCtn>
                                <>
                                    {typeof tokenName !== 'string' ? (
                                        <InlineLoader />
                                    ) : (
                                        <a
                                            href={`#/token/${tokenId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {tokenName}
                                            {tokenTicker !== ''
                                                ? ` (${tokenTicker})`
                                                : ''}
                                        </a>
                                    )}
                                    <CopyTokenId tokenId={tokenId} />
                                </>
                            </OfferTitleCtn>
                        </OfferHeader>
                    )}
                    {agoraQueryError && (
                        <Alert>
                            Error querying agora for active offers. Try again
                            later.
                        </Alert>
                    )}
                    {canRenderOrderbook && (
                        <OfferDetailsCtn>
                            <DepthBarCol>
                                {activeOffers.map((activeOffer, index) => {
                                    const { depthPercent } = activeOffer;
                                    const acceptPercent =
                                        ((depthPercent as number) *
                                            Number(takeTokenSatoshis)) /
                                        Number(tokenSatoshisMax);
                                    return (
                                        <OrderBookRow
                                            key={index}
                                            onClick={() =>
                                                setSelectedIndex(index)
                                            }
                                            selected={index === selectedIndex}
                                        >
                                            <DepthBar
                                                depthPercent={
                                                    depthPercent as number
                                                }
                                            ></DepthBar>
                                            {index === selectedIndex && (
                                                <TentativeAcceptBar
                                                    acceptPercent={
                                                        acceptPercent
                                                    }
                                                ></TentativeAcceptBar>
                                            )}
                                            <OrderbookPrice>
                                                {getFormattedFiatPrice(
                                                    settings.fiatCurrency,
                                                    userLocale,
                                                    nanoSatoshisToXec(
                                                        Number(
                                                            activeOffer.spotPriceNanoSatsPerTokenSat,
                                                        ) *
                                                            parseFloat(
                                                                `1e${decimals}`,
                                                            ),
                                                    ),
                                                    fiatPrice,
                                                )}
                                            </OrderbookPrice>
                                        </OrderBookRow>
                                    );
                                })}
                            </DepthBarCol>
                            <SliderRow>
                                <span>Buy</span>
                                <Slider
                                    name={`Select buy qty ${tokenId}`}
                                    value={takeTokenSatoshis}
                                    error={takeTokenSatoshisError}
                                    handleSlide={handleTakeTokenSatoshisSlide}
                                    min={(
                                        tokenSatoshisMin as bigint
                                    ).toString()}
                                    max={(
                                        tokenSatoshisMax as bigint
                                    ).toString()}
                                    step={(
                                        tokenSatoshisStep as bigint
                                    ).toString()}
                                />
                            </SliderRow>
                            <BuyOrderCtn>
                                <div>
                                    {decimalizedTokenQtyToLocaleFormat(
                                        decimalizeTokenAmount(
                                            takeTokenSatoshis,
                                            decimals as SlpDecimals,
                                        ),
                                        userLocale,
                                    )}{' '}
                                    {tokenTicker !== ''
                                        ? `${tokenTicker}`
                                        : `${tokenName}`}
                                </div>
                                <div>
                                    {toFormattedXec(askedSats, userLocale)} XEC
                                </div>
                                {fiatPrice !== null && (
                                    <h3>
                                        {getFormattedFiatPrice(
                                            settings.fiatCurrency,
                                            userLocale,
                                            toXec(askedSats),
                                            fiatPrice,
                                        )}
                                    </h3>
                                )}
                                {isMaker ? (
                                    <SecondaryButton
                                        onClick={() =>
                                            setShowConfirmCancelModal(true)
                                        }
                                    >
                                        Cancel your offer
                                    </SecondaryButton>
                                ) : (
                                    <PrimaryButton
                                        onClick={() =>
                                            setShowConfirmBuyModal(true)
                                        }
                                        disabled={
                                            takeTokenSatoshisError !== false
                                        }
                                    >
                                        Buy {tokenName}
                                        {tokenTicker !== ''
                                            ? ` (${tokenTicker})`
                                            : ''}
                                    </PrimaryButton>
                                )}
                            </BuyOrderCtn>
                        </OfferDetailsCtn>
                    )}
                </OfferWrapper>
            ) : activeOffers === null ? (
                <>
                    {agoraQueryError ? (
                        <Alert>
                            Error querying agora for active offers. Try again
                            later.
                        </Alert>
                    ) : (
                        <OrderBookLoading>
                            <InlineLoader />
                        </OrderBookLoading>
                    )}
                </>
            ) : (
                <Info>No active offers for this token</Info>
            )}
        </>
    );
};

export default OrderBook;
