// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { toast, Id } from 'react-toastify';
import { ChronikClient } from 'chronik-client';
import {
    clearPendingRedeem,
    createPendingRedeem,
    resolvePendingRedeem,
    waitForAgoraOfferRedeemed,
} from 'components/Etokens/pendingRedeems';

const spin = keyframes`
    to {
        transform: rotate(360deg);
    }
`;

const drawCheck = keyframes`
    to {
        stroke-dashoffset: 0;
    }
`;

const RedeemToastRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    color: ${props => props.theme.primaryText};
`;

const StatusIcon = styled.div<{ complete: boolean }>`
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    svg {
        display: block;
        width: 100%;
        height: 100%;
    }
    .ring {
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        ${props =>
            props.complete
                ? css`
                      stroke: ${props.theme.genesisGreen};
                      stroke-dasharray: 63;
                      stroke-dashoffset: 0;
                      transition: stroke 0.2s ease;
                  `
                : css`
                      stroke: ${props.theme.accent};
                      stroke-dasharray: 16 48;
                      transform-origin: 12px 12px;
                      animation: ${spin} 0.75s linear infinite;
                  `}
    }
    .check {
        fill: none;
        stroke: ${props => props.theme.genesisGreen};
        stroke-width: 2.2;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-dasharray: 18;
        stroke-dashoffset: 18;
        opacity: ${props => (props.complete ? 1 : 0)};
        ${props =>
            props.complete &&
            css`
                animation: ${drawCheck} 0.35s ease 0.08s forwards;
            `}
    }
`;

interface SpinnerToCheckProps {
    complete: boolean;
}

/**
 * Spinner that morphs into a check when the redeem completes.
 */
export const SpinnerToCheck: React.FC<SpinnerToCheckProps> = ({ complete }) => {
    return (
        <StatusIcon
            complete={complete}
            title={complete ? 'Redeemed' : 'Redeeming'}
        >
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle className="ring" cx="12" cy="12" r="10" />
                <path className="check" d="M7 12.5l3.5 3.5L17.5 9" />
            </svg>
        </StatusIcon>
    );
};

interface RedeemProgressToastProps {
    amountLabel: string;
    ticker: string;
    chronik: ChronikClient;
    offerTxid: string;
    toastId: Id;
}

/**
 * Instant-redeem toast: "Redeeming &lt;amount&gt; &lt;ticker&gt;" with a
 * spinner, then "Redeemed" with a check when the hot wallet takes the offer.
 */
export const RedeemProgressToast: React.FC<RedeemProgressToastProps> = ({
    amountLabel,
    ticker,
    chronik,
    offerTxid,
    toastId,
}) => {
    const [isRedeemed, setIsRedeemed] = useState(false);
    const isRedeemedRef = useRef(false);

    useEffect(() => {
        const abort = new AbortController();
        let cancelled = false;

        const markRedeemed = (redeemTxid: string) => {
            if (cancelled || redeemTxid === '') {
                return;
            }
            isRedeemedRef.current = true;
            setIsRedeemed(true);
            toast.update(toastId, { autoClose: 2500 });
        };

        createPendingRedeem(offerTxid)
            .then(markRedeemed)
            .catch(() => {
                // Promise is only resolved, never rejected
            });

        waitForAgoraOfferRedeemed(chronik, offerTxid, {
            signal: abort.signal,
        })
            .then(redeemTxid => {
                if (redeemTxid !== null) {
                    resolvePendingRedeem(offerTxid, redeemTxid);
                }
            })
            .catch(err => {
                console.error(`Error waiting for redeem of ${offerTxid}`, err);
            });

        return () => {
            cancelled = true;
            abort.abort();
            if (!isRedeemedRef.current) {
                clearPendingRedeem(offerTxid);
            }
        };
    }, [chronik, offerTxid, toastId]);

    return (
        <RedeemToastRow aria-live="polite">
            <SpinnerToCheck complete={isRedeemed} />
            <span>
                {isRedeemed ? 'Redeemed' : `Redeeming ${amountLabel} ${ticker}`}
            </span>
        </RedeemToastRow>
    );
};

/**
 * Show the instant-redeem progress toast for a covered XECX or FIRMA redeem.
 */
export const showInstantRedeemToast = ({
    amountLabel,
    ticker,
    chronik,
    offerTxid,
}: {
    amountLabel: string;
    ticker: string;
    chronik: ChronikClient;
    offerTxid: string;
}): void => {
    const toastId = `redeem-${offerTxid}`;
    // Register before mount so a fast websocket sale is not toasted as "Sold"
    createPendingRedeem(offerTxid);
    toast(
        <RedeemProgressToast
            amountLabel={amountLabel}
            ticker={ticker}
            chronik={chronik}
            offerTxid={offerTxid}
            toastId={toastId}
        />,
        {
            toastId,
            autoClose: false,
            closeOnClick: true,
            icon: false,
        },
    );
};
