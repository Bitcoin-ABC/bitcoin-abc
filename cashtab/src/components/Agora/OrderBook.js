// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * OrderBook.js
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
import PropTypes from 'prop-types';
import { explorer } from 'config/explorer';
import {
    nanoSatoshisToXec,
    decimalizeTokenAmount,
    toXec,
    getAgoraPartialAcceptFuelInputs,
    getAgoraPartialCancelFuelInputs,
    hasEnoughToken,
    DUMMY_KEYPAIR,
} from 'wallet';
import { ignoreUnspendableUtxos } from 'transactions';
import {
    toFormattedXec,
    getFormattedFiatPrice,
    decimalizedTokenQtyToLocaleFormat,
} from 'utils/formatting';
import {
    NftTokenIdAndCopyIcon,
    TokenSentLink,
    DataAndQuestionButton,
} from 'components/Etokens/Token/styled';
import {
    DepthBarCol,
    OfferIconCol,
    OfferRow,
    OfferIcon,
    DepthBar,
    TentativeAcceptBar,
    OrderBookRow,
    OrderbookPrice,
    SliderRow,
    SliderInfoRow,
} from './styled';
import PrimaryButton, {
    SecondaryButton,
    IconButton,
    CopyIconButton,
} from 'components/Common/Buttons';
import Modal from 'components/Common/Modal';
import { Script, P2PKHSignatory, ALL_BIP143, toHex, fromHex } from 'ecash-lib';
import * as wif from 'wif';
import appConfig from 'config/app';
import { toast } from 'react-toastify';
import TokenIcon from 'components/Etokens/TokenIcon';
import { getAgoraPartialAcceptTokenQtyError } from 'validation';
import { QuestionIcon } from 'components/Common/CustomIcons';

const OrderBook = ({
    tokenId,
    activeOffers,
    cachedTokenInfo,
    settings,
    userLocale,
    fiatPrice,
    activePk,
    wallet,
    ecc,
    chronik,
    chaintipBlockheight,
    onAgoraAcceptOrCancel,
}) => {
    const cancelOffer = async agoraPartial => {
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
            fuelUtxos = getAgoraPartialCancelFuelInputs(
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
            // Send the tokens back to the same address as the fuelUtxo
            const recipientScript = Script.p2pkh(
                fromHex(wallet.paths.get(fuelUtxo.path).hash),
            );

            // sk for the tx is the sk for this utxo
            const sk = wif.decode(
                wallet.paths.get(fuelUtxo.path).wif,
            ).privateKey;

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

        // Build the cancel tx
        const cancelTxSer = agoraPartial
            .cancelTx({
                ecc,
                // Cashtab default path
                // This works here because we lookup cancelable offers by the same path
                // Would need a different approach if Cashtab starts supporting HD wallets
                cancelSk: wif.decode(
                    wallet.paths.get(appConfig.derivationPath).wif,
                ).privateKey,
                fuelInputs: fuelInputs,
                // Change to Cashtab default derivation path
                recipientScript: Script.p2pkh(
                    fromHex(wallet.paths.get(appConfig.derivationPath).hash),
                ),
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
            onAgoraAcceptOrCancel();
        } catch (err) {
            console.error('Error canceling offer', err);
            toast.error(`${err}`);
        }
    };

    const acceptOffer = async agoraPartial => {
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
                BigInt(takeTokenSatoshis),
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
            // Sign and prep utxos for ecash-lib inputs
            const recipientScript = Script.p2pkh(
                fromHex(wallet.paths.get(fuelUtxo.path).hash),
            );
            const sk = wif.decode(
                wallet.paths.get(fuelUtxo.path).wif,
            ).privateKey;
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

        // Use an arbitrary sk, pk for the convenant
        const acceptTxSer = agoraPartial
            .acceptTx({
                ecc,
                covenantSk: DUMMY_KEYPAIR.sk,
                covenantPk: DUMMY_KEYPAIR.pk,
                fuelInputs: signedFuelInputs,
                // Accept at default path, 1899
                recipientScript: Script.p2pkh(
                    fromHex(wallet.paths.get(appConfig.derivationPath).hash),
                ),
                feePerKb: satsPerKb,
                acceptedTokens: BigInt(takeTokenSatoshis),
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
                        decimals,
                    )} ${tokenName} ${tokenTicker} for
                    ${toXec(askedSats).toLocaleString(userLocale)} XEC
                    ${
                        fiatPrice !== null
                            ? ` (${getFormattedFiatPrice(
                                  settings,
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
            onAgoraAcceptOrCancel();
        } catch (err) {
            console.error('Error accepting offer', err);
            toast.error(`${err}`);
        }
    };

    // On load, we select the offer at the 0-index
    // In Cashtab, offers are sorted by spot price; so this is the spot offer
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedOffer = activeOffers[selectedIndex];
    const tokenSatoshisMax = BigInt(selectedOffer.token.amount);

    const [showLargeIconModal, setShowLargeIconModal] = useState(false);
    const [showAcceptedQtyInfo, setShowAcceptedQtyInfo] = useState(false);
    const [askedSats, setAskedSats] = useState(0);
    const [showConfirmBuyModal, setShowConfirmBuyModal] = useState(false);
    const [showConfirmCancelModal, setShowConfirmCancelModal] = useState(false);

    const handleTakeTokenSatoshisSlide = e => {
        setTakeTokenSatoshis(e.target.value);
    };

    const { params } = selectedOffer.variant;
    const { truncTokens, makerPk } = params;

    // Determine if the active wallet created this offer
    // Used to render Buy or Cancel option to the user
    // Validate activePk as it could be null from Agora/index.js (not yet calculated)
    let isMaker = false;
    try {
        isMaker = toHex(activePk) === toHex(makerPk);
    } catch (err) {
        console.error(`Error comparing activePk with makerPk`);
        console.error(`activePk`, activePk);
        console.error(`makerPk`, makerPk);
    }

    // See public minAcceptedTokens() in partial.ts, from ecash-agora
    const tokenSatoshisMin = params.minAcceptedTokens();

    // Handle case of token info not available in cache
    let tokenName = <InlineLoader />;
    let tokenTicker = <InlineLoader />;

    // We initialize these values as false since, unlike NFTs
    // We will not allow fungible token sales if we do not have
    // token cached info
    // This is because we need the decimals to really know the quantity
    let tokenSatoshisStep;
    let decimalizedTokenMin = false;
    let decimalizedTokenMax = false;
    let decimalizedStep = false;
    let decimals = false;
    if (typeof cachedTokenInfo !== 'undefined') {
        decimals = cachedTokenInfo.genesisInfo.decimals;
        tokenName = cachedTokenInfo.genesisInfo.tokenName;
        tokenTicker =
            cachedTokenInfo.genesisInfo.tokenTicker === ''
                ? ''
                : ` (${cachedTokenInfo.genesisInfo.tokenTicker})`;

        // We need undecimimalized amounts as BigInts so we do not have JS number math effects
        // The sliders need to work under the hood with token sats as BigInts
        // But we need decimalized amounts to show the user

        // We calculate decimalized values to show the user what he is buying
        decimalizedTokenMin = decimalizeTokenAmount(
            tokenSatoshisMin.toString(),
            decimals,
        );

        // Agora Partial offers may only be accepted in discrete amounts
        // We configure the slider to render only these amounts
        tokenSatoshisStep = BigInt(tokenSatoshisMax) / truncTokens;
        decimalizedStep = decimalizeTokenAmount(
            tokenSatoshisStep.toString(),
            decimals,
        );

        decimalizedTokenMax = decimalizeTokenAmount(
            tokenSatoshisMax.toString(),
            decimals,
        );
    }

    // Initialize accepted qty as the minimum
    // Note that takeTokenSatoshis is a string because slider values are strings
    const [takeTokenSatoshis, setTakeTokenSatoshis] = useState(
        tokenSatoshisMin.toString(),
    );
    const [takeTokenSatoshisError, setTakeTokenSatoshisError] = useState(false);

    /**
     * Update validation and asking price if the selected offer or qty
     * changes
     */
    useEffect(() => {
        if (decimals === false) {
            // If we are still loading token info, do nothing
            return;
        }
        setTakeTokenSatoshisError(
            getAgoraPartialAcceptTokenQtyError(
                BigInt(takeTokenSatoshis),
                tokenSatoshisMin,
                tokenSatoshisMax,
                decimals,
            ),
        );

        // Note you must prepareAcceptedTokens for the price
        // Note, this amount is be prepared as the slider has a step corresponding
        // with the granularity of the token offer, and all the math is done with BigInt
        const spotPriceSatsThisQty = selectedOffer.askedSats(
            BigInt(takeTokenSatoshis),
        );
        setAskedSats(Number(spotPriceSatsThisQty));

        // Update when token qty or selectedOffer changes
    }, [takeTokenSatoshis]);

    // Update the slider when the user selects a different offer
    useEffect(() => {
        // Select the minAcceptedTokens amount every time the order changes
        setTakeTokenSatoshis(
            activeOffers[selectedIndex].variant.params
                .minAcceptedTokens()
                .toString(),
        );
    }, [selectedIndex]);

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
                        decimalizeTokenAmount(takeTokenSatoshis, decimals),
                        userLocale,
                    )} ${tokenName}${tokenTicker} for ${toXec(
                        askedSats,
                    ).toLocaleString(userLocale)} XEC${
                        fiatPrice !== null
                            ? ` (${getFormattedFiatPrice(
                                  settings,
                                  userLocale,
                                  toXec(askedSats),
                                  fiatPrice,
                              )})?`
                            : '?'
                    }`}
                    height={290}
                    showCancelButton
                    handleOk={() => acceptOffer(selectedOffer)}
                    handleCancel={() => setShowConfirmBuyModal(false)}
                >
                    <TokenIcon size={128} tokenId={tokenId} />
                </Modal>
            )}
            {showConfirmCancelModal &&
                typeof decimalizedTokenMax === 'string' && (
                    <Modal
                        title={`Cancel your offer to sell ${decimalizedTokenQtyToLocaleFormat(
                            decimalizedTokenMax,
                            userLocale,
                        )} ${tokenName}${tokenTicker} for ${toXec(
                            askedSats,
                        ).toLocaleString(userLocale)} XEC${
                            fiatPrice !== null
                                ? ` (${getFormattedFiatPrice(
                                      settings,
                                      userLocale,
                                      toXec(askedSats),
                                      fiatPrice,
                                  )})?`
                                : '?'
                        }`}
                        description={`Note that canceling an offer will cancel the entire offer`}
                        height={250}
                        showCancelButton
                        handleOk={() => cancelOffer(selectedOffer)}
                        handleCancel={() => setShowConfirmCancelModal(false)}
                    />
                )}
            <OfferRow>
                {tokenName}
                {tokenTicker}
            </OfferRow>
            <OfferRow>
                <OfferIconCol>
                    <OfferIcon
                        title={tokenId}
                        size={64}
                        tokenId={tokenId}
                        aria-label={`View larger icon for ${tokenName}`}
                        onClick={() => setShowLargeIconModal(true)}
                    />
                    <OfferRow>
                        <NftTokenIdAndCopyIcon>
                            <a
                                href={`${explorer.blockExplorerUrl}/tx/${tokenId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {tokenId.slice(0, 3)}
                                ...
                                {tokenId.slice(-3)}
                            </a>
                            <CopyIconButton
                                data={tokenId}
                                showToast
                                customMsg={`Token ID "${tokenId}" copied to clipboard`}
                            />
                        </NftTokenIdAndCopyIcon>
                    </OfferRow>
                </OfferIconCol>
                <DepthBarCol>
                    {activeOffers.map((activeOffer, index) => {
                        return (
                            <OrderBookRow
                                key={index}
                                onClick={() => setSelectedIndex(index)}
                                selected={index === selectedIndex}
                            >
                                <OrderbookPrice>
                                    {getFormattedFiatPrice(
                                        settings,
                                        userLocale,
                                        nanoSatoshisToXec(
                                            Number(
                                                activeOffer.spotPriceNanoSats,
                                            ) * parseFloat(`1e${decimals}`),
                                        ),
                                        fiatPrice,
                                    )}
                                    <DepthBar
                                        depthPercent={activeOffer.depthPercent}
                                    ></DepthBar>
                                    {index === selectedIndex && (
                                        <TentativeAcceptBar
                                            acceptPercent={
                                                Number(
                                                    activeOffer.depthPercent,
                                                ) *
                                                Number(
                                                    BigInt(takeTokenSatoshis) /
                                                        tokenSatoshisMax,
                                                )
                                            }
                                        ></TentativeAcceptBar>
                                    )}
                                </OrderbookPrice>
                            </OrderBookRow>
                        );
                    })}
                </DepthBarCol>
            </OfferRow>
            {decimalizedTokenMin !== false &&
                decimalizedTokenMax !== false &&
                decimalizedStep !== false &&
                typeof tokenSatoshisMin !== 'undefined' &&
                typeof tokenSatoshisMax !== 'undefined' &&
                typeof tokenSatoshisStep !== 'undefined' &&
                typeof takeTokenSatoshis !== 'undefined' && (
                    <>
                        <SliderRow>
                            <Slider
                                name={`Select buy qty ${tokenId}`}
                                value={takeTokenSatoshis}
                                error={takeTokenSatoshisError}
                                handleSlide={handleTakeTokenSatoshisSlide}
                                min={tokenSatoshisMin.toString()}
                                max={tokenSatoshisMax.toString()}
                                step={tokenSatoshisStep.toString()}
                                fixedWidth
                            />
                            <DataAndQuestionButton>
                                {decimalizedTokenQtyToLocaleFormat(
                                    decimalizeTokenAmount(
                                        takeTokenSatoshis,
                                        decimals,
                                    ),
                                    userLocale,
                                )}{' '}
                                <IconButton
                                    name={`Click for more info about agora partial sales`}
                                    icon={<QuestionIcon />}
                                    onClick={() => setShowAcceptedQtyInfo(true)}
                                />
                            </DataAndQuestionButton>
                            <SliderInfoRow>
                                {toFormattedXec(askedSats, userLocale)} XEC
                            </SliderInfoRow>
                            {fiatPrice !== null && (
                                <SliderInfoRow>
                                    {getFormattedFiatPrice(
                                        settings,
                                        userLocale,
                                        toXec(askedSats),
                                        fiatPrice,
                                    )}
                                </SliderInfoRow>
                            )}
                        </SliderRow>
                        <OfferRow>
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
                                    onClick={() => setShowConfirmBuyModal(true)}
                                    disabled={takeTokenSatoshisError}
                                >
                                    Buy {tokenName}
                                    {tokenTicker}
                                </PrimaryButton>
                            )}
                        </OfferRow>
                    </>
                )}
        </>
    );
};

OrderBook.propTypes = {
    tokenId: PropTypes.string,
    activeOffers: PropTypes.array,
    cachedTokenInfo: PropTypes.object,
    settings: PropTypes.object,
    userLocale: PropTypes.string,
    fiatPrice: PropTypes.number,
    activePk: PropTypes.object, // Uint8array
    wallet: PropTypes.object,
    ecc: PropTypes.any,
    chronik: PropTypes.object,
    chaintipBlockheight: PropTypes.number,
    onAgoraAcceptOrCancel: PropTypes.func,
};

export default OrderBook;
