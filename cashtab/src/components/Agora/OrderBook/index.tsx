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

import React, { useState, useEffect, useContext } from 'react';
import { WsEndpoint, WsMsgClient } from 'chronik-client';
import BigNumber from 'bignumber.js';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import { Slider } from 'components/Common/Inputs';
import Switch from 'components/Common/Switch';
import { InlineLoader } from 'components/Common/Spinner';
import { explorer } from 'config/explorer';
import {
    nanoSatoshisToXec,
    decimalizeTokenAmount,
    toXec,
    DUMMY_KEYPAIR,
    toBigInt,
    SlpDecimals,
    undecimalizeTokenAmount,
    CashtabUtxo,
} from 'wallet';
import { ignoreUnspendableUtxos } from 'transactions';
import {
    toFormattedXec,
    getFormattedFiatPrice,
    decimalizedTokenQtyToLocaleFormat,
    getAgoraSpotPriceXec,
    getPercentDeltaOverSpot,
} from 'formatting';
import {
    DepthBarCol,
    OfferIcon,
    DepthBar,
    TentativeAcceptBar,
    OrderBookRow,
    OrderbookPrice,
    OrderBookLoading,
    OfferWrapper,
    OfferHeader,
    OfferTitleCtn,
    OfferTitleLink,
    OfferDetailsCtn,
    BuyOrderCtn,
    MintIconSpotWrapper,
    DeltaSpan,
    AgoraWarningParagraph,
    OfferHeaderRow,
    SliderContainer,
    SliderInputRow,
    PercentageButton,
    PercentageButtonsRow,
} from './styled';
import {
    AgoraPreviewParagraph,
    AgoraPreviewTable,
    AgoraPreviewRow,
    AgoraPreviewLabel,
    AgoraPreviewCol,
} from 'components/Etokens/Token/styled';
import PrimaryButton, { SecondaryButton } from 'components/Common/Buttons';
import Modal from 'components/Common/Modal';
import {
    Script,
    P2PKHSignatory,
    ALL_BIP143,
    toHex,
    fromHex,
    shaRmd160,
    Address,
} from 'ecash-lib';
import appConfig from 'config/app';
import { toast } from 'react-toastify';
import TokenIcon from 'components/Etokens/TokenIcon';
import { getAgoraPartialAcceptTokenQtyError } from 'validation';
import { Alert, Info, CopyTokenId } from 'components/Common/Atoms';
import {
    AgoraOffer,
    AgoraPartial,
    getAgoraPartialAcceptFuelInputs,
    getAgoraCancelFuelInputs,
} from 'ecash-agora';
import { IsMintAddressIcon } from 'components/Common/CustomIcons';

/**
 * Allow users to buy above spot (within reason)
 * There are legitimate use cases for buying above spot
 * - Perhaps someone has created an offer with a "low" price but a VERYHIGH min accept, so
 *   the actual buy cost is very high, blocking off other offers
 * - Perhaps there is an offer that has a higher price, but allows the user to purchase
 *   lower amounts. It makes sense a user might pay a little extra for the ability to buy
 *   a smaller quantity
 *
 * We want to prevent users from accidentally buying the seemingly endless scam offers, i.e.
 * those offers where a user sells a (usually very small) quantity of token for a (usually very large)
 * price...sometimes at prices exceeding the XEC supply
 *
 * But we also want to allow users some freedom of choice.
 *
 * 1.25 = users can buy offers up to 25% above spot
 */
const ALLOW_BUYS_ABOVE_SPOT_RATIO = 1.25;

export interface PartialOffer extends AgoraOffer {
    variant: {
        type: 'PARTIAL';
        params: AgoraPartial;
    };
    /**
     * Calculated value
     * Allows us to render depth at the price of this order, like most
     * exchange orderbooks
     */
    depthPercent?: number;
    spotPriceNanoSatsPerTokenSat?: bigint;
    /**
     * It is possible for an Agora offer to be "unacceptable" if
     * the min accepted tokens is less than the total offered tokens
     * Cashtab UI (should) prevent this from ever happening, i.e. we have
     * validation checks for creation and accepting offers, though likely
     * we have some missed edge cases that must be cleaned up
     * But even if we prevent this in Cashtab, anyone could make this kind of offer
     * We do not want buyers to see these offers. But we do want the makers to see them
     * and know they need to be canceled
     */
    isUnacceptable: boolean;
    /**
     * Indicates if the user cannot afford even the minimum buy amount for this offer
     * These offers are still shown to the user but visually indicated as unaffordable
     */
    isUnaffordable: boolean;
    /**
     * Cumulative quantity of token available on the market
     * In units of base tokens (aka "token satoshis") so we
     * can decide to render when decimals are available
     * Used to render tooltip for exchange-like UX
     *
     * e.g. if you have 3 offers
     * - Cheapest sells 10
     * - Next cheapest sells 20
     * - Most expensive sells 30
     *
     * cumulativeBaseTokens will be 10 for the cheapest, (10+20=30) for the next cheapest,
     * and (10+20+30) 60 for the most expensive
     */
    cumulativeBaseTokens?: bigint;
}

export interface OrderBookInfo {
    offerCount: number;
    totalOfferedTokenSatoshis: bigint;
    spotPriceNanoSatsPerTokenSat: bigint;
}

export interface OrderBookProps {
    tokenId: string;
    userLocale: string;
    noIcon?: boolean;
    orderBookInfoMap?: Map<string, OrderBookInfo>;
    /**
     * It's important to use a websocket to keep OrderBook activity up to date
     * with the current utxo set
     *
     * However we cannot connect to 100s of websockets at a time. So, if we render
     * multiple OrderBook components on the same screen, we offer a setting to
     * disable the websockets (before we DDOS ourselves to disable them anyway)
     */
    noWebsocket?: boolean;
    /**
     * Load with price in FIAT instead of XEC
     * Should be set to "true" for stablecoins
     */
    priceInFiat?: boolean;
}
const OrderBook: React.FC<OrderBookProps> = ({
    tokenId,
    userLocale,
    noIcon,
    orderBookInfoMap,
    noWebsocket = false,
    priceInFiat = false,
}) => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const { fiatPrice, chronik, agora, cashtabState, chaintipBlockheight } =
        ContextValue;
    const { settings, cashtabCache, activeWallet } = cashtabState;
    if (typeof activeWallet === 'undefined') {
        // Note that, in the app, we will never render this component without an activeWallet
        // Because the App component will only show OnBoarding in this case
        // But because we directly test this component with context, we must handle this case
        return null;
    }

    const wallet = activeWallet;
    const { balanceSats } = wallet.state;

    const cachedTokenInfo = cashtabCache.tokens.get(tokenId);

    /**
     * Agora websocket
     * We create an individual ws for each OrderBook component
     * We do not take the existing wallet ws from context, because
     * each websocket needs to have its own onMessage handlers, so that
     * we know each handler is only handling msgs related to agora actions
     * on that token
     *
     * In this way, the websocket in useWallet.ts may get "the same" tx as the
     * ws in OrderBook -- but will complete a distinct action, which is the
     * behavior we want
     *
     * e.g. user buys an agora offer
     * - useWallet websocket shows tx notification summarizing action
     * - OrderBook websocket updates its active offers
     */
    const [ws, setWs] = useState<null | WsEndpoint>(null);

    const cancelOffer = async (agoraPartial: PartialOffer) => {
        // Get user fee from settings
        const satsPerKb: bigint = BigInt(settings.satsPerKb);

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
            // Convert from Cashtab utxo to signed ecash-lib input
            fuelInputs.push({
                input: {
                    prevOut: {
                        txid: fuelUtxo.outpoint.txid,
                        outIdx: fuelUtxo.outpoint.outIdx,
                    },
                    signData: {
                        sats: fuelUtxo.sats,
                        // Send the tokens back to the same address as the fuelUtxo
                        outputScript: Script.p2pkh(fromHex(wallet.hash)),
                    },
                },
                signatory: P2PKHSignatory(
                    fromHex(wallet.sk),
                    fromHex(wallet.pk),
                    ALL_BIP143,
                ),
            });
        }

        // Build the cancel tx
        const cancelTxSer = agoraPartial
            .cancelTx({
                // Cashtab one-addr
                // This works here because we lookup cancelable offers by the same addr
                // Would need a different approach if Cashtab starts supporting HD wallets
                cancelSk: fromHex(wallet.sk),
                fuelInputs: fuelInputs,
                // Change to user addr
                recipientScript: Script.p2pkh(fromHex(wallet.hash)),
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
            console.log('OrderBook cancel - hex:', hex);
            console.log('OrderBook cancel - satsPerKb:', settings.satsPerKb);
            resp = await chronik.broadcastTx(hex);
            console.log('OrderBook cancel - resp:', resp);
            toast(
                <a
                    href={`${explorer.blockExplorerUrl}/tx/${resp.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Canceled listing
                </a>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId} />,
                },
            );
            if (ws === null) {
                // Update offers only if we are not already updating them from the ws
                fetchAndPrepareActiveOffers();
            }
            setShowConfirmCancelModal(false);
        } catch (err) {
            console.error('Error canceling offer', err);
            toast.error(`${err}`);
        }
    };

    const acceptOffer = async (agoraPartial: PartialOffer) => {
        if (preparedTokenSatoshis === null) {
            // We cannot accept an offer if we do not have valid preparedTokenSatoshis
            // Should never happen as we disable the buy button in this case
            return;
        }
        // Determine tx fee from settings
        const satsPerKb: bigint = BigInt(settings.satsPerKb);

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
                preparedTokenSatoshis,
                satsPerKb,
            ) as CashtabUtxo[];
        } catch (err) {
            console.error(
                'Error determining fuel inputs for offer accept',
                err,
            );
            // Hide the confirmation modal
            setShowConfirmBuyModal(false);
            // Error notification
            return toast.error(`${err}`);
        }

        const signedFuelInputs = [];
        for (const fuelUtxo of acceptFuelInputs) {
            // Sign and prep utxos for ecash-lib inputs
            signedFuelInputs.push({
                input: {
                    prevOut: {
                        txid: fuelUtxo.outpoint.txid,
                        outIdx: fuelUtxo.outpoint.outIdx,
                    },
                    signData: {
                        sats: fuelUtxo.sats,
                        outputScript: Script.p2pkh(fromHex(wallet.hash)),
                    },
                },
                signatory: P2PKHSignatory(
                    fromHex(wallet.sk),
                    fromHex(wallet.pk),
                    ALL_BIP143,
                ),
            });
        }

        // Use an arbitrary sk, pk for the convenant
        let acceptTxSer;
        try {
            acceptTxSer = agoraPartial
                .acceptTx({
                    covenantSk: DUMMY_KEYPAIR.sk,
                    covenantPk: DUMMY_KEYPAIR.pk,
                    fuelInputs: signedFuelInputs,
                    recipientScript: Script.p2pkh(fromHex(wallet.hash)),
                    feePerKb: satsPerKb,
                    acceptedAtoms: preparedTokenSatoshis,
                })
                .ser();
        } catch (err) {
            console.error('Error accepting offer', err);
            toast.error(`${err}`);
            return;
        }

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
                    {`Bought ${decimalizedTokenQtyToLocaleFormat(
                        decimalizeTokenAmount(
                            preparedTokenSatoshis.toString(),
                            decimals as SlpDecimals,
                        ),
                        userLocale,
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
                </a>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId} />,
                },
            );
            if (ws === null) {
                // Update offers only if we are not already updating them from the ws
                fetchAndPrepareActiveOffers();
            }
            setShowConfirmBuyModal(false);
        } catch (err) {
            console.error('Error accepting offer', err);
            toast.error(`${err}`);
        }
    };

    // Syntax shortcut for complex token qty calculation in confirm modal
    const getDeltaTokenQtyRow = () => {
        if (typeof decimals === 'undefined') {
            // Should never happen, as we only call this when user is making a buy,
            // and we need token decimals for this to be enabled
            return;
        }
        const delta = new BigNumber(
            decimalizeTokenAmount(
                (preparedTokenSatoshis as bigint).toString(),
                decimals as SlpDecimals,
            ),
        ).minus(takeTokenDecimalizedQty);
        if (delta.eq(0)) {
            return null;
        }
        return (
            <AgoraPreviewRow>
                <AgoraPreviewLabel>
                    <DeltaSpan>Qty Delta:</DeltaSpan>{' '}
                </AgoraPreviewLabel>
                <AgoraPreviewCol>
                    <DeltaSpan>{delta.toString()}</DeltaSpan>
                </AgoraPreviewCol>
            </AgoraPreviewRow>
        );
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

    // Dynamic font sizing for token title based on character count
    const getTitleFontSize = (name: string): string => {
        const length = name.length;
        if (length <= 16) {
            return 'var(--text-2xl)';
        } else if (length <= 20) {
            return 'var(--text-xl)';
        } else if (length <= 24) {
            return 'var(--text-lg)';
        } else if (length <= 28) {
            return 'var(--text-base)';
        } else {
            return 'var(--text-sm)';
        }
    };

    const [activeOffers, setActiveOffers] = useState<null | PartialOffer[]>(
        null,
    );

    /**
     * Show spot prices in XEC even if fiat is available
     * Note that spot prices are always rendered in XEC if
     * fiat info is unavailable
     *
     * Note we only use the priceInFiat prop to control the initial state
     * on load; when a user on the token page changes tokens, their price setting
     * will persist
     */
    const [displaySpotPricesInFiat, setDisplaySpotPricesInFiat] =
        useState<boolean>(priceInFiat);
    // On load, we select the offer at the 0-index
    // This component sorts offers by spot price; so this is the spot offer
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [askedSats, setAskedSats] = useState<number>(0);

    // User input for token qty they want to buy. In token units (decimalized).
    const [takeTokenDecimalizedQty, setTakeTokenDecimalizedQty] =
        useState<string>('0');
    // The nearest acceptable valid qty of token the user can purchase for any given
    // takeTokenDecimalizedQty. This is in TOKEN SATOSHIS. We calculate it with
    // prepareTokenSatoshis only if takeTokenDecimalizedQty has passed validation
    // null if takeTokenDecimalizedQty is invalid
    const [preparedTokenSatoshis, setPreparedTokenSatoshis] = useState<
        null | bigint
    >(null);

    // Errors
    const [takeTokenDecimalizedQtyError, setTakeTokenDecimalizedQtyError] =
        useState<false | string>(false);
    const [agoraQueryError, setAgoraQueryError] = useState<boolean>(false);

    const handleTakeTokenDecimalizedQtySlide = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        // Directly set the user's input even though it is unlikely to be exactly possible
        // in the order
        // We will render the prepared amount in the buy modal
        setTakeTokenDecimalizedQty(e.target.value);
    };

    /**
     * Set the slider to the 25%/50%/75%/100% of what the user can afford
     * OR the selected agora offer
     *
     * Note that if the user can buy the whole offer, this is the whole offer
     * Otherwise it is the most the user can afford based on the user balance
     *
     * Traditional exchange UX would always be the user balance -- but we
     * will need to add the ability for a user to cover multiple "candles"
     * in a single action later, should be coordinated with ecash-wallet
     */
    const handlePercentageButtonClick = (percentage: number) => {
        if (
            !canRenderOrderbook ||
            typeof selectedOffer === 'undefined' ||
            typeof decimals === 'undefined' ||
            typeof decimalizedTokenQtyMax === 'undefined'
        ) {
            return;
        }

        // Calculate the maximum amount the user can afford
        const maxAffordableTokenSatoshis = calculateMaxAffordableAmount(
            selectedOffer,
            balanceSats,
        );

        // The maximum amount available in the selected offer
        const maxAvailableTokenSatoshis = selectedOffer.token.atoms;

        // Determine the reference amount for percentage calculation
        // If user can afford the whole offer, use the offer amount
        // If user cannot afford the whole offer, use the affordable amount
        const referenceAmount =
            maxAffordableTokenSatoshis < maxAvailableTokenSatoshis
                ? maxAffordableTokenSatoshis
                : maxAvailableTokenSatoshis;

        // Calculate the amount based on percentage of the reference amount
        const percentageAmount =
            (referenceAmount * BigInt(percentage)) / BigInt(100);

        // Ensure the amount is at least the minimum accepted amount
        const minAcceptedAmount =
            selectedOffer.variant.params.minAcceptedAtoms();
        const adjustedAmount =
            percentageAmount < minAcceptedAmount
                ? minAcceptedAmount
                : percentageAmount;

        // Round to the nearest valid step
        const step =
            maxAvailableTokenSatoshis / selectedOffer.variant.params.truncAtoms;
        const validAmount = (adjustedAmount / step) * step;

        // Check if the user can afford this amount
        const priceForThisAmount = selectedOffer.askedSats(validAmount);
        if (priceForThisAmount > balanceSats) {
            return; // User cannot afford this amount
        }

        // Convert to decimalized amount for the slider
        const decimalizedQty = decimalizeTokenAmount(
            validAmount.toString(),
            decimals,
        );

        setTakeTokenDecimalizedQty(decimalizedQty);
    };

    const canAffordPercentage = (percentage: number): boolean => {
        if (!canRenderOrderbook || typeof selectedOffer === 'undefined') {
            return false;
        }

        // Calculate the maximum amount the user can afford
        const maxAffordableTokenSatoshis = calculateMaxAffordableAmount(
            selectedOffer,
            balanceSats,
        );

        // The maximum amount available in the selected offer
        const maxAvailableTokenSatoshis = selectedOffer.token.atoms;

        // Determine the reference amount for percentage calculation
        // If user can afford the whole offer, use the offer amount
        // If user cannot afford the whole offer, use the affordable amount
        const referenceAmount =
            maxAffordableTokenSatoshis < maxAvailableTokenSatoshis
                ? maxAffordableTokenSatoshis
                : maxAvailableTokenSatoshis;

        // Calculate the amount based on percentage of the reference amount
        const percentageAmount =
            (referenceAmount * BigInt(percentage)) / BigInt(100);

        // Ensure the amount is at least the minimum accepted amount
        const minAcceptedAmount =
            selectedOffer.variant.params.minAcceptedAtoms();
        const adjustedAmount =
            percentageAmount < minAcceptedAmount
                ? minAcceptedAmount
                : percentageAmount;

        // Round to the nearest valid step
        const step =
            maxAvailableTokenSatoshis / selectedOffer.variant.params.truncAtoms;
        const validAmount = (adjustedAmount / step) * step;

        const priceForThisAmount = selectedOffer.askedSats(validAmount);
        return priceForThisAmount <= balanceSats;
    };

    const calculateMaxAffordableAmount = (
        offer: PartialOffer,
        userBalanceSats: number,
    ): bigint => {
        // Start with the maximum amount available in the offer
        const maxAmount = offer.token.atoms;

        // Fast path: Check if user can afford the whole offer
        const fullOfferPrice = offer.askedSats(maxAmount);
        if (fullOfferPrice <= userBalanceSats) {
            return maxAmount;
        }

        // Binary search to find the maximum amount the user can afford
        let low = offer.variant.params.minAcceptedAtoms();
        let high = maxAmount;

        while (low <= high) {
            const mid = (low + high) / BigInt(2);

            // Round down to the nearest valid step
            const step = maxAmount / offer.variant.params.truncAtoms;
            const validMid = (mid / step) * step;

            if (validMid < offer.variant.params.minAcceptedAtoms()) {
                low = mid + step;
                continue;
            }

            const priceForThisAmount = offer.askedSats(validMid);

            if (priceForThisAmount <= userBalanceSats) {
                // User can afford this amount, try a higher amount
                low = validMid + step;
            } else {
                // User cannot afford this amount, try a lower amount
                high = validMid - step;
            }
        }

        // Return the highest affordable amount
        return high >= offer.variant.params.minAcceptedAtoms()
            ? high
            : BigInt(0);
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

    // We assume the mint outputScript is at genesisOutputScripts[0]
    const mintOutputScript =
        typeof cachedTokenInfo !== 'undefined'
            ? cachedTokenInfo.genesisOutputScripts[0]
            : undefined;

    // Determine if the active wallet created this offer
    // Used to render Buy or Cancel option to the user
    let isMaker;
    if (Array.isArray(activeOffers) && activeOffers.length > 0) {
        selectedOffer = activeOffers[selectedIndex];
        tokenSatoshisMax = selectedOffer.token.atoms;
        const { params } = selectedOffer.variant;
        const { truncAtoms, makerPk } = params;

        tokenSatoshisMin = params.minAcceptedAtoms();

        // Agora Partial offers may only be accepted in discrete amounts
        // We configure the slider to render only these amounts
        tokenSatoshisStep = tokenSatoshisMax! / truncAtoms;

        try {
            isMaker = wallet.pk === toHex(makerPk);
        } catch {
            console.error(`Error comparing wallet.pk with makerPk`);
            console.error(`wallet.pk`, wallet.pk);
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
                tokenSatoshisMax!.toString(),
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
     * depthPercent - the cumulative size of the offer at this spot price compared to other active offers for this token
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
            let totalOfferedTokenSatoshis = 0n;
            const renderedActiveOffers: PartialOffer[] = [];
            for (const activeOffer of activeOffers) {
                const maxOfferTokens = activeOffer.token.atoms;

                const minOfferTokens =
                    activeOffer.variant.params.minAcceptedAtoms();

                // If the active pk made this offer, flag is as unacceptable
                // Otherwise exclude it entirely
                const isMakerThisOffer =
                    wallet.pk === toHex(activeOffer.variant.params.makerPk);
                const isUnacceptable = minOfferTokens > maxOfferTokens;
                if (isUnacceptable) {
                    if (isMakerThisOffer) {
                        activeOffer.isUnacceptable =
                            minOfferTokens > maxOfferTokens;
                    } else {
                        continue;
                    }
                }

                // Check if user can afford the minimum amount of this offer
                const minPriceSats = activeOffer.askedSats(minOfferTokens);
                const canAffordMin = minPriceSats <= balanceSats;

                // Mark offers as unaffordable if user cannot afford even the minimum (unless they made it)
                if (!canAffordMin && !isMakerThisOffer) {
                    activeOffer.isUnaffordable = true;
                } else {
                    activeOffer.isUnaffordable = false;
                }

                totalOfferedTokenSatoshis += maxOfferTokens;
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

                renderedActiveOffers.push(activeOffer);
            }
            // Add relative depth to each offer. If you only have one offer, it's 1.
            // This helps us to style the orderbook
            // We do not use a bignumber library because accuracy is not critical here, only used
            // for rendering depth bars

            // Sort renderedActiveOffers by spot price, lowest to highest
            renderedActiveOffers.sort((a, b) => {
                // Primary sort by spot price
                const spotPriceDiff =
                    Number(a.spotPriceNanoSatsPerTokenSat) -
                    Number(b.spotPriceNanoSatsPerTokenSat);
                if (spotPriceDiff !== 0) {
                    return spotPriceDiff;
                }
                // If spot prices are equal, sort by minAcceptedAtoms
                return (
                    Number(a.variant.params.minAcceptedAtoms()) -
                    Number(b.variant.params.minAcceptedAtoms())
                );
            });

            // Now that we have sorted by spot price, we can properly calculate cumulative depth
            // The most expensive offer will be at 1
            let cumulativeOfferedTokenSatoshis = 0n;
            for (const offer of renderedActiveOffers) {
                const thisOfferAmountTokenSatoshis = offer.token.atoms;
                cumulativeOfferedTokenSatoshis += thisOfferAmountTokenSatoshis;

                offer.cumulativeBaseTokens = cumulativeOfferedTokenSatoshis;

                const depthPercent = new BigNumber(
                    cumulativeOfferedTokenSatoshis.toString(),
                )
                    .div(totalOfferedTokenSatoshis.toString())
                    .times(100)
                    .toNumber();
                offer.depthPercent = depthPercent;
            }

            // Update info map if present
            if (typeof orderBookInfoMap !== 'undefined') {
                orderBookInfoMap.set(tokenId, {
                    totalOfferedTokenSatoshis,
                    spotPriceNanoSatsPerTokenSat: renderedActiveOffers[0]
                        .spotPriceNanoSatsPerTokenSat as bigint,
                    offerCount: renderedActiveOffers.length,
                });
            }
            setActiveOffers(renderedActiveOffers);

            // Find the best offer to auto-select
            // Priority: 1) First affordable offer, 2) First offer (lowest price) if no affordable offers exist
            let bestOfferIndex = 0;
            for (let i = 0; i < renderedActiveOffers.length; i++) {
                if (!renderedActiveOffers[i].isUnaffordable) {
                    bestOfferIndex = i;
                    break;
                }
            }
            setSelectedIndex(bestOfferIndex);
        } catch (err) {
            console.error(`Error loading activeOffers for ${tokenId}`, err);
            setAgoraQueryError(true);
        }
    };

    /**
     * Create a websocket that listens to agora actions for this tokenId
     */
    const prepareOrderbookWs = async () => {
        // We want orderbooks to update in real time when any agora action takes place
        const ws = chronik.ws({
            onMessage: (wsMsg: WsMsgClient) => {
                if (wsMsg.type === 'Error') {
                    // Do nothing on ws error msgs
                    // Have never seen one of these
                    // We mostly have this because of typescript, as an error msg
                    // will not have a msgType key
                    console.error('chronik ws error received', wsMsg);
                    return;
                }
                if (wsMsg.msgType === 'TX_ADDED_TO_MEMPOOL') {
                    // Only respond on mempool additions (we do not want to "double refresh" when orders finalize)

                    // Websocket msgs are either buy, sell, cancel or list
                    // For all of these messages, we need to refresh the orderbook
                    // We could optimize, i.e. determine which activeOffer has changed and update only that offer
                    // However for this, we need better tx-parsing methods to parse individual txs
                    // For first implementation, simply refresh the orderbook on every agora action
                    fetchAndPrepareActiveOffers();
                }
            },
        });
        await ws.waitForOpen();

        // Subscribe to agora actions for this tokenId
        agora.subscribeWs(ws, {
            type: 'TOKEN_ID',
            tokenId,
        });

        // Set it in state
        setWs(ws);
    };

    /**
     * On component load, query agora to get activeOffers for this tokenId orderbook
     */
    useEffect(() => {
        if (!noWebsocket && ws === null) {
            // Init an orderbook websocket if it is not initialized
            // and props have not disabled it
            prepareOrderbookWs();
        }

        // Load active offers on tokenId change or app load
        if (activeOffers === null) {
            // Only fetch activeOffers if we do not already have them
            // Now that ws is in this useEffect, we get back into it after ws has been set
            // But we do not want to fetchAndPrepareActiveOffers just bc the ws is set
            fetchAndPrepareActiveOffers();
        }

        // Cleanup function to unsubscribe and close ws when component unmounts or tokenId changes
        return () => {
            if (activeOffers !== null) {
                // Clear active offers if we have them
                // This can happen if the user has navigated from one token page to another token page
                setActiveOffers(null);
            }
            if (ws !== null) {
                ws.close();
                setWs(null);
            }
        };
    }, [tokenId, ws]);

    /**
     * Update validation and asking price if the selected offer or qty
     * changes
     */
    useEffect(() => {
        if (!canRenderOrderbook) {
            // If we are still loading token info, do nothing
            return;
        }
        if (typeof decimals === 'undefined') {
            // Should be caught by !canRenderOrderbook
            // But if we do not have decimals defined here, will get an error
            return;
        }

        const falseOrErrorMsg = getAgoraPartialAcceptTokenQtyError(
            takeTokenDecimalizedQty,
            decimalizedTokenQtyMin as string,
            decimalizedTokenQtyMax as string,
            decimals as SlpDecimals,
            userLocale,
        );

        setTakeTokenDecimalizedQtyError(falseOrErrorMsg);

        if (falseOrErrorMsg !== false) {
            // We can only prepare token satoshis and set the price if we have valid user input
            // If there is some input error, do not attempt to calculate the true price and take amount
            // Set preparedTokenSatoshis to null so that we do not render any actual amount and cannot buy
            return setPreparedTokenSatoshis(null);
        }

        // Convert validated user input to token satoshis
        const tokenSatoshis = toBigInt(
            undecimalizeTokenAmount(
                takeTokenDecimalizedQty,
                decimals as SlpDecimals,
            ),
        );

        // Get token satoshis amount closest to user input that is acceptable for this AgoraPartial
        const preparedTokenSatoshis = (
            selectedOffer as PartialOffer
        ).variant.params.prepareAcceptedAtoms(tokenSatoshis);

        // Set this separately to state. This is the value we must use for our accept calculations
        // This is also the "actual" value we must present to the user for review
        setPreparedTokenSatoshis(preparedTokenSatoshis);

        // With preparedTokenSatoshis (the "actual" value), we can get the actual price
        const spotPriceSatsThisQty = (selectedOffer as PartialOffer).askedSats(
            preparedTokenSatoshis,
        );

        // We need a second round of validation, now that we know the actual price,
        // to confirm the user can afford this quantity
        if (spotPriceSatsThisQty > balanceSats) {
            setTakeTokenDecimalizedQtyError(
                `Buy price (${toFormattedXec(
                    Number(spotPriceSatsThisQty),
                    userLocale,
                )} XEC) exceeds available balance (${toFormattedXec(
                    balanceSats,
                    userLocale,
                )} XEC).`,
            );
        }

        // The state parameter "askedSats" is only used for rendering pricing information,
        // So it does not require bigint token satoshis precision
        // Instead it must be a number so we can convert it to XEC and fiat and render
        // the correct price
        setAskedSats(Number(spotPriceSatsThisQty));

        // Update when token qty changes
        // In practice, this means we also update when selectedOffer changes,
        // as changing selectedOffer will reset takeTokenDecimalizedQty to the min accept
        // qty of the new selected offer
    }, [takeTokenDecimalizedQty]);

    // Update the slider when the user selects a different offer
    useEffect(() => {
        if (
            Array.isArray(activeOffers) &&
            activeOffers.length > 0 &&
            typeof decimals !== 'undefined'
        ) {
            // Select the minAcceptedTokens amount every time the order changes
            setTakeTokenDecimalizedQty(
                decimalizeTokenAmount(
                    activeOffers[selectedIndex].variant.params
                        .minAcceptedAtoms()
                        .toString(),
                    decimals as SlpDecimals,
                ),
            );
        }
    }, [activeOffers, selectedIndex]);

    // Re-fetch offers when wallet balance changes to re-evaluate affordability
    useEffect(() => {
        if (activeOffers !== null) {
            fetchAndPrepareActiveOffers();
        }
    }, [balanceSats]);

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
            {showConfirmBuyModal && typeof decimals !== 'undefined' && (
                <Modal
                    title={`Execute this trade?`}
                    height={470}
                    showCancelButton
                    handleOk={() => acceptOffer(selectedOffer as PartialOffer)}
                    handleCancel={() => setShowConfirmBuyModal(false)}
                    disabled={
                        activeOffers === null ||
                        (typeof selectedOffer?.spotPriceNanoSatsPerTokenSat !==
                            'undefined' &&
                            typeof activeOffers[0]
                                ?.spotPriceNanoSatsPerTokenSat !==
                                'undefined' &&
                            selectedOffer?.spotPriceNanoSatsPerTokenSat >
                                BigInt(
                                    new BigNumber(
                                        activeOffers[0].spotPriceNanoSatsPerTokenSat.toString(),
                                    )
                                        .times(ALLOW_BUYS_ABOVE_SPOT_RATIO)
                                        .integerValue()
                                        .toString(),
                                ))
                    }
                >
                    <>
                        <TokenIcon size={128} tokenId={tokenId} />
                        <AgoraPreviewParagraph>
                            Agora offers must be accepted at specific
                            quantities.
                        </AgoraPreviewParagraph>
                        <AgoraPreviewParagraph>
                            Review and confirm.
                        </AgoraPreviewParagraph>
                        <AgoraPreviewTable>
                            <AgoraPreviewRow>
                                <AgoraPreviewLabel>
                                    Target qty:{' '}
                                </AgoraPreviewLabel>
                                <AgoraPreviewCol>
                                    {decimalizedTokenQtyToLocaleFormat(
                                        takeTokenDecimalizedQty,
                                        userLocale,
                                    )}
                                </AgoraPreviewCol>
                            </AgoraPreviewRow>
                            <AgoraPreviewRow>
                                <AgoraPreviewLabel>
                                    Actual qty:{' '}
                                </AgoraPreviewLabel>
                                <AgoraPreviewCol>
                                    {decimalizedTokenQtyToLocaleFormat(
                                        decimalizeTokenAmount(
                                            (
                                                preparedTokenSatoshis as bigint
                                            ).toString(),
                                            decimals as SlpDecimals,
                                        ),
                                        userLocale,
                                    )}
                                </AgoraPreviewCol>
                            </AgoraPreviewRow>
                            {getDeltaTokenQtyRow()}
                            <AgoraPreviewRow>
                                <AgoraPreviewLabel>
                                    Price XEC:{' '}
                                </AgoraPreviewLabel>
                                <AgoraPreviewCol>
                                    {`${toXec(askedSats).toLocaleString(
                                        userLocale,
                                    )} XEC`}
                                </AgoraPreviewCol>
                            </AgoraPreviewRow>
                            {fiatPrice !== null && (
                                <AgoraPreviewRow>
                                    <AgoraPreviewLabel>
                                        Price{' '}
                                        {settings.fiatCurrency.toUpperCase()}
                                        :{' '}
                                    </AgoraPreviewLabel>
                                    <AgoraPreviewCol>
                                        {getFormattedFiatPrice(
                                            settings.fiatCurrency,
                                            userLocale,
                                            toXec(askedSats),
                                            fiatPrice,
                                        )}
                                    </AgoraPreviewCol>
                                </AgoraPreviewRow>
                            )}
                            {activeOffers !== null &&
                                typeof activeOffers[0]
                                    .spotPriceNanoSatsPerTokenSat !==
                                    'undefined' &&
                                typeof selectedOffer?.spotPriceNanoSatsPerTokenSat !==
                                    'undefined' && (
                                    <>
                                        {selectedOffer?.spotPriceNanoSatsPerTokenSat !==
                                            activeOffers[0]
                                                .spotPriceNanoSatsPerTokenSat && (
                                            <AgoraPreviewRow>
                                                <AgoraWarningParagraph>
                                                    This offer is{' '}
                                                    {getPercentDeltaOverSpot(
                                                        selectedOffer.spotPriceNanoSatsPerTokenSat,
                                                        activeOffers[0]
                                                            .spotPriceNanoSatsPerTokenSat,
                                                        userLocale,
                                                    )}{' '}
                                                    above spot
                                                </AgoraWarningParagraph>
                                            </AgoraPreviewRow>
                                        )}
                                        {selectedOffer?.spotPriceNanoSatsPerTokenSat >
                                            BigInt(
                                                new BigNumber(
                                                    activeOffers[0].spotPriceNanoSatsPerTokenSat.toString(),
                                                )
                                                    .times(
                                                        ALLOW_BUYS_ABOVE_SPOT_RATIO,
                                                    )
                                                    .integerValue()
                                                    .toString(),
                                            ) && (
                                            <Alert noWordBreak>
                                                Cashtab does not support buying
                                                offers more than{' '}
                                                {(
                                                    100 *
                                                    (ALLOW_BUYS_ABOVE_SPOT_RATIO -
                                                        1)
                                                ).toFixed(0)}
                                                % above spot.
                                            </Alert>
                                        )}
                                    </>
                                )}
                        </AgoraPreviewTable>
                    </>
                </Modal>
            )}
            {showConfirmCancelModal &&
                typeof decimalizedTokenQtyMax === 'string' &&
                typeof selectedOffer !== 'undefined' && (
                    <Modal
                        title={`Cancel your offer to sell ${decimalizedTokenQtyToLocaleFormat(
                            decimalizedTokenQtyMax,
                            userLocale,
                        )} ${tokenName}${
                            tokenTicker !== '' ? ` (${tokenTicker})` : ''
                        } for ${
                            displaySpotPricesInFiat
                                ? getFormattedFiatPrice(
                                      settings.fiatCurrency,
                                      userLocale,
                                      nanoSatoshisToXec(
                                          (selectedOffer.spotPriceNanoSatsPerTokenSat ||
                                              0n) *
                                              BigInt(10 ** (decimals ?? 0)),
                                      ),
                                      fiatPrice,
                                  )
                                : getAgoraSpotPriceXec(
                                      nanoSatoshisToXec(
                                          (selectedOffer.spotPriceNanoSatsPerTokenSat ||
                                              0n) *
                                              BigInt(10 ** (decimals ?? 0)),
                                      ),
                                      userLocale,
                                  )
                        } each?`}
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
                    <OfferHeader noIcon={noIcon}>
                        {!noIcon && (
                            <>
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
                                    {typeof tokenName !== 'string' ? (
                                        <InlineLoader />
                                    ) : (
                                        <>
                                            <OfferTitleLink
                                                href={`#/token/${tokenId}`}
                                                fontSize={getTitleFontSize(
                                                    tokenName,
                                                )}
                                            >
                                                {tokenName}
                                            </OfferTitleLink>
                                            <span>
                                                {tokenTicker !== ''
                                                    ? tokenTicker
                                                    : ''}
                                            </span>
                                        </>
                                    )}
                                    <CopyTokenId tokenId={tokenId} />
                                </OfferTitleCtn>
                            </>
                        )}
                        <OfferHeaderRow noIcon={noIcon}>
                            <div>
                                {activeOffers.length} Offer
                                {activeOffers.length > 1 && 's'}
                            </div>
                            <Switch
                                small
                                name={`Toggle price for ${tokenId}`}
                                on={settings.fiatCurrency}
                                width={60}
                                right={40}
                                off={appConfig.ticker}
                                checked={displaySpotPricesInFiat}
                                handleToggle={() => {
                                    setDisplaySpotPricesInFiat(
                                        () => !displaySpotPricesInFiat,
                                    );
                                }}
                            />
                        </OfferHeaderRow>
                    </OfferHeader>

                    {agoraQueryError && (
                        <Alert>
                            Error querying agora for active offers. Try again
                            later.
                        </Alert>
                    )}
                    {canRenderOrderbook && (
                        <OfferDetailsCtn>
                            <DepthBarCol noIcon={noIcon}>
                                {activeOffers.map((activeOffer, index) => {
                                    const {
                                        depthPercent,
                                        cumulativeBaseTokens,
                                        isUnacceptable,
                                        isUnaffordable,
                                    } = activeOffer;
                                    const acceptPercent =
                                        ((depthPercent as number) *
                                            Number(takeTokenDecimalizedQty)) /
                                        Number(decimalizedTokenQtyMax);

                                    const tooltipCumulativeTokensThisOffer =
                                        typeof cumulativeBaseTokens !==
                                        'undefined'
                                            ? decimalizedTokenQtyToLocaleFormat(
                                                  decimalizeTokenAmount(
                                                      cumulativeBaseTokens.toString(),
                                                      decimals as SlpDecimals,
                                                  ),
                                                  userLocale,
                                              )
                                            : '';

                                    const tooltipAvailableTokensThisOffer =
                                        decimalizedTokenQtyToLocaleFormat(
                                            decimalizeTokenAmount(
                                                activeOffer.token.atoms.toString(),
                                                decimals as SlpDecimals,
                                            ),
                                            userLocale,
                                        );

                                    const { makerPk } =
                                        activeOffer.variant.params;
                                    const isMakerThisOffer =
                                        wallet.pk === toHex(makerPk);

                                    const makerHash = shaRmd160(makerPk);
                                    const makerOutputScript =
                                        Address.p2pkh(makerHash).toScriptHex();
                                    const sellerIsMintAddress =
                                        typeof mintOutputScript !==
                                            'undefined' &&
                                        mintOutputScript === makerOutputScript;

                                    return (
                                        <OrderBookRow
                                            key={index}
                                            data-tooltip-id="cashtab-tooltip"
                                            data-tooltip-content={`${tooltipAvailableTokensThisOffer} ${tokenTicker}${
                                                tooltipCumulativeTokensThisOffer !==
                                                ''
                                                    ? ` (${tooltipCumulativeTokensThisOffer} total)`
                                                    : ''
                                            }`}
                                            onClick={() =>
                                                setSelectedIndex(index)
                                            }
                                            selected={index === selectedIndex}
                                        >
                                            <DepthBar
                                                depthPercent={
                                                    depthPercent as number
                                                }
                                                isMaker={isMakerThisOffer}
                                                isUnacceptable={isUnacceptable}
                                                isUnaffordable={isUnaffordable}
                                            ></DepthBar>
                                            {index === selectedIndex && (
                                                <TentativeAcceptBar
                                                    acceptPercent={
                                                        acceptPercent
                                                    }
                                                ></TentativeAcceptBar>
                                            )}
                                            <OrderbookPrice>
                                                {sellerIsMintAddress && (
                                                    <MintIconSpotWrapper>
                                                        <IsMintAddressIcon />
                                                    </MintIconSpotWrapper>
                                                )}
                                                {displaySpotPricesInFiat
                                                    ? getFormattedFiatPrice(
                                                          settings.fiatCurrency,
                                                          userLocale,
                                                          nanoSatoshisToXec(
                                                              (activeOffer.spotPriceNanoSatsPerTokenSat ||
                                                                  0n) *
                                                                  BigInt(
                                                                      10 **
                                                                          (decimals ??
                                                                              0),
                                                                  ),
                                                          ),
                                                          fiatPrice,
                                                      )
                                                    : getAgoraSpotPriceXec(
                                                          nanoSatoshisToXec(
                                                              (activeOffer.spotPriceNanoSatsPerTokenSat ||
                                                                  0n) *
                                                                  BigInt(
                                                                      10 **
                                                                          (decimals ??
                                                                              0),
                                                                  ),
                                                          ),
                                                          userLocale,
                                                      )}
                                            </OrderbookPrice>
                                        </OrderBookRow>
                                    );
                                })}
                            </DepthBarCol>
                            {typeof selectedOffer !== 'undefined' &&
                            selectedOffer.isUnaffordable ? (
                                <SliderContainer>
                                    <Alert noWordBreak>
                                        This offer requires a minimum purchase
                                        that exceeds your available balance.
                                    </Alert>
                                </SliderContainer>
                            ) : (
                                <SliderContainer>
                                    <SliderInputRow>
                                        <Slider
                                            name={`Select buy qty ${tokenId}`}
                                            value={takeTokenDecimalizedQty}
                                            error={takeTokenDecimalizedQtyError}
                                            handleSlide={
                                                handleTakeTokenDecimalizedQtySlide
                                            }
                                            // Note that we can only be here if canRenderOrderbook
                                            min={
                                                decimalizedTokenQtyMin as string
                                            }
                                            max={
                                                decimalizedTokenQtyMax as string
                                            }
                                            step={parseFloat(`1e-${decimals}`)}
                                            allowTypedInput
                                        />
                                    </SliderInputRow>
                                    {!isMaker && (
                                        <PercentageButtonsRow>
                                            <PercentageButton
                                                onClick={() =>
                                                    handlePercentageButtonClick(
                                                        25,
                                                    )
                                                }
                                                disabled={
                                                    !canRenderOrderbook ||
                                                    typeof selectedOffer ===
                                                        'undefined' ||
                                                    !canAffordPercentage(25)
                                                }
                                                title={
                                                    canAffordPercentage(25)
                                                        ? 'Set to 25% of reference amount'
                                                        : 'Cannot afford 25% of reference amount'
                                                }
                                            >
                                                25%
                                            </PercentageButton>
                                            <PercentageButton
                                                onClick={() =>
                                                    handlePercentageButtonClick(
                                                        50,
                                                    )
                                                }
                                                disabled={
                                                    !canRenderOrderbook ||
                                                    typeof selectedOffer ===
                                                        'undefined' ||
                                                    !canAffordPercentage(50)
                                                }
                                                title={
                                                    canAffordPercentage(50)
                                                        ? 'Set to 50% of reference amount'
                                                        : 'Cannot afford 50% of reference amount'
                                                }
                                            >
                                                50%
                                            </PercentageButton>
                                            <PercentageButton
                                                onClick={() =>
                                                    handlePercentageButtonClick(
                                                        75,
                                                    )
                                                }
                                                disabled={
                                                    !canRenderOrderbook ||
                                                    typeof selectedOffer ===
                                                        'undefined' ||
                                                    !canAffordPercentage(75)
                                                }
                                                title={
                                                    canAffordPercentage(75)
                                                        ? 'Set to 75% of reference amount'
                                                        : 'Cannot afford 75% of reference amount'
                                                }
                                            >
                                                75%
                                            </PercentageButton>
                                            <PercentageButton
                                                onClick={() => {
                                                    // If user cannot afford the whole offer, use 99% instead of 100%
                                                    const maxAffordable =
                                                        calculateMaxAffordableAmount(
                                                            selectedOffer as PartialOffer,
                                                            balanceSats,
                                                        );
                                                    const maxAvailable = (
                                                        selectedOffer as PartialOffer
                                                    ).token.atoms;
                                                    const percentage =
                                                        maxAffordable <
                                                        maxAvailable
                                                            ? 99
                                                            : 100;
                                                    handlePercentageButtonClick(
                                                        percentage,
                                                    );
                                                }}
                                                disabled={
                                                    !canRenderOrderbook ||
                                                    typeof selectedOffer ===
                                                        'undefined'
                                                }
                                                title={(() => {
                                                    if (
                                                        !canRenderOrderbook ||
                                                        typeof selectedOffer ===
                                                            'undefined'
                                                    ) {
                                                        return 'Set to maximum amount';
                                                    }
                                                    const maxAffordable =
                                                        calculateMaxAffordableAmount(
                                                            selectedOffer as PartialOffer,
                                                            balanceSats,
                                                        );
                                                    const maxAvailable = (
                                                        selectedOffer as PartialOffer
                                                    ).token.atoms;
                                                    return maxAffordable <
                                                        maxAvailable
                                                        ? 'Set to 99% of maximum affordable amount'
                                                        : 'Set to maximum available amount';
                                                })()}
                                            >
                                                Max
                                            </PercentageButton>
                                        </PercentageButtonsRow>
                                    )}
                                </SliderContainer>
                            )}
                            <BuyOrderCtn>
                                <div>
                                    {decimalizedTokenQtyToLocaleFormat(
                                        takeTokenDecimalizedQty,
                                        userLocale,
                                    )}{' '}
                                    {tokenTicker !== ''
                                        ? `${tokenTicker}`
                                        : `${tokenName}`}
                                </div>
                                {!displaySpotPricesInFiat ||
                                fiatPrice === null ? (
                                    <h3>
                                        {toFormattedXec(askedSats, userLocale)}{' '}
                                        XEC
                                    </h3>
                                ) : (
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
                                            takeTokenDecimalizedQtyError !==
                                                false ||
                                            preparedTokenSatoshis === null ||
                                            (typeof selectedOffer !==
                                                'undefined' &&
                                                selectedOffer.isUnaffordable)
                                        }
                                    >
                                        Buy{' '}
                                        {tokenTicker !== ''
                                            ? tokenTicker
                                            : tokenName}
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
