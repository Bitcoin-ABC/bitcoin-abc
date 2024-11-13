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
    ExpandAvalancheLabel,
    ExpandAvalancheWrapper,
    TxDescSendRcvMsg,
} from 'components/Home/Tx/styles';
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
    AgoraTxIcon,
    AgoraOfferIcon,
    AgoraBuyIcon,
    AgoraSaleIcon,
    AgoraCancelIcon,
} from 'components/Common/CustomIcons';
import PropTypes from 'prop-types';
import { supportedFiatCurrencies } from 'config/CashtabSettings';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import { explorer } from 'config/explorer';
import { parseTx } from 'chronik';
import {
    toFormattedXec,
    decimalizedTokenQtyToLocaleFormat,
} from 'utils/formatting';
import { toXec, decimalizeTokenAmount } from 'wallet';
import { opReturn } from 'config/opreturn';
import cashaddr from 'ecashaddrjs';
import TokenIcon from 'components/Etokens/TokenIcon';
import Modal from 'components/Common/Modal';
import { ModalInput } from 'components/Common/Inputs';
import { toast } from 'react-toastify';
import { getContactNameError } from 'validation';
import AvalancheFinalized from 'components/Common/AvalancheFinalized';
import { InlineLoader } from 'components/Common/Spinner';
import {
    SLP_1_PROTOCOL_NUMBER,
    SLP_1_NFT_COLLECTION_PROTOCOL_NUMBER,
    SLP_1_NFT_PROTOCOL_NUMBER,
} from 'slpv1';
import { CopyIconButton } from 'components/Common/Buttons';
import appConfig from 'config/app';
import { scriptOps } from 'ecash-agora';
import { Script, fromHex, OP_0 } from 'ecash-lib';

const Tx = ({
    tx,
    hashes,
    fiatPrice,
    fiatCurrency,
    cashtabState,
    updateCashtabState,
    chaintipBlockheight,
    userLocale = 'en-US',
}) => {
    const { txid, timeFirstSeen, block, tokenEntries, inputs, outputs } = tx;
    const { satoshisSent, xecTxType, stackArray, recipients } = parseTx(
        tx,
        hashes,
    );
    const { cashtabCache, contactList } = cashtabState;

    let replyAddress, replyAddressPreview, knownSender;
    let isAgoraAdSetup = false;
    let isAgoraCancel = false;
    let isAgoraPurchase = false;

    if (xecTxType === 'Received') {
        // If Sent from Cashtab, then the sender will be the outputScript at the 0-index input
        // If Received, we assume that it is "from" the outputScript of the 0-index input
        // We only render these previews in history if this outputScript
        // can be encoded as a p2sh or p2pkh address
        try {
            replyAddress = cashaddr.encodeOutputScript(inputs[0].outputScript);
            replyAddressPreview = `${replyAddress.slice(
                6,
                9,
            )}...${replyAddress.slice(-3)}`;
            knownSender = contactList.find(
                contact => contact.address === replyAddress,
            );
        } catch (err) {
            // Leave replyAddress as false so we do not try to render it
        }
    }

    let knownRecipient, renderedRecipient, renderedOtherRecipients;
    if (xecTxType === 'Sent' && typeof recipients[0] !== 'undefined') {
        const recipientPreview = `${recipients[0].slice(
            6,
            9,
        )}...${recipients[0].slice(-3)}`;
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

    // Parse for app actions
    // For now, these are broadly of two types
    // token actions, which are summarized in the tokenEntries key of tx
    // app actions, which are OP_RETURN txs that may or may not follow spec
    // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/op_return-prefix-guideline.md
    // With EMPP, a single TX may have several app actions
    // For now, we parse only token actions and non-EMPP OP_RETURN
    // TODO parse EMPP

    let appActions = [];
    if (stackArray.length !== 0) {
        // If we have an OP_RETURN output
        switch (stackArray[0]) {
            case opReturn.appPrefixesHex.eToken: {
                // slpv1
                // Do nothing, handle this in token actions
                break;
            }
            case opReturn.opReserved: {
                // EMPP
                // For now, do nothing
                // ALP will be parsed by tokenEntries below
                // TODO parse EMPP app actions
                break;
            }
            case opReturn.appPrefixesHex.aliasRegistration: {
                // Magic numbers per spec
                // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/ecash-alias.md
                if (
                    stackArray[1] === '00' &&
                    typeof stackArray[2] !== 'undefined' &&
                    typeof stackArray[3] !== 'undefined' &&
                    stackArray[3].length === 42
                ) {
                    const addressTypeByte = stackArray[3].slice(0, 2);
                    let addressType;
                    if (addressTypeByte === '00') {
                        addressType = 'p2pkh';
                    } else if (addressTypeByte === '08') {
                        addressType = 'p2sh';
                    } else {
                        appActions.push(
                            <IconAndLabel>
                                <AliasIconTx />
                                <AppDescLabel>
                                    Invalid alias registration
                                </AppDescLabel>
                            </IconAndLabel>,
                        );
                        break;
                    }
                    const aliasAddress = cashaddr.encode(
                        'ecash',
                        addressType,
                        stackArray[3].slice(1),
                    );
                    const aliasAddrPreview = `${aliasAddress.slice(
                        6,
                        9,
                    )}...${aliasAddress.slice(-3)}`;
                    appActions.push(
                        <>
                            <IconAndLabel>
                                <AliasIconTx />
                                <AppDescLabel>Alias Registration</AppDescLabel>
                            </IconAndLabel>
                            <AppDescMsg>
                                {`${Buffer.from(stackArray[2], 'hex').toString(
                                    'utf8',
                                )} to ${aliasAddrPreview}`}
                            </AppDescMsg>
                        </>,
                    );
                    break;
                }
                appActions.push(
                    <IconAndLabel>
                        <AliasIconTx />
                        <AppDescLabel>Invalid alias registration</AppDescLabel>
                    </IconAndLabel>,
                );
                break;
            }
            case opReturn.appPrefixesHex.airdrop: {
                if (
                    typeof stackArray[1] !== 'undefined' &&
                    stackArray[1].length === 64
                ) {
                    // We have an on-spec airdrop tx if OP_RETURN prefix and tokenID at first push after prefix
                    const airdroppedTokenId = stackArray[1];
                    let airdropMsg = '';
                    if (typeof stackArray[2] !== 'undefined') {
                        // Legacy airdrop msg would be at [3] after cashtab msg prefix push
                        // on-spec airdrop msg would be at [2]
                        airdropMsg =
                            stackArray[2] === opReturn.appPrefixesHex.cashtab &&
                            typeof stackArray[3] !== 'undefined'
                                ? Buffer.from(stackArray[3], 'hex').toString(
                                      'utf8',
                                  )
                                : Buffer.from(stackArray[2], 'hex').toString(
                                      'utf8',
                                  );
                    }
                    // Add token info if we have it in cache
                    const airdroppedTokenInfo =
                        cashtabCache.tokens.get(airdroppedTokenId);
                    if (typeof airdroppedTokenInfo !== 'undefined') {
                        const { genesisInfo, tokenType } = airdroppedTokenInfo;
                        const { tokenName, tokenTicker } = genesisInfo;
                        const { protocol, number } = tokenType;
                        const parsedTokenType = `${protocol}${
                            protocol !== 'ALP' ? ` ${number}` : ''
                        }`;
                        appActions.push(
                            <>
                                <IconAndLabel>
                                    <AirdropIcon />
                                    <AppDescLabel>Airdrop (XEC)</AppDescLabel>
                                </IconAndLabel>
                                <TokenIcon
                                    size={32}
                                    tokenId={airdroppedTokenId}
                                />
                                <TokenInfoCol>
                                    <TokenType>{parsedTokenType}</TokenType>
                                    <TokenName>
                                        <ActionLink
                                            href={`${explorer.blockExplorerUrl}/tx/${airdroppedTokenId}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {tokenName}
                                        </ActionLink>
                                    </TokenName>
                                    <TokenTicker>({tokenTicker})</TokenTicker>
                                </TokenInfoCol>
                                {airdropMsg !== '' && (
                                    <AppDescMsg>{airdropMsg}</AppDescMsg>
                                )}
                            </>,
                        );
                        break;
                    }
                    appActions.push(
                        <>
                            <IconAndLabel>
                                <AirdropIcon />
                                <AppDescLabel>
                                    Airdrop to holders of{' '}
                                    <ActionLink
                                        href={`${explorer.blockExplorerUrl}/tx/${airdroppedTokenId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {`${airdroppedTokenId.slice(
                                            0,
                                            3,
                                        )}...${airdroppedTokenId.slice(-3)}`}
                                    </ActionLink>
                                </AppDescLabel>
                            </IconAndLabel>
                            <TokenIcon size={32} tokenId={airdroppedTokenId} />
                            {airdropMsg !== '' && (
                                <AppDescMsg>{airdropMsg}</AppDescMsg>
                            )}
                        </>,
                    );
                    break;
                }
                // off-spec airdrop
                appActions.push(
                    <>
                        <IconAndLabel>
                            <AirdropIcon />
                            <AppDescLabel>
                                Off-spec airdrop: tokenId unavailable
                            </AppDescLabel>
                        </IconAndLabel>
                    </>,
                );
                break;
            }
            case opReturn.appPrefixesHex.cashtabEncrypted: {
                // Deprecated, we do not parse
                // Just render the lokad
                // <lokad> <encrypted utf8>
                appActions.push(
                    <IconAndLabel>
                        <EncryptedMsgIcon />
                        <AppDescLabel>Encrypted Cashtab Msg</AppDescLabel>
                    </IconAndLabel>,
                );
                break;
            }
            case opReturn.appPrefixesHex.swap: {
                // Limited parse support for SWaP txs, which are not expected in Cashtab
                // Just print the type
                appActions.push(
                    <IconAndLabel>
                        <SwapIcon />
                        <AppDescLabel>SWaP</AppDescLabel>
                    </IconAndLabel>,
                );
                break;
            }
            case opReturn.appPrefixesHex.paybutton: {
                // PayButton tx
                // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/paybutton.md
                if (
                    stackArray[1] === '00' &&
                    typeof stackArray[2] !== 'undefined' &&
                    typeof stackArray[3] !== 'undefined'
                ) {
                    // Valid PayButtonTx
                    appActions.push(
                        <>
                            <IconAndLabel>
                                <PayButtonIcon />
                            </IconAndLabel>
                            {stackArray[2] !== '00' && (
                                <AppDescMsg>
                                    {Buffer.from(stackArray[2], 'hex').toString(
                                        'utf8',
                                    )}
                                </AppDescMsg>
                            )}
                            {stackArray[3] !== '00' && (
                                <AppDescMsg>{stackArray[3]}</AppDescMsg>
                            )}
                        </>,
                    );
                } else {
                    appActions.push(
                        <IconAndLabel>
                            <PayButtonIcon />
                            <AppDescLabel>(Invalid)</AppDescLabel>
                        </IconAndLabel>,
                    );
                }
                break;
            }
            case opReturn.appPrefixesHex.eCashChat: {
                if (typeof stackArray[1] !== 'undefined') {
                    appActions.push(
                        <>
                            <IconAndLabel>
                                <ChatIcon />
                                <AppDescLabel>eCash Chat</AppDescLabel>
                            </IconAndLabel>
                            <AppDescMsg>
                                {Buffer.from(stackArray[1], 'hex').toString(
                                    'utf8',
                                )}
                            </AppDescMsg>
                        </>,
                    );
                } else {
                    appActions.push(
                        <IconAndLabel>
                            <ChatIcon />
                            <AppDescLabel>Invalid eCash Chat</AppDescLabel>
                        </IconAndLabel>,
                    );
                }
                break;
            }
            case opReturn.appPrefixesHex.paywallPayment: {
                if (typeof stackArray[1] !== 'undefined') {
                    appActions.push(
                        <>
                            <IconAndLabel>
                                <PaywallPaymentIcon />
                                <AppDescLabel>Paywall Payment</AppDescLabel>
                            </IconAndLabel>
                            <AppDescMsg>
                                <a
                                    href={`https://www.ecashchat.com/?sharedArticleTxid=${stackArray[1]}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Paywall Article
                                </a>
                            </AppDescMsg>
                        </>,
                    );
                } else {
                    appActions.push(
                        <IconAndLabel>
                            <PaywallPaymentIcon />
                            <AppDescLabel>Invalid Paywall Payment</AppDescLabel>
                        </IconAndLabel>,
                    );
                }
                break;
            }
            // eCashChat authentication txs consists of authPrefixHex + a random string
            // Other apps can use this same prefix followed by an authentication identifier of their choosing
            case opReturn.appPrefixesHex.authPrefixHex: {
                appActions.push(
                    <>
                        <IconAndLabel>
                            <ChatIcon />
                            <AppDescLabel>
                                eCash Chat Authentication
                            </AppDescLabel>
                        </IconAndLabel>
                    </>,
                );
                break;
            }
            case opReturn.appPrefixesHex.eCashChatArticle: {
                if (typeof stackArray[1] !== 'undefined') {
                    // If this is a reply to a blog post then index 2 is txid of article and index 3 is the reply
                    if (
                        stackArray[1] ===
                        opReturn.appPrefixesHex.eCashChatArticleReply
                    ) {
                        if (stackArray.length === 4) {
                            appActions.push(
                                <>
                                    <IconAndLabel>
                                        <ChatIcon />
                                        <AppDescLabel>
                                            eCash Chat - Reply to
                                            <a
                                                href={`https://www.ecashchat.com/?sharedArticleTxid=${stackArray[2]}`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                &nbsp;article
                                            </a>
                                        </AppDescLabel>
                                    </IconAndLabel>
                                    <AppDescMsg>
                                        {Buffer.from(
                                            stackArray[3],
                                            'hex',
                                        ).toString('utf8')}
                                    </AppDescMsg>
                                </>,
                            );
                        } else {
                            appActions.push(
                                <IconAndLabel>
                                    <ChatIcon />
                                    <AppDescLabel>
                                        Invalid eCashChat Article Reply
                                    </AppDescLabel>
                                </IconAndLabel>,
                            );
                        }
                    } else {
                        appActions.push(
                            <>
                                <IconAndLabel>
                                    <ChatIcon />
                                    <AppDescLabel>
                                        eCash Chat article created
                                    </AppDescLabel>
                                </IconAndLabel>
                            </>,
                        );
                    }
                } else {
                    appActions.push(
                        <IconAndLabel>
                            <ChatIcon />
                            <AppDescLabel>
                                Invalid eCashChat Article
                            </AppDescLabel>
                        </IconAndLabel>,
                    );
                }
                break;
            }
            case opReturn.appPrefixesHex.cashtab: {
                if (typeof stackArray[1] !== 'undefined') {
                    appActions.push(
                        <>
                            <IconAndLabel>
                                <CashtabMsgIcon />
                                <AppDescLabel>Cashtab Msg</AppDescLabel>
                            </IconAndLabel>
                            <AppDescMsg>
                                {Buffer.from(stackArray[1], 'hex').toString(
                                    'utf8',
                                )}
                            </AppDescMsg>
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
                } else {
                    appActions.push(
                        <>
                            <IconAndLabel>
                                <CashtabMsgIcon />
                                <AppDescLabel>Invalid Cashtab Msg</AppDescLabel>
                            </IconAndLabel>
                        </>,
                    );
                }
                break;
            }
            default: {
                // Unsupported lokad prefixes or misc OP_RETURN msgs
                // e.g. a msg sent by ElectrumABC
                // Attempt to utf8 decode each push
                const decodedTest = [];
                for (const el of stackArray) {
                    decodedTest.push(Buffer.from(el, 'hex').toString('utf8'));
                }
                appActions.push(
                    <>
                        <IconAndLabel>
                            <UnknownIcon />
                            <AppDescLabel>Unknown App</AppDescLabel>
                        </IconAndLabel>
                        <UnknownMsgColumn>
                            <AppDescMsg>{stackArray.join(' ')}</AppDescMsg>
                            <AppDescMsg>{decodedTest.join(' ')}</AppDescMsg>
                        </UnknownMsgColumn>
                    </>,
                );
                break;
            }
        }
    }
    let tokenActions = [];
    for (let i = 0; i < tokenEntries.length; i += 1) {
        // Each entry will get a parsed token action row
        const entry = tokenEntries[i];

        const { tokenId, tokenType, txType, burnSummary, actualBurnAmount } =
            entry;
        const { protocol, number } = tokenType;
        const isUnintentionalBurn =
            burnSummary !== '' && actualBurnAmount !== '0';

        // Every token entry has a token icon
        const tokenIcon = <TokenIcon size={32} tokenId={tokenId} />;

        // Every token entry has a token type
        // We parse it to be more human friendly (...less dev friendly 🤔) in tx history
        let parsedTokenType = '';
        switch (protocol) {
            case 'ALP': {
                parsedTokenType = 'ALP';
                break;
            }
            case 'SLP': {
                if (number === SLP_1_PROTOCOL_NUMBER) {
                    parsedTokenType = 'SLP';
                } else if (number === SLP_1_NFT_COLLECTION_PROTOCOL_NUMBER) {
                    parsedTokenType = 'NFT Collection';
                } else if (number === SLP_1_NFT_PROTOCOL_NUMBER) {
                    parsedTokenType = 'NFT';
                }
                break;
            }
            default: {
                parsedTokenType = `${protocol} ${number}`;
                break;
            }
        }

        // Ref TokenTxType in ChronikClient
        if (txType === 'NONE' || txType === 'UNKNOWN') {
            // Handle special case of burning qty 1 NFT Parent token utxo for an NFT mint
            // Assume when you see txType === 'NONE' for an SLP 1 NFT Parent, that this is burning an NFT mint
            // In Cashtab, this is the only case
            if (parsedTokenType === 'NFT Collection') {
                tokenActions.push(
                    <TokenAction>
                        <IconAndLabel>
                            <TokenBurnIcon />
                            {tokenIcon}
                        </IconAndLabel>
                        <TokenType>{parsedTokenType}</TokenType>
                        <TokenDesc>Burned 1 NFT Mint Input</TokenDesc>
                    </TokenAction>,
                );
                // No more parsing for this token action
                continue;
            }

            // Render a token entry row for this
            // Exercise for the user to figure out what is going on with this tx
            tokenActions.push(
                <TokenAction>
                    {tokenIcon}
                    <TokenType>{parsedTokenType}</TokenType>
                    <TokenDesc>Unknown token action</TokenDesc>
                </TokenAction>,
            );
            continue;
        }

        // Other txTypes have an associated quantity
        // We will render this if we can get the token's decimals from cache

        // Parse for an agora ad setup tx
        // These are SLP1 SEND txs where
        // 1. token utxo is > dust
        // 2. recipient is p2sh address
        if (satoshisSent > appConfig.dustSats) {
            if (recipients.length === 1) {
                // Ad setup tx has 1 recipient

                // Ad setup tx has p2sh recipient
                const listingScript = recipients[0];
                try {
                    const { type } = cashaddr.decode(listingScript, true);
                    isAgoraAdSetup = type === 'p2sh';
                } catch (err) {
                    console.error(
                        `Error in cashaddr.decode(${listingScript}, true)`,
                        err,
                    );
                    // Continue parsing as token tx
                }
            }
        }

        // Parse for an agora buy/sell/cancel
        // Will have the token input coming from a p2sh script
        // The input will be at inputs[0]
        // Iterate over inputs to find p2sh
        for (const input of inputs) {
            if (typeof input.token !== 'undefined') {
                try {
                    const { type } = cashaddr.getTypeAndHashFromOutputScript(
                        input.outputScript,
                    );
                    if (type === 'p2sh') {
                        // Check if this is a cancellation
                        // See agora.ts from ecash-agora lib
                        // For now, I don't think it makes sense to have an 'isCanceled' method from ecash-agora
                        // This is a pretty specific application
                        const ops = scriptOps(
                            new Script(fromHex(input.inputScript)),
                        );
                        // isCanceled is always the last pushop (before redeemScript)
                        const opIsCanceled = ops[ops.length - 2];

                        const isCanceled = opIsCanceled === OP_0;

                        if (isCanceled) {
                            isAgoraCancel = true;
                        } else {
                            // We have a cashtab-created agora-offered input going to a Cashtab wallet
                            // Buy or sell depends on whether the XEC is sent or received
                            isAgoraPurchase = true;
                        }
                    }
                } catch (err) {
                    console.error(
                        `Error in cashaddr.getTypeAndHashFromOutputScript(${inputs[0].outputScript}) from txid ${txid}`,
                    );
                    // Do not parse it as an agora tx
                }
                // We don't need to find any other inputs for this case
                continue;
            }
        }

        const cachedTokenInfo = cashtabCache.tokens.get(tokenId);
        const renderedTxType = isAgoraCancel
            ? 'Agora Cancel'
            : isAgoraAdSetup
            ? 'Agora Offer'
            : isAgoraPurchase && xecTxType === 'Sent'
            ? 'Agora Buy'
            : isAgoraPurchase && xecTxType === 'Received'
            ? 'Agora Sale'
            : txType === 'SEND' &&
              !isUnintentionalBurn &&
              parsedTokenType !== 'NFT Collection' &&
              !isAgoraAdSetup &&
              !isAgoraPurchase
            ? xecTxType
            : txType === 'GENESIS' && parsedTokenType !== 'NFT'
            ? 'Created'
            : isUnintentionalBurn || txType === 'BURN'
            ? 'Burned'
            : txType === 'MINT' ||
              (txType === 'GENESIS' && parsedTokenType === 'NFT')
            ? 'Minted'
            : txType !== 'GENESIS' && parsedTokenType === 'NFT Collection'
            ? 'Fan-out'
            : txType;
        if (typeof cachedTokenInfo === 'undefined') {
            tokenActions.push(
                <TokenAction tokenTxType={renderedTxType}>
                    <IconAndLabel>
                        {renderedTxType === 'Fan-out' && <FanOutIcon />}
                        {renderedTxType === 'Agora Offer' && <AgoraOfferIcon />}
                        {renderedTxType === 'Agora Cancel' && (
                            <AgoraCancelIcon />
                        )}
                        {renderedTxType === 'Agora Buy' && <AgoraBuyIcon />}
                        {renderedTxType === 'Agora Sale' && <AgoraSaleIcon />}
                        {txType === 'GENESIS' && parsedTokenType !== 'NFT' && (
                            <GenesisIcon />
                        )}
                        {txType === 'GENESIS' && parsedTokenType === 'NFT' && (
                            <MintNftIcon />
                        )}
                        {txType === 'MINT' && <MintIcon />}
                        {(isUnintentionalBurn || txType === 'BURN') && (
                            <TokenBurnIcon />
                        )}
                        {tokenIcon}
                        <TokenInfoCol>
                            <TokenType>{parsedTokenType}</TokenType>
                            <TokenType>{txType}</TokenType>
                        </TokenInfoCol>
                    </IconAndLabel>
                    <TokenDesc>
                        {renderedTxType === 'Agora Offer'
                            ? `Listed`
                            : renderedTxType}
                    </TokenDesc>
                </TokenAction>,
            );
            continue;
        } else {
            const { decimals, tokenName, tokenTicker } =
                cachedTokenInfo.genesisInfo;
            let amountTotal = BigInt(0);
            let amountThisWallet = BigInt(0);
            let amountSold = 0n;
            // Special case for NFT1 Parent Fan-out tx
            // This can only be a number between 0 and 19, so we do not need BigInt
            let qtyOneInputsCreated = 0;
            // For unexpected burns, we do not need to iterate over outputs
            // Enough info is available in the burnSummary key
            if (isUnintentionalBurn) {
                amountTotal = BigInt(actualBurnAmount);
            } else {
                for (const output of outputs) {
                    if (typeof output.token !== 'undefined') {
                        // Get the amount associated with this token entry
                        // Per ChronikClient, we will always have amount as a string in
                        // the token key of an output, see type Token_InNode
                        amountTotal += BigInt(output.token.amount);

                        // For sales of agora partial txs, we assume the amount sold
                        // goes to a p2pkh address
                        if (renderedTxType === 'Agora Sale') {
                            const { type } =
                                cashaddr.getTypeAndHashFromOutputScript(
                                    output.outputScript,
                                );
                            if (type !== 'p2sh') {
                                amountSold += BigInt(output.token.amount);
                            }
                        }
                        for (const hash of hashes) {
                            if (output.outputScript.includes(hash)) {
                                amountThisWallet += BigInt(output.token.amount);

                                if (output.token.amount === '1') {
                                    qtyOneInputsCreated += 1;
                                }
                            }
                        }
                    }
                }
            }

            // Calculate amount to render in tx history based on tx type
            // For a received tx, we are only interested in amountThisWallet
            // For a genesis tx -- cashtab will only create outputs at this wallet. So, just render this.
            // For a sent tx, we want amountTotal - amountThisWallet (amountThisWallet is change)
            const renderedTokenAmount =
                renderedTxType === 'Agora Sale'
                    ? amountSold
                    : renderedTxType === 'Received' ||
                      renderedTxType === 'Agora Buy'
                    ? amountThisWallet
                    : renderedTxType === 'Created' ||
                      renderedTxType === 'Minted' ||
                      renderedTxType === 'Agora Cancel'
                    ? amountTotal
                    : amountTotal - amountThisWallet;

            const decimalizedAmount = decimalizeTokenAmount(
                renderedTokenAmount.toString(),
                decimals,
            );
            const formattedAmount = decimalizedTokenQtyToLocaleFormat(
                decimalizedAmount,
                userLocale,
            );
            tokenActions.push(
                <TokenAction tokenTxType={renderedTxType}>
                    <IconAndLabel>
                        {renderedTxType === 'Agora Offer' && <AgoraOfferIcon />}
                        {renderedTxType === 'Agora Cancel' && (
                            <AgoraCancelIcon />
                        )}
                        {renderedTxType === 'Agora Buy' && <AgoraBuyIcon />}
                        {renderedTxType === 'Agora Sale' && <AgoraSaleIcon />}
                        {txType === 'GENESIS' && parsedTokenType !== 'NFT' && (
                            <GenesisIcon />
                        )}
                        {txType === 'GENESIS' && parsedTokenType === 'NFT' && (
                            <MintNftIcon />
                        )}
                        {renderedTxType === 'Fan-out' && <FanOutIcon />}
                        {txType === 'MINT' && <MintIcon />}
                        {(isUnintentionalBurn || txType === 'BURN') && (
                            <TokenBurnIcon />
                        )}
                        {tokenIcon}
                        <TokenInfoCol>
                            <TokenType>{parsedTokenType}</TokenType>
                            <TokenType>
                                {renderedTxType !== 'Fan-out'
                                    ? txType
                                    : renderedTxType}
                            </TokenType>
                        </TokenInfoCol>
                    </IconAndLabel>

                    <TokenInfoCol>
                        <TokenName>{tokenName}</TokenName>
                        {tokenTicker !== '' && (
                            <TokenTicker>({tokenTicker})</TokenTicker>
                        )}
                    </TokenInfoCol>
                    <TokenDesc>
                        {renderedTxType === 'Fan-out'
                            ? `Created ${qtyOneInputsCreated} NFT Mint Input${
                                  qtyOneInputsCreated > 1 ? 's' : ''
                              }`
                            : renderedTxType === 'Agora Offer'
                            ? `Listed ${formattedAmount} ${tokenTicker}`
                            : renderedTxType === 'Agora Buy'
                            ? `Bought ${formattedAmount} ${tokenTicker}`
                            : renderedTxType === 'Agora Sale'
                            ? `Sold ${formattedAmount} ${tokenTicker}`
                            : renderedTxType === 'Agora Cancel'
                            ? `Canceled offer of ${formattedAmount} ${tokenTicker}`
                            : `${renderedTxType} ${formattedAmount} ${tokenTicker}`}
                    </TokenDesc>
                </TokenAction>,
            );
        }
    }

    const [showPanel, setShowPanel] = useState(false);
    const [showAddNewContactModal, setShowAddNewContactModal] = useState(false);
    const emptyFormData = {
        newContactName: '',
    };
    const emptyFormDataErrors = {
        newContactName: false,
    };
    const [formData, setFormData] = useState(emptyFormData);
    const [formDataErrors, setFormDataErrors] = useState(emptyFormDataErrors);

    const addNewContact = async addressToAdd => {
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
            await updateCashtabState('contactList', contactList);
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
    const handleInput = e => {
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
                          timeFirstSeen !== 0 ? timeFirstSeen : block.timestamp
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

    const isSelfSendTx =
        typeof recipients[0] === 'undefined' && xecTxType !== 'Received';

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
                            : () => addNewContact(replyAddress)
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
            <TxWrapper>
                {/* We always display the MainRow, which is the XEC tx summary*/}
                <Collapse onClick={() => setShowPanel(!showPanel)}>
                    <MainRow type={xecTxType}>
                        <MainRowLeft>
                            {isAgoraAdSetup ||
                            isAgoraPurchase ||
                            isAgoraCancel ? (
                                <AgoraTxIcon />
                            ) : xecTxType === 'Received' && !isSelfSendTx ? (
                                <ReceiveIcon />
                            ) : xecTxType === 'Sent' && !isSelfSendTx ? (
                                <SendIcon />
                            ) : isSelfSendTx ? (
                                <SelfSendIcon />
                            ) : (
                                <MinedIcon />
                            )}
                            <TxDescCol>
                                <TxDesc>
                                    <TxDescSendRcvMsg>
                                        {xecTxType}
                                        {typeof replyAddress === 'string' ? (
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
                                    {typeof block !== 'undefined' &&
                                    block.height <= chaintipBlockheight ? (
                                        <AvalancheFinalized
                                            displayed={
                                                typeof block !== 'undefined' &&
                                                block.height <=
                                                    chaintipBlockheight
                                            }
                                        />
                                    ) : (
                                        <InlineLoader />
                                    )}
                                </TxDesc>
                                <Timestamp>{renderedTimestamp}</Timestamp>
                            </TxDescCol>
                        </MainRowLeft>
                        <AmountCol>
                            <AmountTop>
                                {isSelfSendTx ? (
                                    '-'
                                ) : (
                                    <>
                                        <CopyIconButton
                                            style={{ zIndex: '2' }}
                                            name={`Copy amount`}
                                            data={toXec(
                                                satoshisSent,
                                            ).toLocaleString(userLocale, {
                                                maximumFractionDigits: 2,
                                                minimumFractionDigits: 2,
                                            })}
                                            showToast
                                        />
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
                                    </>
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
                                        {(
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
                    {appActions.map((action, index) => {
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
                    <ExpandAvalancheWrapper>
                        {typeof block !== 'undefined' &&
                        block.height <= chaintipBlockheight ? (
                            <>
                                <ExpandAvalancheLabel>
                                    Avalanche Finalized
                                </ExpandAvalancheLabel>
                                <AvalancheFinalized displayed={showPanel} />
                            </>
                        ) : (
                            <>
                                <ExpandAvalancheLabel>
                                    Confirming
                                </ExpandAvalancheLabel>
                                <InlineLoader />
                            </>
                        )}
                    </ExpandAvalancheWrapper>
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

Tx.propTypes = {
    tx: PropTypes.shape({
        txid: PropTypes.string,
        timeFirstSeen: PropTypes.number,
        block: PropTypes.shape({
            timestamp: PropTypes.number,
            height: PropTypes.number,
        }),
        inputs: PropTypes.array,
        outputs: PropTypes.array,
        tokenEntries: PropTypes.array,
    }),
    hashes: PropTypes.arrayOf(PropTypes.string),
    fiatPrice: PropTypes.number,
    fiatCurrency: PropTypes.string,
    cashtabState: PropTypes.shape({
        contactList: PropTypes.arrayOf(
            PropTypes.shape({
                address: PropTypes.string.isRequired,
                name: PropTypes.string.isRequired,
            }),
        ),
        settings: PropTypes.shape({
            fiatCurrency: PropTypes.string.isRequired,
            sendModal: PropTypes.bool.isRequired,
            autoCameraOn: PropTypes.bool.isRequired,
            hideMessagesFromUnknownSenders: PropTypes.bool.isRequired,
            balanceVisible: PropTypes.bool.isRequired,
            minFeeSends: PropTypes.bool.isRequired,
        }),
        cashtabCache: PropTypes.shape({
            tokens: PropTypes.object.isRequired,
        }),
    }),
    updateCashtabState: PropTypes.func,
    chaintipBlockheight: PropTypes.number,
    userLocale: PropTypes.string,
};

export default Tx;
