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
    getAgoraPartialAcceptFuelInputs,
    getAgoraCancelFuelInputs,
    hasEnoughToken,
    DUMMY_KEYPAIR,
    toBigInt,
    SlpDecimals,
    undecimalizeTokenAmount,
    CashtabPathInfo,
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
    SliderRow,
    OrderBookLoading,
    OfferWrapper,
    OfferHeader,
    OfferTitleCtn,
    OfferDetailsCtn,
    BuyOrderCtn,
    MintIconSpotWrapper,
    DeltaSpan,
    AgoraWarningParagraph,
    OfferHeaderRow,
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
import { AgoraOffer, AgoraPartial } from 'ecash-agora';
import { IsMintAddressIcon } from 'components/Common/CustomIcons';

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
}
const OrderBook: React.FC<OrderBookProps> = ({
    tokenId,
    userLocale,
    noIcon,
    orderBookInfoMap,
}) => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const {
        ecc,
        fiatPrice,
        chronik,
        agora,
        cashtabState,
        chaintipBlockheight,
    } = ContextValue;
    const { wallets, settings, cashtabCache } = cashtabState;
    if (wallets.length === 0 || typeof wallets[0].paths === 'undefined') {
        // Note that, in the app, we will never render this component without wallets[0] as a loaded wallet
        // Because the App component will only show OnBoarding in this case
        // But because we directly test this component with context, we must handle this case
        return null;
    }

    const wallet = wallets[0];
    const activePk = (
        wallet.paths.get(appConfig.derivationPath) as CashtabPathInfo
    ).pk;

    const cachedTokenInfo = cashtabCache.tokens.get(tokenId);

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
            setShowConfirmCancelModal(false);
            // Update offers
            fetchAndPrepareActiveOffers();
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
                preparedTokenSatoshis,
                satsPerKb,
            );
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
                acceptedTokens: preparedTokenSatoshis,
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
            setShowConfirmBuyModal(false);
            // Update offers
            fetchAndPrepareActiveOffers();
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

    const [activeOffers, setActiveOffers] = useState<null | PartialOffer[]>(
        null,
    );

    /**
     * Show spot prices in XEC even if fiat is available
     * Note that spot prices are always rendered in XEC if
     * fiat info is unavailable
     */
    const [displaySpotPricesInFiat, setDisplaySpotPricesInFiat] =
        useState<boolean>(false);
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
                const maxOfferTokens = BigInt(activeOffer.token.amount);

                const minOfferTokens =
                    activeOffer.variant.params.minAcceptedTokens();

                // If the active pk made this offer, flag is as unacceptable
                // Otherwise exclude it entirely
                const isMakerThisOffer =
                    toHex(activePk as Uint8Array) ===
                    toHex(activeOffer.variant.params.makerPk);
                const isUnacceptable = minOfferTokens > maxOfferTokens;
                if (isUnacceptable) {
                    if (isMakerThisOffer) {
                        activeOffer.isUnacceptable =
                            minOfferTokens > maxOfferTokens;
                    } else {
                        continue;
                    }
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
                // If spot prices are equal, sort by minAcceptedTokens
                return (
                    Number(a.variant.params.minAcceptedTokens()) -
                    Number(b.variant.params.minAcceptedTokens())
                );
            });

            // Now that we have sorted by spot price, we can properly calculate cumulative depth
            // The most expensive offer will be at 1
            let cumulativeOfferedTokenSatoshis = 0n;
            for (const offer of renderedActiveOffers) {
                const thisOfferAmountTokenSatoshis = offer.token.amount;
                cumulativeOfferedTokenSatoshis += BigInt(
                    thisOfferAmountTokenSatoshis,
                );
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
                    spotPriceNanoSatsPerTokenSat: activeOffers[0]
                        .spotPriceNanoSatsPerTokenSat as bigint,
                    offerCount: activeOffers.length,
                });
            }
            setActiveOffers(renderedActiveOffers);
        } catch (err) {
            console.error(`Error loading activeOffers for ${tokenId}`, err);
            setAgoraQueryError(true);
        }
    };

    /**
     * On component load, query agora to get activeOffers for this tokenId orderbook
     */
    useEffect(() => {
        // Clear active offers if we have them
        // This can happen if the user has navigated from one token page to another token page
        if (activeOffers !== null) {
            setActiveOffers(null);
        }

        // Load active offers on tokenId change or app load
        fetchAndPrepareActiveOffers();
    }, [tokenId]);

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
        ).variant.params.prepareAcceptedTokens(tokenSatoshis);

        // Set this separately to state. This is the value we must use for our accept calculations
        // This is also the "actual" value we must present to the user for review
        setPreparedTokenSatoshis(preparedTokenSatoshis);

        // With preparedTokenSatoshis (the "actual" value), we can get the actual price
        const spotPriceSatsThisQty = (selectedOffer as PartialOffer).askedSats(
            preparedTokenSatoshis,
        );

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
                        .minAcceptedTokens()
                        .toString(),
                    decimals as SlpDecimals,
                ),
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
            {showConfirmBuyModal && typeof decimals !== 'undefined' && (
                <Modal
                    title={`Execute this trade?`}
                    height={470}
                    showCancelButton
                    handleOk={() => acceptOffer(selectedOffer as PartialOffer)}
                    handleCancel={() => setShowConfirmBuyModal(false)}
                    disabled={
                        activeOffers === null ||
                        selectedOffer?.spotPriceNanoSatsPerTokenSat !==
                            activeOffers[0].spotPriceNanoSatsPerTokenSat
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
                                        {settings.fiatCurrency.toUpperCase()}:{' '}
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
                                    'undefined' &&
                                selectedOffer?.spotPriceNanoSatsPerTokenSat !==
                                    activeOffers[0]
                                        .spotPriceNanoSatsPerTokenSat && (
                                    <>
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
                                        <Alert noWordBreak>
                                            Cashtab does not support buying
                                            offers above spot.
                                        </Alert>
                                    </>
                                )}
                        </AgoraPreviewTable>
                    </>
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
                        } for ${getAgoraSpotPriceXec(
                            toXec(askedSats),
                            userLocale,
                        )} ${
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
                                {typeof tokenName !== 'string' ? (
                                    <InlineLoader />
                                ) : (
                                    <>
                                        <a href={`#/token/${tokenId}`}>
                                            {tokenName}
                                        </a>
                                        <span>
                                            {tokenTicker !== ''
                                                ? tokenTicker
                                                : ''}
                                        </span>
                                    </>
                                )}
                                <CopyTokenId tokenId={tokenId} />
                            </OfferTitleCtn>
                            <OfferHeaderRow>
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
                                    const { depthPercent, isUnacceptable } =
                                        activeOffer;
                                    const acceptPercent =
                                        ((depthPercent as number) *
                                            Number(takeTokenDecimalizedQty)) /
                                        Number(decimalizedTokenQtyMax);

                                    const { makerPk } =
                                        activeOffer.variant.params;
                                    const isMakerThisOffer =
                                        toHex(activePk as Uint8Array) ===
                                        toHex(makerPk);

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
                                                              Number(
                                                                  activeOffer.spotPriceNanoSatsPerTokenSat,
                                                              ) *
                                                                  parseFloat(
                                                                      `1e${decimals}`,
                                                                  ),
                                                          ),
                                                          fiatPrice,
                                                      )
                                                    : getAgoraSpotPriceXec(
                                                          nanoSatoshisToXec(
                                                              Number(
                                                                  activeOffer.spotPriceNanoSatsPerTokenSat,
                                                              ) *
                                                                  parseFloat(
                                                                      `1e${decimals}`,
                                                                  ),
                                                          ),
                                                          userLocale,
                                                      )}
                                            </OrderbookPrice>
                                        </OrderBookRow>
                                    );
                                })}
                            </DepthBarCol>
                            {noIcon && (
                                <SliderRow>
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
                                </SliderRow>
                            )}
                            <SliderRow>
                                <Slider
                                    name={`Select buy qty ${tokenId}`}
                                    value={takeTokenDecimalizedQty}
                                    error={takeTokenDecimalizedQtyError}
                                    handleSlide={
                                        handleTakeTokenDecimalizedQtySlide
                                    }
                                    // Note that we can only be here if canRenderOrderbook
                                    min={decimalizedTokenQtyMin as string}
                                    max={decimalizedTokenQtyMax as string}
                                    step={parseFloat(`1e-${decimals}`)}
                                    allowTypedInput
                                />
                            </SliderRow>
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
                                            preparedTokenSatoshis === null
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
