// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import {
    TxWrapper,
    MainRow,
    TxDescCol,
    TxDesc,
    Timestamp,
    AmountCol,
    AmountTop,
    AmountBottom,
    Expand,
    MainRowLeft,
    IconCtn,
    PanelButton,
    Collapse,
    PanelLink,
    ReplyLink,
    AppAction,
    AppDescLabel,
    AppDescMsg,
    TokenActionHolder,
    TokenAction,
    TokenDesc,
    TokenType,
    TokenName,
    TokenTicker,
    TokenInfoCol,
    UnknownMsgColumn,
    ActionLink,
    IconAndLabel,
    AddressLink,
    ExpandButtonPanel,
    TxDescSendRcvMsg,
    Ellipsis,
    TimestampSeperator,
    MessageLabel,
    AirdropHeader,
    AirdropIconCtn,
    TxInfoModalParagraph,
} from 'components/Home/Tx/styled';
import {
    SendIcon,
    ReceiveIcon,
    MinedIcon,
    AliasIconTx,
    GenesisIcon,
    AirdropIcon,
    EncryptedMsgIcon,
    TokenBurnIcon,
    SwapIcon,
    PayButtonIcon,
    ChatIcon,
    MintIcon,
    UnknownIcon,
    CashtabMsgIcon,
    CopyPasteIcon,
    ThemedPdfSolid,
    ThemedLinkSolid,
    AddContactIcon,
    ReplyIcon,
    SelfSendIcon,
    FanOutIcon,
    MintNftIcon,
    PaywallPaymentIcon,
    AgoraOfferIcon,
    AgoraBuyIcon,
    AgoraSaleIcon,
    AgoraCancelIcon,
    TokenSendIcon,
    XecxIcon,
    FirmaIcon,
    SolIcon,
    TetherIcon,
    QuestionIcon,
    NFToaIcon,
    DiceIcon,
    PayoutWinIcon,
    BlitsPayoutIcon,
    EdjIcon,
} from 'components/Common/CustomIcons';
import { supportedFiatCurrencies } from 'config/CashtabSettings';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import { explorer } from 'config/explorer';
import { ParsedTokenTxType, XecxAction, SolAddrAction } from 'chronik';
import { toFormattedXec, decimalizedTokenQtyToLocaleFormat } from 'formatting';
import { toXec, decimalizeTokenAmount, CashtabTx, SlpDecimals } from 'wallet';
import { opReturn } from 'config/opreturn';
import TokenIcon from 'components/Etokens/TokenIcon';
import Modal from 'components/Common/Modal';
import { ModalInput } from 'components/Common/Inputs';
import { toast } from 'react-toastify';
import { getContactNameError } from 'validation';
import AvalancheFinalized from 'components/Common/AvalancheFinalized';
import CashtabState from 'config/CashtabState';
import { previewAddress, previewTokenId, previewSolAddr } from 'helpers';
import { CopyIconButton, IconButton } from 'components/Common/Buttons';
import {
    FIRMA_REDEEM_ADDRESS,
    EDJ_TOKEN_ID,
    CACHET_TOKEN_ID,
    EDJ_COM_GAME_ADDRESSES,
} from 'constants/tokens';
import { Alert } from 'components/Common/Atoms';
import { UpdateCashtabState } from 'wallet/useWallet';

interface TxProps {
    tx: CashtabTx;
    hashes: string[];
    fiatPrice: null | number;
    fiatCurrency: string;
    cashtabState: CashtabState;
    updateCashtabState: UpdateCashtabState;
    userLocale: string;
}
const Tx: React.FC<TxProps> = ({
    tx,
    fiatPrice,
    fiatCurrency,
    cashtabState,
    updateCashtabState,
    userLocale = 'en-US',
}) => {
    const { txid, timeFirstSeen, block, parsed } = tx;
    const {
        satoshisSent,
        xecTxType,
        recipients,
        appActions,
        replyAddress,
        parsedTokenEntries,
    } = parsed;
    const { cashtabCache, contactList } = cashtabState;

    const replyAddressPreview =
        typeof replyAddress !== 'undefined'
            ? previewAddress(replyAddress)
            : undefined;

    const knownSender = contactList.find(
        contact => contact.address === replyAddress,
    );

    let knownRecipient, renderedRecipient, renderedOtherRecipients;
    if (xecTxType === 'Sent' && typeof recipients[0] !== 'undefined') {
        const recipientPreview = previewAddress(recipients[0]);
        knownRecipient = contactList.find(
            contact => contact.address === recipients[0],
        );

        renderedRecipient = `${
            typeof knownRecipient !== 'undefined'
                ? knownRecipient.name
                : recipientPreview
        }`;
        renderedOtherRecipients =
            recipients.length > 1
                ? `and ${recipients.length - 1} other${
                      recipients.length - 1 > 1 ? 's' : ''
                  }`
                : '';
    }

    const renderedAppActions: React.ReactNode[] = [];

    // Add firma yield if applicable
    // NB firma yield is not not identified by OP_RETURN
    // But it is, semantically speaking, an "app action"

    // A firma yield payment is identified as
    // - received firma
    // - sending address was firma yield wallet
    const isFirmaYield =
        !tx.isCoinbase &&
        tx.inputs[0].outputScript ===
            '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac' &&
        typeof parsed.parsedTokenEntries[0] !== 'undefined' &&
        parsed.parsedTokenEntries[0].tokenId ===
            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0';

    const isFirmaRedeem =
        recipients.length === 1 &&
        recipients[0] === FIRMA_REDEEM_ADDRESS &&
        typeof parsed.parsedTokenEntries[0] !== 'undefined' &&
        parsed.parsedTokenEntries[0].tokenId ===
            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0' &&
        appActions.length === 1 &&
        appActions[0].isValid &&
        appActions[0].lokadId === opReturn.appPrefixesHex.solAddr;

    const isEverydayJackpotTx =
        xecTxType === 'Sent' &&
        typeof parsed.parsedTokenEntries[0] !== 'undefined' &&
        recipients.some(addr => EDJ_COM_GAME_ADDRESSES.includes(addr));
    const everydayJackpotTokenId = isEverydayJackpotTx
        ? parsed.parsedTokenEntries[0].tokenId
        : null;
    const isCachetFreePlay =
        isEverydayJackpotTx && everydayJackpotTokenId === CACHET_TOKEN_ID;
    const isEdjBet =
        isEverydayJackpotTx && everydayJackpotTokenId === EDJ_TOKEN_ID;

    const isEdjPayout =
        xecTxType === 'Received' &&
        typeof replyAddress !== 'undefined' &&
        EDJ_COM_GAME_ADDRESSES.includes(replyAddress) &&
        typeof parsed.parsedTokenEntries[0] !== 'undefined' &&
        parsed.parsedTokenEntries[0].tokenId === EDJ_TOKEN_ID;

    if (isFirmaYield) {
        renderedAppActions.push(
            <IconAndLabel>
                <FirmaIcon />
                <AppDescLabel noWordBreak>Firma yield payment</AppDescLabel>
            </IconAndLabel>,
        );
    }
    if (isFirmaRedeem) {
        renderedAppActions.push(
            <IconAndLabel>
                <FirmaIcon />
                <TetherIcon />
                <AppDescLabel noWordBreak>Firma USDT conversion</AppDescLabel>
            </IconAndLabel>,
        );
    }
    if (isCachetFreePlay) {
        renderedAppActions.push(
            <IconAndLabel>
                <EdjIcon />
                <AppDescLabel noWordBreak>
                    everydayjackpot.com - free play
                </AppDescLabel>
            </IconAndLabel>,
        );
    }
    if (isEdjBet) {
        renderedAppActions.push(
            <IconAndLabel>
                <EdjIcon />
                <AppDescLabel noWordBreak>
                    everydayjackpot.com - EDJ Play
                </AppDescLabel>
            </IconAndLabel>,
        );
    }
    if (isEdjPayout) {
        renderedAppActions.push(
            <IconAndLabel>
                <EdjIcon />
                <AppDescLabel noWordBreak>
                    everydayjackpot.com - EDJ payout
                </AppDescLabel>
            </IconAndLabel>,
        );
    }

    for (const appAction of appActions) {
        const { lokadId, app, isValid, action } = appAction;
        // Check app name first for DICE/ROLL (they may be embedded in ALP transactions)
        if (app === 'DICE Bet') {
            if (!isValid) {
                renderedAppActions.push(
                    <IconAndLabel>
                        <UnknownIcon />
                        <AppDescLabel>Invalid Blitzchips Bet</AppDescLabel>
                    </IconAndLabel>,
                );
            } else {
                if (
                    typeof action !== 'undefined' &&
                    'minValue' in action &&
                    'maxValue' in action
                ) {
                    const { minValue, maxValue } = action as {
                        minValue: number;
                        maxValue: number;
                    };
                    // Calculate odds: (maxValue - minValue + 1) / 100_000_000
                    const totalOutcomes = maxValue - minValue + 1;
                    const odds = totalOutcomes / 100_000_000;
                    const multiplier = 1 / odds;
                    // Format multiplier: use toLocaleString and only show decimals if < 100
                    const formattedMultiplier =
                        multiplier >= 100
                            ? Math.round(multiplier).toLocaleString(userLocale)
                            : multiplier.toFixed(2);

                    renderedAppActions.push(
                        <>
                            <IconAndLabel>
                                <DiceIcon />
                                <AppDescLabel>Blitzchips Bet</AppDescLabel>
                            </IconAndLabel>
                            <AppDescMsg>
                                Range: [{minValue.toLocaleString()},{' '}
                                {maxValue.toLocaleString()}]
                            </AppDescMsg>
                            <AppDescMsg>
                                Odds: 1:{formattedMultiplier}x
                            </AppDescMsg>
                        </>,
                    );
                }
            }
            continue;
        }
        if (app === 'ROLL Payout') {
            if (!isValid) {
                renderedAppActions.push(
                    <IconAndLabel>
                        <UnknownIcon />
                        <AppDescLabel>Invalid Blitzchips Payout</AppDescLabel>
                    </IconAndLabel>,
                );
            } else {
                if (
                    typeof action !== 'undefined' &&
                    'betTxid' in action &&
                    'roll' in action &&
                    'result' in action
                ) {
                    const { betTxid, roll, result } = action as {
                        betTxid: string;
                        roll: number;
                        result: string;
                    };
                    const resultLabel =
                        result === 'W'
                            ? 'Win'
                            : result === 'L'
                              ? 'Loss'
                              : 'Invalid';
                    const resultEmoji =
                        result === 'W' ? '🏆' : result === 'L' ? '⚡️' : '🚨';
                    // Use PayoutWinIcon for wins, BlitsPayoutIcon for losses
                    const PayoutIcon =
                        result === 'W' ? PayoutWinIcon : BlitsPayoutIcon;

                    renderedAppActions.push(
                        <>
                            <IconAndLabel>
                                <PayoutIcon />
                                <AppDescLabel>Blitzchips Payout</AppDescLabel>
                            </IconAndLabel>
                            <AppDescMsg>
                                {resultEmoji} {resultLabel} | Roll:{' '}
                                {roll.toLocaleString()}
                            </AppDescMsg>
                            <AppDescMsg>
                                Bet:{' '}
                                <ActionLink
                                    href={`${explorer.blockExplorerUrl}/tx/${betTxid}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {betTxid.slice(0, 3)}...{betTxid.slice(-3)}
                                </ActionLink>
                            </AppDescMsg>
                        </>,
                    );
                }
            }
            continue;
        }
        if (app === 'EDJ.com Payout') {
            if (!isValid) {
                renderedAppActions.push(
                    <IconAndLabel>
                        <UnknownIcon />
                        <AppDescLabel>Invalid EDJ.com Payout</AppDescLabel>
                    </IconAndLabel>,
                );
            } else {
                if (
                    typeof action !== 'undefined' &&
                    'numTxs' in action &&
                    'potAtoms' in action &&
                    'winnerOddsBps' in action &&
                    'winnerTxid' in action
                ) {
                    const { numTxs, potAtoms, winnerOddsBps, winnerTxid } =
                        action as {
                            numTxs: number;
                            potAtoms: bigint;
                            winnerOddsBps: number;
                            winnerTxid: string;
                        };
                    const oddsPct = (winnerOddsBps / 100).toFixed(2);
                    const potFirma = (Number(potAtoms) / 10000).toLocaleString(
                        userLocale,
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        },
                    );

                    renderedAppActions.push(
                        <>
                            <IconAndLabel>
                                <PayoutWinIcon />
                                <AppDescLabel>
                                    EverydayJackpot Winner
                                </AppDescLabel>
                            </IconAndLabel>
                            <AppDescMsg>
                                🏆 {numTxs} entries | ${potFirma} pot |{' '}
                                {oddsPct}% odds
                            </AppDescMsg>
                            <AppDescMsg>
                                Winning bet:{' '}
                                <ActionLink
                                    href={`${explorer.blockExplorerUrl}/tx/${winnerTxid}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {winnerTxid.slice(0, 3)}...
                                    {winnerTxid.slice(-3)}
                                </ActionLink>
                            </AppDescMsg>
                        </>,
                    );
                }
            }
            continue;
        }
        switch (lokadId) {
            case opReturn.appPrefixesHex.aliasRegistration: {
                if (!isValid) {
                    renderedAppActions.push(
                        <IconAndLabel>
                            <AliasIconTx />
                            <AppDescLabel>
                                Invalid alias registration
                            </AppDescLabel>
                        </IconAndLabel>,
                    );
                } else {
                    if (typeof action !== 'undefined' && 'alias' in action) {
                        // Type guard, we know that all valid aliases will have this action
                        // from the parseTx function
                        const { alias, address } = action;
                        const aliasAddrPreview = previewAddress(address);
                        renderedAppActions.push(
                            <>
                                <IconAndLabel>
                                    <AliasIconTx />
                                    <AppDescLabel>
                                        Alias Registration
                                    </AppDescLabel>
                                </IconAndLabel>
                                <AppDescMsg>
                                    {`${alias} to ${aliasAddrPreview}`}
                                </AppDescMsg>
                            </>,
                        );
                    }
                }
                break;
            }
            case opReturn.appPrefixesHex.airdrop: {
                if (!isValid) {
                    renderedAppActions.push(
                        <IconAndLabel>
                            <AirdropIcon />
                            <AppDescLabel>
                                Off-spec airdrop: tokenId unavailable
                            </AppDescLabel>
                        </IconAndLabel>,
                    );
                } else {
                    if (typeof action !== 'undefined' && 'tokenId' in action) {
                        const { tokenId, msg } = action;
                        // Add token info if we have it in cache
                        const airdroppedTokenInfo =
                            cashtabCache.tokens.get(tokenId);
                        if (typeof airdroppedTokenInfo !== 'undefined') {
                            const { genesisInfo } = airdroppedTokenInfo;
                            const { tokenName, tokenTicker } = genesisInfo;
                            renderedAppActions.push(
                                <>
                                    <AirdropHeader
                                        message={typeof msg !== 'undefined'}
                                    >
                                        <IconAndLabel>
                                            <AirdropIcon />
                                            <AppDescLabel>
                                                Airdrop (XEC)
                                            </AppDescLabel>
                                        </IconAndLabel>
                                        <AirdropIconCtn>
                                            <TokenIcon
                                                size={32}
                                                tokenId={tokenId}
                                            />
                                            <TokenInfoCol>
                                                <TokenName
                                                    to={`/token/${tokenId}`}
                                                >
                                                    {tokenName}
                                                </TokenName>
                                                <TokenTicker>
                                                    ({tokenTicker})
                                                </TokenTicker>
                                            </TokenInfoCol>
                                        </AirdropIconCtn>
                                    </AirdropHeader>
                                    {typeof msg !== 'undefined' && (
                                        <>
                                            <MessageLabel>
                                                <CashtabMsgIcon />
                                                Airdrop Msg{' '}
                                                <IconButton
                                                    name={`Airdrop Msg Info`}
                                                    icon={<QuestionIcon />}
                                                    onClick={() =>
                                                        setShowAirdropInfo(true)
                                                    }
                                                />
                                            </MessageLabel>
                                            <AppDescMsg>{msg}</AppDescMsg>
                                        </>
                                    )}
                                </>,
                            );
                            break;
                        }
                        // If we do not have token info
                        renderedAppActions.push(
                            <>
                                <AirdropHeader
                                    message={typeof msg !== 'undefined'}
                                >
                                    <IconAndLabel>
                                        <AirdropIcon />
                                        <AppDescLabel>
                                            Airdrop to holders of{' '}
                                            <ActionLink
                                                href={`${explorer.blockExplorerUrl}/tx/${tokenId}`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {previewTokenId(tokenId)}
                                            </ActionLink>
                                        </AppDescLabel>
                                    </IconAndLabel>
                                    <TokenIcon size={32} tokenId={tokenId} />
                                </AirdropHeader>
                                {typeof msg !== 'undefined' && (
                                    <>
                                        <MessageLabel>
                                            <CashtabMsgIcon />
                                            Airdrop Msg
                                        </MessageLabel>
                                        <AppDescMsg>{msg}</AppDescMsg>
                                    </>
                                )}
                            </>,
                        );
                    }
                }
                break;
            }
            case opReturn.appPrefixesHex.cashtabEncrypted: {
                // Deprecated, just print the app
                renderedAppActions.push(
                    <IconAndLabel>
                        <EncryptedMsgIcon />
                        <AppDescLabel>{app}</AppDescLabel>
                    </IconAndLabel>,
                );
                break;
            }
            case opReturn.appPrefixesHex.swap: {
                // Limited parse support for SWaP txs, which are not expected in Cashtab
                // Just print the type
                renderedAppActions.push(
                    <IconAndLabel>
                        <SwapIcon />
                        <AppDescLabel>{app}</AppDescLabel>
                    </IconAndLabel>,
                );
                break;
            }
            case opReturn.appPrefixesHex.paybutton: {
                if (!isValid) {
                    renderedAppActions.push(
                        <IconAndLabel>
                            <PayButtonIcon />
                            <AppDescLabel>Invalid {app}</AppDescLabel>
                        </IconAndLabel>,
                    );
                } else {
                    if (typeof action !== 'undefined' && 'data' in action) {
                        const { data, nonce } = action;
                        // Valid PayButtonTx
                        renderedAppActions.push(
                            <>
                                <IconAndLabel>
                                    <PayButtonIcon />
                                </IconAndLabel>
                                {data !== '' && <AppDescMsg>{data}</AppDescMsg>}
                                {nonce !== '' && (
                                    <AppDescMsg>{nonce}</AppDescMsg>
                                )}
                            </>,
                        );
                    }
                }
                break;
            }
            case opReturn.appPrefixesHex.nftoa: {
                if (!isValid) {
                    renderedAppActions.push(
                        <IconAndLabel>
                            <NFToaIcon />
                            <AppDescLabel>Invalid {app}</AppDescLabel>
                        </IconAndLabel>,
                    );
                } else {
                    if (typeof action !== 'undefined' && 'data' in action) {
                        const { data, nonce } = action;
                        // Valid NFToa Tx
                        renderedAppActions.push(
                            <>
                                <IconAndLabel>
                                    <NFToaIcon />
                                </IconAndLabel>
                                {data !== '' && <AppDescMsg>{data}</AppDescMsg>}
                                {nonce !== '' && (
                                    <AppDescMsg>{nonce}</AppDescMsg>
                                )}
                            </>,
                        );
                    }
                }
                break;
            }
            case opReturn.appPrefixesHex.eCashChat: {
                if (!isValid) {
                    renderedAppActions.push(
                        <IconAndLabel>
                            <ChatIcon />
                            <AppDescLabel>Invalid {app}</AppDescLabel>
                        </IconAndLabel>,
                    );
                } else {
                    if (typeof action !== 'undefined' && 'msg' in action) {
                        const { msg } = action;
                        renderedAppActions.push(
                            <>
                                <IconAndLabel>
                                    <ChatIcon />
                                    <AppDescLabel>{app}</AppDescLabel>
                                </IconAndLabel>
                                <AppDescMsg>{msg}</AppDescMsg>
                            </>,
                        );
                    }
                }
                break;
            }
            case opReturn.appPrefixesHex.paywallPayment: {
                if (!isValid) {
                    renderedAppActions.push(
                        <IconAndLabel>
                            <PaywallPaymentIcon />
                            <AppDescLabel>Invalid {app}</AppDescLabel>
                        </IconAndLabel>,
                    );
                } else {
                    if (
                        typeof action !== 'undefined' &&
                        'sharedArticleTxid' in action
                    ) {
                        const { sharedArticleTxid } = action;
                        renderedAppActions.push(
                            <>
                                <IconAndLabel>
                                    <PaywallPaymentIcon />
                                    <AppDescLabel>{app}</AppDescLabel>
                                </IconAndLabel>
                                <AppDescMsg>
                                    <a
                                        href={`https://www.ecashchat.com/?sharedArticleTxid=${sharedArticleTxid}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Paywall Article
                                    </a>
                                </AppDescMsg>
                            </>,
                        );
                    }
                }
                break;
            }
            case opReturn.appPrefixesHex.authPrefixHex: {
                // If it has the lokad, it's valid
                renderedAppActions.push(
                    <IconAndLabel>
                        <ChatIcon />
                        <AppDescLabel>{app}</AppDescLabel>
                    </IconAndLabel>,
                );
                break;
            }
            case opReturn.appPrefixesHex.eCashChatArticle: {
                if (!isValid) {
                    renderedAppActions.push(
                        <IconAndLabel>
                            <ChatIcon />
                            <AppDescLabel>
                                Invalid eCashChat Article
                            </AppDescLabel>
                        </IconAndLabel>,
                    );
                } else {
                    if (
                        typeof action !== 'undefined' &&
                        'replyArticleTxid' in action
                    ) {
                        const { replyArticleTxid, msg } = action;
                        renderedAppActions.push(
                            <>
                                <IconAndLabel>
                                    <ChatIcon />
                                    <AppDescLabel>
                                        eCash Chat - Reply to
                                        <a
                                            href={`https://www.ecashchat.com/?sharedArticleTxid=${replyArticleTxid}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            &nbsp;article
                                        </a>
                                    </AppDescLabel>
                                </IconAndLabel>
                                <AppDescMsg>{msg}</AppDescMsg>
                            </>,
                        );
                    } else {
                        renderedAppActions.push(
                            <IconAndLabel>
                                <ChatIcon />
                                <AppDescLabel>
                                    eCash Chat article created
                                </AppDescLabel>
                            </IconAndLabel>,
                        );
                    }
                }
                break;
            }
            case opReturn.appPrefixesHex.cashtab: {
                if (!isValid) {
                    renderedAppActions.push(
                        <IconAndLabel>
                            <CashtabMsgIcon />
                            <AppDescLabel>Invalid Cashtab Msg</AppDescLabel>
                        </IconAndLabel>,
                    );
                } else {
                    if (typeof action !== 'undefined' && 'msg' in action) {
                        const { msg } = action;
                        renderedAppActions.push(
                            <>
                                <MessageLabel>
                                    <CashtabMsgIcon />
                                    Cashtab Msg
                                </MessageLabel>

                                <AppDescMsg>{msg}</AppDescMsg>
                                {xecTxType === 'Received' &&
                                    typeof replyAddress !== 'undefined' && (
                                        <ReplyLink
                                            to="/send"
                                            state={{
                                                replyAddress: replyAddress,
                                            }}
                                        >
                                            <ReplyIcon />
                                        </ReplyLink>
                                    )}
                            </>,
                        );
                    }
                }
                break;
            }
            case opReturn.appPrefixesHex.xecx: {
                if (isValid) {
                    const { minBalanceTokenSatoshisToReceivePaymentThisRound } =
                        action as XecxAction;
                    const minBalanceXec = toXec(
                        minBalanceTokenSatoshisToReceivePaymentThisRound,
                    );
                    renderedAppActions.push(
                        <IconAndLabel>
                            <XecxIcon />
                            <AppDescLabel noWordBreak>
                                XEC staking reward to all XECX holders with
                                balance{' '}
                                {`>= ${minBalanceXec.toLocaleString(
                                    userLocale,
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    },
                                )} XECX`}
                            </AppDescLabel>
                        </IconAndLabel>,
                    );
                } else {
                    // invalid xecx
                    renderedAppActions.push(
                        <IconAndLabel>
                            <XecxIcon />
                            <AppDescLabel>Invalid XECX EMPP</AppDescLabel>
                        </IconAndLabel>,
                    );
                }

                break;
            }
            case opReturn.appPrefixesHex.solAddr: {
                const solAddr = (action as SolAddrAction).solAddr;
                const renderedAddr = isValid
                    ? previewSolAddr(solAddr)
                    : solAddr;
                renderedAppActions.push(
                    <IconAndLabel>
                        <SolIcon />
                        <AppDescMsg>{renderedAddr}</AppDescMsg>
                        {isValid && (
                            <CopyIconButton
                                name="Sol Addr"
                                data={(action as SolAddrAction).solAddr}
                                showToast
                            />
                        )}
                    </IconAndLabel>,
                );
                break;
            }
            case 'unknown': {
                if (typeof action !== 'undefined' && 'decoded' in action) {
                    const { stack, decoded } = action;
                    renderedAppActions.push(
                        <>
                            <IconAndLabel>
                                <UnknownIcon />
                                <AppDescLabel>
                                    Unknown LokadId {lokadId}
                                </AppDescLabel>
                            </IconAndLabel>
                            <UnknownMsgColumn>
                                <AppDescMsg>{stack}</AppDescMsg>
                                <AppDescMsg>{decoded}</AppDescMsg>
                            </UnknownMsgColumn>
                        </>,
                    );
                }
                break;
            }
            default: {
                if (typeof action !== 'undefined' && 'decoded' in action) {
                    const { stack, decoded } = action;
                    renderedAppActions.push(
                        <>
                            <IconAndLabel>
                                <UnknownIcon />
                                <AppDescLabel>Unknown App</AppDescLabel>
                            </IconAndLabel>
                            <UnknownMsgColumn>
                                <AppDescMsg>{stack}</AppDescMsg>
                                <AppDescMsg>{decoded}</AppDescMsg>
                            </UnknownMsgColumn>
                        </>,
                    );
                } else {
                    renderedAppActions.push(
                        <IconAndLabel>
                            <UnknownIcon />
                            <AppDescLabel>Unknown App</AppDescLabel>
                        </IconAndLabel>,
                    );
                }
                break;
            }
        }
    }

    const tokenActions: React.ReactNode[] = [];

    for (const parsedTokenEntry of parsedTokenEntries) {
        // Note that parsedTokenEntries[i] correspondes to tokenEntries[i]
        // Not used for now but could be used for other rendering cases

        const {
            tokenId,
            renderedTokenType,
            renderedTxType,
            tokenSatoshis,
            nftFanInputsCreated,
        } = parsedTokenEntry;

        // Every token entry has a token icon
        const tokenIcon = <TokenIcon size={32} tokenId={tokenId} />;

        // Get action icon based on renderedTxType
        let actionIcon: React.ReactNode;
        switch (renderedTxType) {
            case 'GENESIS': {
                if (renderedTokenType === 'NFT') {
                    actionIcon = <MintNftIcon />;
                } else {
                    actionIcon = <GenesisIcon />;
                }
                break;
            }
            case 'MINT': {
                actionIcon = <MintIcon />;
                break;
            }
            case 'UNKNOWN':
            case 'NONE': {
                // We get the NONE type for NFT mints on the parsedTokenEntry that burns
                // a qty-1 COLLECTION token
                if (renderedTokenType === 'Collection') {
                    actionIcon = <TokenBurnIcon />;
                } else {
                    actionIcon = <UnknownIcon />;
                }
                break;
            }
            case 'SEND': {
                actionIcon = <TokenSendIcon />;
                break;
            }
            case 'BURN': {
                actionIcon = <TokenBurnIcon />;
                break;
            }
            case ParsedTokenTxType.AgoraBuy: {
                actionIcon = <AgoraBuyIcon />;
                break;
            }
            case ParsedTokenTxType.AgoraSale: {
                actionIcon = <AgoraSaleIcon />;
                break;
            }
            case ParsedTokenTxType.AgoraCancel: {
                actionIcon = <AgoraCancelIcon />;
                break;
            }
            case ParsedTokenTxType.AgoraOffer: {
                actionIcon = <AgoraOfferIcon />;
                break;
            }
            case ParsedTokenTxType.FanOut: {
                actionIcon = <FanOutIcon />;
                break;
            }
            default: {
                // We could handle UNKNOWN and NONE types here
                // But keep them split out to show they are possible types
                // We may want them to have distinct rendering in the future
                actionIcon = <UnknownIcon />;
                break;
            }
        }

        // Token name and ticker depends on availability of cache info
        const cachedTokenInfo = cashtabCache.tokens.get(tokenId);
        let tokenTicker: string;
        let tokenName: string;
        let decimals: undefined | number;
        if (typeof cachedTokenInfo === 'undefined') {
            tokenName = previewTokenId(tokenId);
            tokenTicker = '';
            // Leave decimals as undefined, we will not use it if we do not have it
        } else {
            ({ tokenName, tokenTicker, decimals } =
                cachedTokenInfo.genesisInfo);
        }

        const decimalizedAmount =
            typeof decimals === 'number'
                ? decimalizeTokenAmount(tokenSatoshis, decimals as SlpDecimals)
                : '0';
        const formattedAmount =
            typeof decimals === 'number'
                ? decimalizedTokenQtyToLocaleFormat(
                      decimalizedAmount,
                      userLocale,
                  )
                : '0';
        tokenActions.push(
            <TokenAction
                tokenTxType={renderedTxType}
                noWordBreak={tokenName.length < 10 || tokenTicker.length < 10}
            >
                <IconAndLabel>
                    {actionIcon}
                    {tokenIcon}
                    <TokenInfoCol>
                        <TokenType>
                            {renderedTokenType === 'Collection' &&
                            renderedTxType === 'NONE'
                                ? 'BURN'
                                : renderedTxType}
                        </TokenType>
                    </TokenInfoCol>
                </IconAndLabel>
                <TokenInfoCol>
                    <TokenName to={`/token/${tokenId}`}>{tokenName}</TokenName>
                    {tokenTicker !== '' && (
                        <TokenTicker>({tokenTicker})</TokenTicker>
                    )}
                </TokenInfoCol>
                <TokenDesc>
                    {renderedTxType === ParsedTokenTxType.FanOut
                        ? `Created ${nftFanInputsCreated} NFT Mint Input${
                              (nftFanInputsCreated as number) > 1 ? 's' : ''
                          }`
                        : renderedTxType === ParsedTokenTxType.AgoraOffer
                          ? `Listed ${
                                typeof decimals === 'number'
                                    ? formattedAmount
                                    : ''
                            } ${tokenTicker}`
                          : renderedTxType === ParsedTokenTxType.AgoraBuy
                            ? `Bought ${
                                  typeof decimals === 'number'
                                      ? formattedAmount
                                      : ''
                              } ${tokenTicker}`
                            : renderedTxType === ParsedTokenTxType.AgoraSale
                              ? `Sold ${
                                    typeof decimals === 'number'
                                        ? formattedAmount
                                        : ''
                                } ${tokenTicker}`
                              : renderedTxType === ParsedTokenTxType.AgoraCancel
                                ? `Canceled offer ${
                                      typeof decimals === 'number'
                                          ? `of ${formattedAmount}`
                                          : ''
                                  } ${tokenTicker}`
                                : renderedTxType === 'BURN'
                                  ? `Burned ${
                                        typeof decimals === 'number'
                                            ? formattedAmount
                                            : ''
                                    } ${tokenTicker}`
                                  : renderedTxType === 'SEND'
                                    ? `${xecTxType} ${
                                          typeof decimals === 'number'
                                              ? formattedAmount
                                              : ''
                                      } ${tokenTicker}`
                                    : renderedTxType === 'MINT' ||
                                        (renderedTxType === 'GENESIS' &&
                                            renderedTokenType === 'NFT')
                                      ? `Minted ${
                                            typeof decimals === 'number'
                                                ? formattedAmount
                                                : ''
                                        } ${tokenTicker}`
                                      : renderedTxType === 'NONE' &&
                                          renderedTokenType === 'Collection'
                                        ? `Burned 1 ${
                                              typeof decimals === 'number'
                                                  ? formattedAmount
                                                  : ''
                                          } ${tokenTicker}`
                                        : renderedTxType === 'GENESIS'
                                          ? `Created ${
                                                typeof decimals === 'number'
                                                    ? formattedAmount
                                                    : ''
                                            } ${tokenTicker}`
                                          : `${renderedTxType} ${
                                                typeof decimals === 'number'
                                                    ? formattedAmount
                                                    : ''
                                            } ${tokenTicker}`}
                </TokenDesc>
            </TokenAction>,
        );
    }

    const [showPanel, setShowPanel] = useState(false);
    const [showAddNewContactModal, setShowAddNewContactModal] = useState(false);
    const [showAirdropInfo, setShowAirdropInfo] = useState(false);
    interface TxFormData {
        newContactName: string;
    }
    const emptyFormData: TxFormData = {
        newContactName: '',
    };
    interface TxFormDataErrors {
        newContactName: false | string;
    }
    const emptyFormDataErrors: TxFormDataErrors = {
        newContactName: false,
    };
    const [formData, setFormData] = useState<TxFormData>(emptyFormData);
    const [formDataErrors, setFormDataErrors] =
        useState<TxFormDataErrors>(emptyFormDataErrors);

    const addNewContact = async (addressToAdd: string) => {
        // Check to see if the contact exists
        const contactExists = contactList.find(
            contact => contact.address === addressToAdd,
        );

        if (typeof contactExists !== 'undefined') {
            // Contact exists
            // Not expected to ever happen from Tx.js as user should not see option to
            // add an existing contact
            toast.error(`${addressToAdd} already exists in Contacts`);
        } else {
            contactList.push({
                name: formData.newContactName,
                address: addressToAdd,
            });
            // update localforage and state
            await updateCashtabState({ contactList: contactList });
            toast.success(
                `${formData.newContactName} (${addressToAdd}) added to Contact List`,
            );
        }

        // Reset relevant state fields
        setShowAddNewContactModal(false);

        // Clear new contact formData
        setFormData(previous => ({
            ...previous,
            newContactName: '',
        }));
    };

    /**
     * Update formData with user input
     * @param {Event} e js input event
     * e.target.value will be input value
     * e.target.name will be name of originating input field
     */
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        if (name === 'newContactName') {
            const contactNameError = getContactNameError(value, contactList);
            setFormDataErrors(previous => ({
                ...previous,
                [name]: contactNameError,
            }));
        }
        setFormData(previous => ({
            ...previous,
            [name]: value,
        }));
    };

    /**
     * We use timeFirstSeen if it is not 0
     * We use block.timestamp if timeFirstSeen is unavailable
     * We use Date.now() if timeFirstSeen is 0 and we do not have a block timestamp
     * This is an edge case that is unlikely to ever be seen -- requires the chronik node to have just
     * become indexed after a tx was broadcast but before it is confirmed
     */
    const timestamp =
        timeFirstSeen !== 0 || typeof block?.timestamp !== 'undefined'
            ? new Date(
                  parseInt(
                      `${
                          timeFirstSeen !== 0 ? timeFirstSeen : block?.timestamp
                      }000`,
                  ),
              )
            : new Date();
    const renderedTimestamp = timestamp.toLocaleTimeString(userLocale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour12: false,
    });

    const senderOrRecipientNotInContacts =
        (xecTxType === 'Received' && typeof knownSender === 'undefined') ||
        (xecTxType === 'Sent' &&
            typeof knownRecipient === 'undefined' &&
            typeof recipients[0] !== 'undefined');

    // AgoraCancels can get the satoshisSent === 0 condition
    const isSelfSendTx =
        (typeof recipients[0] === 'undefined' && xecTxType !== 'Received') ||
        satoshisSent === 0;

    const handleAmountCopy = (data: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(data);
        }
        toast.success(`"${data}" copied to clipboard`);
    };
    return (
        <>
            {showAddNewContactModal && (
                <Modal
                    height={180}
                    title={`Add new contact`}
                    handleOk={
                        xecTxType === 'Sent' &&
                        typeof recipients[0] !== 'undefined'
                            ? () => addNewContact(recipients[0])
                            : () => addNewContact(replyAddress as string)
                    }
                    handleCancel={() => setShowAddNewContactModal(false)}
                    showCancelButton
                >
                    <ModalInput
                        placeholder="Enter new contact name"
                        name="newContactName"
                        value={formData.newContactName}
                        error={formDataErrors.newContactName}
                        handleInput={handleInput}
                    />
                </Modal>
            )}
            {showAirdropInfo && (
                <Modal
                    title="Airdrop Message"
                    handleOk={() => setShowAirdropInfo(false)}
                    handleCancel={() => setShowAirdropInfo(false)}
                    height={400}
                >
                    <Alert>Beware of scams in links!</Alert>
                    <TxInfoModalParagraph>
                        An Airdrop was sent to holders of this token.
                    </TxInfoModalParagraph>
                    <TxInfoModalParagraph>
                        Anyone can send an airdrop (with any msg) to holders of
                        any token.
                    </TxInfoModalParagraph>
                </Modal>
            )}
            <TxWrapper>
                <Collapse onClick={() => setShowPanel(!showPanel)}>
                    <MainRow type={xecTxType}>
                        <MainRowLeft>
                            <IconCtn receive={xecTxType === 'Received'}>
                                {isSelfSendTx ? (
                                    <SelfSendIcon />
                                ) : xecTxType === 'Received' ? (
                                    <ReceiveIcon />
                                ) : xecTxType === 'Sent' ? (
                                    <SendIcon />
                                ) : (
                                    <MinedIcon />
                                )}
                            </IconCtn>
                            <TxDescCol>
                                <TxDesc>
                                    <TxDescSendRcvMsg>
                                        {!isSelfSendTx ? xecTxType : 'Sent'}
                                        {typeof replyAddress === 'string' &&
                                        !isSelfSendTx ? (
                                            <>
                                                {' from'}

                                                <AddressLink
                                                    href={`${explorer.blockExplorerUrl}/address/${replyAddress}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {typeof knownSender ===
                                                    'undefined'
                                                        ? replyAddressPreview
                                                        : knownSender.name}
                                                </AddressLink>
                                            </>
                                        ) : xecTxType === 'Sent' &&
                                          !isSelfSendTx ? (
                                            <>
                                                {' to'}
                                                <AddressLink
                                                    href={`${explorer.blockExplorerUrl}/address/${recipients[0]}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {renderedRecipient}
                                                </AddressLink>
                                                {renderedOtherRecipients !==
                                                    '' && (
                                                    <AddressLink
                                                        href={`${explorer.blockExplorerUrl}/tx/${txid}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        {
                                                            renderedOtherRecipients
                                                        }
                                                    </AddressLink>
                                                )}
                                            </>
                                        ) : xecTxType === 'Sent' ||
                                          xecTxType === 'Received' ? (
                                            ' to self'
                                        ) : (
                                            ''
                                        )}
                                    </TxDescSendRcvMsg>
                                </TxDesc>
                                <Timestamp>
                                    {renderedTimestamp}
                                    <TimestampSeperator>|</TimestampSeperator>
                                    {tx.isFinal ? (
                                        <AvalancheFinalized />
                                    ) : (
                                        <Ellipsis title="Loading">
                                            Finalizing<span>.</span>
                                            <span>.</span>
                                            <span>.</span>
                                        </Ellipsis>
                                    )}
                                </Timestamp>
                            </TxDescCol>
                        </MainRowLeft>
                        <AmountCol>
                            <AmountTop>
                                {isSelfSendTx ? (
                                    '-'
                                ) : (
                                    <div
                                        onClick={e => {
                                            e.stopPropagation();
                                            handleAmountCopy(
                                                toXec(
                                                    satoshisSent,
                                                ).toLocaleString(userLocale, {
                                                    maximumFractionDigits: 2,
                                                    minimumFractionDigits: 2,
                                                }),
                                            );
                                        }}
                                    >
                                        {xecTxType === 'Sent' ? '-' : ''}
                                        {!showPanel
                                            ? toFormattedXec(
                                                  satoshisSent,
                                                  userLocale,
                                              )
                                            : toXec(
                                                  satoshisSent,
                                              ).toLocaleString(userLocale, {
                                                  maximumFractionDigits: 2,
                                                  minimumFractionDigits: 2,
                                              })}{' '}
                                        XEC
                                    </div>
                                )}
                            </AmountTop>
                            <AmountBottom>
                                {isSelfSendTx ? (
                                    ''
                                ) : (
                                    <>
                                        {xecTxType === 'Sent' ? '-' : ''}
                                        {
                                            supportedFiatCurrencies[
                                                fiatCurrency
                                            ].symbol
                                        }
                                        {fiatPrice !== null &&
                                            (
                                                fiatPrice * toXec(satoshisSent)
                                            ).toLocaleString(userLocale, {
                                                maximumFractionDigits: 2,
                                                minimumFractionDigits: 2,
                                            })}
                                    </>
                                )}
                            </AmountBottom>
                        </AmountCol>
                    </MainRow>
                    {renderedAppActions.map((action, index) => {
                        return <AppAction key={index}>{action}</AppAction>;
                    })}
                    {tokenActions.map((action, index) => {
                        return (
                            <TokenActionHolder key={index}>
                                {action}
                            </TokenActionHolder>
                        );
                    })}
                </Collapse>
                <Expand showPanel={showPanel}>
                    <ExpandButtonPanel>
                        <CopyToClipboard
                            data={txid}
                            showToast
                            customMsg={`Txid "${txid}" copied to clipboard`}
                        >
                            <PanelButton>
                                <CopyPasteIcon />
                            </PanelButton>
                        </CopyToClipboard>
                        <PanelLink
                            to={`${explorer.blockExplorerUrl}/tx/${txid}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <ThemedLinkSolid />
                        </PanelLink>
                        <PanelLink
                            to={`${explorer.pdfReceiptUrl}/${txid}.pdf`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <ThemedPdfSolid />
                        </PanelLink>
                        {senderOrRecipientNotInContacts && (
                            <PanelButton
                                onClick={() => {
                                    setShowAddNewContactModal(true);
                                }}
                            >
                                <AddContactIcon />
                            </PanelButton>
                        )}
                    </ExpandButtonPanel>
                </Expand>
            </TxWrapper>
        </>
    );
};

export default Tx;
