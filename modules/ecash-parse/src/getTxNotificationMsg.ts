// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { GenesisInfo } from 'chronik-client';
import appConfig from './constants/app';
import { opReturn } from './constants/opreturn';
import { previewAddress } from './address';
import { decimalizeTokenAmount, SlpDecimals, toXec } from './amounts';
import { decimalizedTokenQtyToLocaleFormat } from './formatting';
import { RenderedTokenType } from './tokenProtocol';
import {
    AirdropAction,
    CashtabMsgAction,
    EcashChatAction,
    NftoaAction,
    ParsedTokenTxType,
    ParsedTx,
    PaybuttonAction,
    PaywallAction,
    UnknownAction,
    XecTxType,
} from './types';

export const getTxNotificationMsg = (
    parsedTx: ParsedTx,
    fiatPrice: null | number,
    userLocale: string,
    selectedFiatTicker: string,
    genesisInfo?: GenesisInfo,
): string | undefined => {
    const {
        parsedTokenEntries,
        satoshisSent,
        replyAddress,
        recipients,
        xecTxType,
        appActions,
    } = parsedTx;

    // Prices in notifications
    // We want full precision
    // We want locale formatting
    // We want fiat price if available
    const xecSent = toXec(satoshisSent);
    const fiatSent = fiatPrice !== null ? xecSent * fiatPrice : null;
    const renderedAmount = `${xecSent.toLocaleString(userLocale, {
        maximumFractionDigits: appConfig.cashDecimals,
        minimumFractionDigits: appConfig.cashDecimals,
    })} XEC${
        fiatSent !== null
            ? ` (${`${new Intl.NumberFormat(userLocale, {
                  style: 'currency',
                  currency: selectedFiatTicker,
                  minimumFractionDigits: appConfig.cashDecimals,
                  maximumFractionDigits: appConfig.cashDecimals,
              }).format(fiatSent)} ${selectedFiatTicker}`})`
            : ''
    }`;

    /**
     * For a received tx, the "from" address is at the "replyAddress" key
     * We do not expect this to ever be undefined for a received tx, but include fallback in case
     *
     * For a sending tx, we render the "to" address is as recipients[0]
     * This can be undefined for self-send txs e.g. an agora cancel
     * Currently we do not render notifications that include an address for this type of tx
     * But we include the fallback to ensure never undefined
     *
     * Note we may have more than one to or from address, so these are shorthand
     * assumptions for the purpose of making useful + concise notifications
     */
    const toOrFromAddress =
        xecTxType === XecTxType.Received
            ? replyAddress || 'unknown'
            : recipients[0] || 'self';

    const renderedToOrFromAddress =
        toOrFromAddress === 'self' || toOrFromAddress === 'unknown'
            ? toOrFromAddress
            : previewAddress(toOrFromAddress);

    if (parsedTokenEntries.length === 0) {
        // If this is not a token tx
        if (appActions.length === 0) {
            // If this tx has no app actions
            switch (xecTxType) {
                case XecTxType.Received: {
                    return `Received ${renderedAmount} from ${renderedToOrFromAddress}`;
                }
                case XecTxType.Sent: {
                    return `Sent ${renderedAmount} to ${renderedToOrFromAddress}`;
                }
                case XecTxType.Staking: {
                    return `New staking reward: ${renderedAmount}`;
                }
                case XecTxType.Coinbase: {
                    return `New mining reward: ${renderedAmount}`;
                }
                default: {
                    // Should never happen
                    return `${xecTxType} ${renderedAmount}`;
                }
            }
        } else {
            // Not a token tx
            // Has app actions

            // For notifications, we parse only the first app action
            const notificationParsedAppAction = appActions[0];
            const { lokadId, isValid, action, app } =
                notificationParsedAppAction;
            switch (lokadId) {
                case opReturn.appPrefixesHex.airdrop: {
                    if (isValid) {
                        const { tokenId, msg } = action as AirdropAction;
                        return `${app}: ${xecTxType} ${renderedAmount} ${
                            xecTxType === 'Sent'
                                ? 'to holders of'
                                : `for holding`
                        } ${tokenId.slice(0, 5)}...${tokenId.slice(-5)}${
                            typeof msg !== 'undefined' ? ` | ${msg}` : ''
                        }`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.paybutton: {
                    if (isValid) {
                        const { data } = action as PaybuttonAction;
                        // We do not include nonce in notification
                        return `${app}: ${xecTxType} ${renderedAmount}${
                            data !== '' ? ` | ${data}` : ''
                        }`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.nftoa: {
                    if (isValid) {
                        const { data } = action as NftoaAction;
                        // We do not include nonce in notification
                        return `${app} | ${xecTxType} ${renderedAmount} | ${data}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.xecx: {
                    if (isValid) {
                        return `${app} | ${xecTxType} ${renderedAmount}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.swap: {
                    return `${xecTxType} ${renderedAmount} | ${app}`;
                }
                case opReturn.appPrefixesHex.eCashChat: {
                    if (isValid) {
                        const { msg } = action as EcashChatAction;
                        return `${app} | ${xecTxType} ${renderedAmount} | ${msg}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.paywallPayment: {
                    if (isValid) {
                        const { sharedArticleTxid } = action as PaywallAction;
                        return `${app} | ${xecTxType} ${renderedAmount} | ${sharedArticleTxid.slice(
                            0,
                            5,
                        )}...${sharedArticleTxid.slice(-5)}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.authPrefixHex: {
                    if (isValid) {
                        return `${app} | ${xecTxType} ${renderedAmount}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.eCashChatArticle: {
                    if (isValid) {
                        return `${app} | ${xecTxType} ${renderedAmount}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.cashtab: {
                    if (isValid) {
                        const { msg } = action as CashtabMsgAction;
                        return `${app} | ${xecTxType} ${renderedAmount} | ${msg}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                default: {
                    if (app === 'unknown') {
                        // Then it has a lokadId, just not one we recognize
                        return `${xecTxType} ${renderedAmount} | Unrecognized LOKAD ${lokadId}`;
                    } else {
                        // Other unparsed OP_RETURN
                        const { decoded } = action as UnknownAction;
                        return `${xecTxType} ${renderedAmount} | Unparsed OP_RETURN: ${decoded}`;
                    }
                }
            }
        }
    } else {
        // Parse as token tx
        // We only parse the first tokenEntry for tx notifications
        const parsedTokenEntry = parsedTokenEntries[0];
        const {
            tokenId,
            renderedTokenType,
            renderedTxType,
            tokenSatoshis,
            nftFanInputsCreated,
        } = parsedTokenEntry;

        const renderedTokenQty =
            typeof genesisInfo !== 'undefined'
                ? `${decimalizedTokenQtyToLocaleFormat(
                      decimalizeTokenAmount(
                          String(tokenSatoshis),
                          genesisInfo.decimals as SlpDecimals,
                      ),
                      userLocale,
                  )} `
                : '';
        const renderedTicker =
            typeof genesisInfo !== 'undefined'
                ? `${
                      genesisInfo.tokenTicker !== ''
                          ? genesisInfo.tokenTicker
                          : genesisInfo.tokenName
                  }`
                : `${tokenId.slice(0, 5)}...${tokenId.slice(-5)}`;

        switch (renderedTxType) {
            case ParsedTokenTxType.AgoraOffer: {
                // Agora listing tx notification are handled by UI components that support listing
                return;
            }
            case ParsedTokenTxType.AgoraCancel: {
                // Agora cancel tx notifications are handled by UI components that support cancels
                return;
            }
            case ParsedTokenTxType.AgoraBuy: {
                // Agora purchase tx notifications are handled by UI components that support buys
                return;
            }
            case ParsedTokenTxType.AgoraSale: {
                // Sales are incoming txs, the user is not creating this from a UI component
                // Parse here
                return `Sold ${renderedTokenQty}${renderedTicker} for ${renderedAmount}`;
            }
            case ParsedTokenTxType.BlitzPlay: {
                return `Blitz play ${renderedTokenQty}${renderedTicker}`;
            }
            case ParsedTokenTxType.FanOut: {
                return `Created ${nftFanInputsCreated} NFT mint inputs for ${renderedTicker}`;
            }
            case 'SEND': {
                return `${
                    xecTxType === XecTxType.Received ? 'Received' : 'Sent'
                } ${renderedTokenQty}${renderedTicker}`;
            }
            case 'MINT': {
                return `🔨 Minted ${renderedTokenQty}${renderedTicker}`;
            }
            case 'BURN': {
                return `🔥 Burned ${renderedTokenQty}${renderedTicker}`;
            }
            case 'GENESIS': {
                if (renderedTokenType === RenderedTokenType.NFT) {
                    return `NFT | 👨‍🎨 Minted ${renderedTokenQty}${renderedTicker}`;
                }
                return `⚗️ Genesis | Created ${renderedTokenQty}${renderedTicker}`;
            }
            default: {
                // Should never happen
                return `${xecTxType} ${renderedAmount}`;
            }
        }
    }
};
