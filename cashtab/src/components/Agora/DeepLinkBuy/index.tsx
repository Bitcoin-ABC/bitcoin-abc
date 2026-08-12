// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * DeepLinkBuy
 *
 * Fait-accompli confirmation screen for agora BUY deep links
 * (see doc/standards/agora-deeplink.md). Opened only when the app is
 * deeplinked with action=BUY — not when the user browses the token page
 * manually.
 *
 * The user reviews the token, quantity and price, then clicks OK or Reject.
 * With a quantity in the link, the amount is locked; without one, it is
 * editable. OK completes the take and shows a success screen that auto-closes.
 *
 * Dismiss (Reject, success Close, or success autoclose) matches deeplinked tx
 * handoff: returnToBrowser on native exits the app; otherwise window.close()
 * (same as SendXec URL txs). Nothing is signed until OK.
 */

import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { toast } from 'react-toastify';
import { toHex } from 'ecash-lib';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import {
    decimalizeTokenAmount,
    DUMMY_KEYPAIR,
    SlpDecimals,
    toBigInt,
    toXec,
    undecimalizeTokenAmount,
} from 'wallet';
import {
    decimalizedTokenQtyToLocaleFormat,
    formatAmountFromWire,
    getFormattedFiatPrice,
    normalizeDecimalInput,
    toFormattedXec,
} from 'formatting';
import { getAgoraPartialAcceptTokenQtyError } from 'validation';
import { explorer } from 'config/explorer';
import { confirmBiometricBroadcast } from 'services/biometricLockService';
import TokenIcon from 'components/Etokens/TokenIcon';
import PrimaryButton, { SecondaryButton } from 'components/Common/Buttons';
import { Slider } from 'components/Common/Inputs';
import { InlineLoader } from 'components/Common/Spinner';
import { Alert, Info } from 'components/Common/Atoms';
import Burst from 'assets/burst.png';
import {
    SUCCESS_MODAL_DURATION_MS,
    SuccessButton,
    SuccessIcon,
    SuccessModalContent,
    SuccessModalOverlay,
    TransactionIdLink,
} from 'components/Send/styled';
import {
    PartialOffer,
    findFillableOfferIndex,
    prepareBuyableOffers,
} from 'components/Agora/partialOffers';
import {
    DeepLinkBuyActions,
    DeepLinkBuyAmountCtn,
    DeepLinkBuyCtn,
    DeepLinkBuyLoading,
    DeepLinkBuySuccessTitle,
    DeepLinkBuySummary,
    DeepLinkBuySummaryLabel,
    DeepLinkBuySummaryRow,
    DeepLinkBuySummaryValue,
    DeepLinkBuyTitle,
    DeepLinkBuyTokenMeta,
} from './styled';

export interface DeepLinkBuyProps {
    tokenId: string;
    /**
     * Canonical decimal quantity from the BUY deep link, or null when the
     * link did not specify one (amount is then editable).
     */
    quantity: null | string;
    userLocale: string;
    /**
     * Clear Token's deep-link confirm state when dismissing to the clean
     * token page (same tokenId would not otherwise reset showDeepLinkBuy).
     */
    onDismiss: () => void;
}

const DeepLinkBuy: React.FC<DeepLinkBuyProps> = ({
    tokenId,
    quantity,
    userLocale,
    onDismiss,
}) => {
    const navigate = useNavigate();
    const ContextValue = useContext(WalletContext);

    // All hooks must run unconditionally (context may load after first render).
    const [offers, setOffers] = useState<null | PartialOffer[]>(null);
    const [agoraQueryError, setAgoraQueryError] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState<null | PartialOffer>(
        null,
    );
    const [takeTokenDecimalizedQty, setTakeTokenDecimalizedQty] =
        useState<string>('');
    const [qtyLocked, setQtyLocked] = useState(false);
    const [loadError, setLoadError] = useState<null | string>(null);
    const [takeTokenDecimalizedQtyError, setTakeTokenDecimalizedQtyError] =
        useState<false | string>(false);
    const [preparedTokenSatoshis, setPreparedTokenSatoshis] = useState<
        null | bigint
    >(null);
    const [askedSats, setAskedSats] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successTxid, setSuccessTxid] = useState<null | string>(null);
    const [successMessage, setSuccessMessage] = useState('');

    const [searchParams] = useSearchParams();
    const returnToBrowser = searchParams.get('returnToBrowser') === '1';

    /**
     * Strip the deep-link confirm UI and land on /token/<tokenId> with no
     * action/quantity query — used when the tab cannot be closed (typed URL)
     * or on native without returnToBrowser.
     */
    const dismissToTokenPage = useCallback(() => {
        setShowSuccessModal(false);
        onDismiss();
        navigate(`/token/${tokenId}`, { replace: true });
    }, [navigate, onDismiss, tokenId]);

    /**
     * Reject / success dismiss:
     * 1. Native + returnToBrowser → exitApp (back to the linking webapp)
     * 2. Native without returnToBrowser → clean token page
     * 3. Web → window.close() (extension popup / script-opened tab)
     */
    const closeOrNavigate = useCallback(() => {
        setShowSuccessModal(false);
        if (Capacitor.isNativePlatform()) {
            if (returnToBrowser) {
                CapacitorApp.exitApp();
                return;
            }
            dismissToTokenPage();
            return;
        }
        window.close();
    }, [dismissToTokenPage, returnToBrowser]);

    // Auto-close success modal after the progress animation, then return
    useEffect(() => {
        if (!showSuccessModal) {
            return;
        }
        const timer = setTimeout(() => {
            closeOrNavigate();
        }, SUCCESS_MODAL_DURATION_MS);
        return () => clearTimeout(timer);
    }, [showSuccessModal, closeOrNavigate]);

    const walletReady =
        isWalletContextLoaded(ContextValue) &&
        ContextValue.ecashWallet !== null;
    const fiatPrice = walletReady ? ContextValue.fiatPrice : null;
    const agora = walletReady ? ContextValue.agora : null;
    const settings = walletReady ? ContextValue.cashtabState.settings : null;
    const cashtabCache = walletReady
        ? ContextValue.cashtabState.cashtabCache
        : null;
    const ecashWallet = walletReady ? ContextValue.ecashWallet : null;

    const balanceSats =
        ecashWallet !== null ? Number(ecashWallet.balanceSats) : 0;
    const walletPkHex = ecashWallet !== null ? toHex(ecashWallet.pk) : '';
    const cachedTokenInfo = cashtabCache?.tokens.get(tokenId);
    const tokenName = cachedTokenInfo?.genesisInfo.tokenName ?? 'Token';
    const tokenTicker = cachedTokenInfo?.genesisInfo.tokenTicker ?? '';
    const decimals = cachedTokenInfo?.genesisInfo.decimals as
        | SlpDecimals
        | undefined;

    // One-shot load for this deep link: pick the offer once when the wallet
    // and token decimals are ready. Do not re-query on balance changes — the
    // confirm screen is accept/reject, not a live order book.
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (
                agora === null ||
                ecashWallet === null ||
                walletPkHex === '' ||
                typeof decimals === 'undefined'
            ) {
                return;
            }
            // Snapshot balance at load time for affordability / selection.
            const balanceSatsAtLoad = Number(ecashWallet.balanceSats);
            setAgoraQueryError(false);
            setLoadError(null);
            try {
                const activeOffers = await agora.activeOffersByTokenId(tokenId);
                if (cancelled) {
                    return;
                }
                const prepared = prepareBuyableOffers(
                    activeOffers,
                    tokenId,
                    balanceSatsAtLoad,
                    walletPkHex,
                );
                setOffers(prepared);

                if (prepared.length === 0) {
                    setSelectedOffer(null);
                    setLoadError('No active offers for this token');
                    return;
                }

                let quantityAtoms: null | bigint = null;
                if (quantity !== null) {
                    try {
                        quantityAtoms = BigInt(
                            undecimalizeTokenAmount(
                                quantity,
                                decimals as SlpDecimals,
                            ),
                        );
                    } catch {
                        // Invalid quantity is ignored per the deeplink spec
                        quantityAtoms = null;
                    }
                }

                if (quantityAtoms !== null) {
                    const { index, sizeFillableExists } =
                        findFillableOfferIndex(
                            prepared,
                            quantityAtoms,
                            balanceSatsAtLoad,
                            walletPkHex,
                        );
                    if (index === -1) {
                        setSelectedOffer(null);
                        setLoadError(
                            sizeFillableExists
                                ? 'Insufficient balance for the requested quantity'
                                : 'No single offer can fill the requested quantity',
                        );
                        return;
                    }
                    const offer = prepared[index];
                    const preparedAtoms =
                        offer.variant.params.prepareAcceptedAtoms(
                            quantityAtoms,
                        );
                    setSelectedOffer(offer);
                    setQtyLocked(true);
                    setTakeTokenDecimalizedQty(
                        formatAmountFromWire(
                            decimalizeTokenAmount(
                                preparedAtoms.toString(),
                                decimals as SlpDecimals,
                            ),
                            userLocale,
                        ),
                    );
                    return;
                }

                // No quantity: cheapest affordable non-maker offer, amount editable
                const editableIndex = prepared.findIndex(
                    offer =>
                        !offer.isUnacceptable &&
                        !offer.isUnaffordable &&
                        walletPkHex !== toHex(offer.variant.params.makerPk),
                );
                if (editableIndex === -1) {
                    setSelectedOffer(null);
                    setLoadError('No affordable offers for this token');
                    return;
                }
                const offer = prepared[editableIndex];
                setSelectedOffer(offer);
                setQtyLocked(false);
                setTakeTokenDecimalizedQty(
                    formatAmountFromWire(
                        decimalizeTokenAmount(
                            offer.variant.params.minAcceptedAtoms().toString(),
                            decimals as SlpDecimals,
                        ),
                        userLocale,
                    ),
                );
            } catch (err) {
                console.error(
                    `Error loading deep-link buy for ${tokenId}`,
                    err,
                );
                if (!cancelled) {
                    setAgoraQueryError(true);
                    setOffers([]);
                }
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [
        agora,
        ecashWallet,
        tokenId,
        quantity,
        decimals,
        walletPkHex,
        userLocale,
    ]);

    // Price and validate the accepted amount against the selected offer
    useEffect(() => {
        if (
            selectedOffer === null ||
            typeof decimals === 'undefined' ||
            takeTokenDecimalizedQty === ''
        ) {
            setPreparedTokenSatoshis(null);
            return;
        }

        const min = decimalizeTokenAmount(
            selectedOffer.variant.params.minAcceptedAtoms().toString(),
            decimals as SlpDecimals,
        );
        const max = decimalizeTokenAmount(
            selectedOffer.token.atoms.toString(),
            decimals as SlpDecimals,
        );
        const qtyError = getAgoraPartialAcceptTokenQtyError(
            takeTokenDecimalizedQty,
            min,
            max,
            decimals as SlpDecimals,
            userLocale,
        );
        setTakeTokenDecimalizedQtyError(qtyError);
        if (qtyError !== false) {
            setPreparedTokenSatoshis(null);
            return;
        }

        const tokenSatoshis = toBigInt(
            undecimalizeTokenAmount(
                normalizeDecimalInput(takeTokenDecimalizedQty, userLocale),
                decimals as SlpDecimals,
            ),
        );
        const preparedAtoms =
            selectedOffer.variant.params.prepareAcceptedAtoms(tokenSatoshis);
        setPreparedTokenSatoshis(preparedAtoms);
        const priceSats = Number(selectedOffer.askedSats(preparedAtoms));
        setAskedSats(priceSats);
        if (priceSats > balanceSats) {
            setTakeTokenDecimalizedQtyError(
                `Buy price (${toFormattedXec(
                    priceSats,
                    userLocale,
                )} XEC) exceeds available balance (${toFormattedXec(
                    balanceSats,
                    userLocale,
                )} XEC).`,
            );
        }
    }, [
        selectedOffer,
        takeTokenDecimalizedQty,
        decimals,
        userLocale,
        balanceSats,
    ]);

    if (
        !walletReady ||
        agora === null ||
        settings === null ||
        ecashWallet === null
    ) {
        return (
            <DeepLinkBuyLoading>
                <InlineLoader />
            </DeepLinkBuyLoading>
        );
    }

    const handleOk = async () => {
        if (
            selectedOffer === null ||
            preparedTokenSatoshis === null ||
            typeof decimals === 'undefined'
        ) {
            return;
        }
        setIsSending(true);
        try {
            if (
                !(await confirmBiometricBroadcast(
                    settings,
                    'Authorize Agora trade',
                ))
            ) {
                setIsSending(false);
                return;
            }
            const broadcastResult = await selectedOffer.take({
                wallet: ecashWallet,
                covenantSk: DUMMY_KEYPAIR.sk,
                covenantPk: DUMMY_KEYPAIR.pk,
                acceptedAtoms: preparedTokenSatoshis,
                feePerKb: BigInt(settings.satsPerKb),
            });
            if (!broadcastResult.success) {
                throw new Error(
                    `Accept transaction failed: ${broadcastResult.errors?.join(
                        ', ',
                    )}`,
                );
            }
            const txid = broadcastResult.broadcasted[0];
            const qtyFormatted = decimalizedTokenQtyToLocaleFormat(
                decimalizeTokenAmount(
                    preparedTokenSatoshis.toString(),
                    decimals as SlpDecimals,
                ),
                userLocale,
            );
            const tokenLabel = tokenTicker !== '' ? tokenTicker : tokenName;
            setSuccessMessage(
                `You bought ${qtyFormatted} ${tokenLabel} for ${toFormattedXec(
                    askedSats,
                    userLocale,
                )} XEC`,
            );
            setSuccessTxid(txid);
            setShowSuccessModal(true);
        } catch (err) {
            console.error('Error accepting deep-link buy', err);
            toast.error(`${err}`);
        } finally {
            setIsSending(false);
        }
    };

    const canConfirm =
        selectedOffer !== null &&
        preparedTokenSatoshis !== null &&
        takeTokenDecimalizedQtyError === false &&
        !isSending;

    const decimalizedTokenQtyMin =
        selectedOffer !== null && typeof decimals !== 'undefined'
            ? decimalizeTokenAmount(
                  selectedOffer.variant.params.minAcceptedAtoms().toString(),
                  decimals as SlpDecimals,
              )
            : null;
    const decimalizedTokenQtyMax =
        selectedOffer !== null && typeof decimals !== 'undefined'
            ? decimalizeTokenAmount(
                  selectedOffer.token.atoms.toString(),
                  decimals as SlpDecimals,
              )
            : null;

    return (
        <>
            {showSuccessModal && successTxid !== null && (
                <SuccessModalOverlay onClick={closeOrNavigate}>
                    <SuccessModalContent onClick={e => e.stopPropagation()}>
                        <SuccessIcon>
                            <div />
                            <img src={Burst} alt="Success" />
                        </SuccessIcon>
                        <DeepLinkBuySuccessTitle>
                            {successMessage}
                        </DeepLinkBuySuccessTitle>
                        <TransactionIdLink
                            href={`${explorer.blockExplorerUrl}/tx/${successTxid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                        >
                            View Transaction
                        </TransactionIdLink>
                        <SuccessButton onClick={closeOrNavigate}>
                            Close
                        </SuccessButton>
                    </SuccessModalContent>
                </SuccessModalOverlay>
            )}
            <DeepLinkBuyCtn>
                <DeepLinkBuyTitle>Confirm Buy</DeepLinkBuyTitle>
                <TokenIcon size={128} tokenId={tokenId} />
                <DeepLinkBuyTokenMeta>
                    <strong>{tokenName}</strong>
                    {tokenTicker !== '' && <span>{tokenTicker}</span>}
                </DeepLinkBuyTokenMeta>

                {agoraQueryError && (
                    <Alert>
                        Error querying agora for active offers. Try again later.
                    </Alert>
                )}

                {offers === null && !agoraQueryError && (
                    <DeepLinkBuyLoading>
                        <InlineLoader />
                    </DeepLinkBuyLoading>
                )}

                {loadError !== null && <Info>{loadError}</Info>}

                {selectedOffer !== null &&
                    typeof decimals !== 'undefined' &&
                    loadError === null && (
                        <>
                            {!qtyLocked &&
                                decimalizedTokenQtyMin !== null &&
                                decimalizedTokenQtyMax !== null && (
                                    <DeepLinkBuyAmountCtn>
                                        <Slider
                                            name={`Deep link buy qty ${tokenId}`}
                                            value={takeTokenDecimalizedQty}
                                            error={takeTokenDecimalizedQtyError}
                                            handleSlide={e =>
                                                setTakeTokenDecimalizedQty(
                                                    e.target.value,
                                                )
                                            }
                                            min={decimalizedTokenQtyMin}
                                            max={decimalizedTokenQtyMax}
                                            step={parseFloat(`1e-${decimals}`)}
                                            allowTypedInput
                                            userLocale={userLocale}
                                            maxDecimals={decimals}
                                        />
                                    </DeepLinkBuyAmountCtn>
                                )}
                            <DeepLinkBuySummary>
                                <DeepLinkBuySummaryRow>
                                    <DeepLinkBuySummaryLabel>
                                        Buying
                                    </DeepLinkBuySummaryLabel>
                                    <DeepLinkBuySummaryValue>
                                        {preparedTokenSatoshis !== null
                                            ? `${decimalizedTokenQtyToLocaleFormat(
                                                  decimalizeTokenAmount(
                                                      preparedTokenSatoshis.toString(),
                                                      decimals as SlpDecimals,
                                                  ),
                                                  userLocale,
                                              )} ${
                                                  tokenTicker !== ''
                                                      ? tokenTicker
                                                      : tokenName
                                              }`
                                            : '—'}
                                    </DeepLinkBuySummaryValue>
                                </DeepLinkBuySummaryRow>
                                <DeepLinkBuySummaryRow>
                                    <DeepLinkBuySummaryLabel>
                                        For
                                    </DeepLinkBuySummaryLabel>
                                    <DeepLinkBuySummaryValue>
                                        {preparedTokenSatoshis !== null
                                            ? `${toFormattedXec(
                                                  askedSats,
                                                  userLocale,
                                              )} XEC${
                                                  fiatPrice !== null
                                                      ? ` (${getFormattedFiatPrice(
                                                            settings.fiatCurrency,
                                                            userLocale,
                                                            toXec(askedSats),
                                                            fiatPrice,
                                                        )})`
                                                      : ''
                                              }`
                                            : '—'}
                                    </DeepLinkBuySummaryValue>
                                </DeepLinkBuySummaryRow>
                            </DeepLinkBuySummary>
                        </>
                    )}

                {!showSuccessModal && (
                    <DeepLinkBuyActions>
                        <PrimaryButton
                            disabled={!canConfirm}
                            onClick={handleOk}
                        >
                            {isSending ? <InlineLoader /> : 'OK'}
                        </PrimaryButton>
                        <SecondaryButton
                            disabled={isSending}
                            onClick={closeOrNavigate}
                        >
                            Reject
                        </SecondaryButton>
                    </DeepLinkBuyActions>
                )}
            </DeepLinkBuyCtn>
        </>
    );
};

export default DeepLinkBuy;
