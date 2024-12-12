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
} from 'components/Common/CustomIcons';
import CashtabSettings, {
    supportedFiatCurrencies,
} from 'config/CashtabSettings';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import { explorer } from 'config/explorer';
import { ParsedTokenTxType } from 'chronik';
import {
    toFormattedXec,
    decimalizedTokenQtyToLocaleFormat,
} from 'utils/formatting';
import {
    toXec,
    decimalizeTokenAmount,
    CashtabTx,
    SlpDecimals,
    CashtabWallet,
    LegacyCashtabWallet,
} from 'wallet';
import { opReturn } from 'config/opreturn';
import TokenIcon from 'components/Etokens/TokenIcon';
import Modal from 'components/Common/Modal';
import { ModalInput } from 'components/Common/Inputs';
import { toast } from 'react-toastify';
import { getContactNameError } from 'validation';
import AvalancheFinalized from 'components/Common/AvalancheFinalized';
import { InlineLoader } from 'components/Common/Spinner';
import { CopyIconButton } from 'components/Common/Buttons';
import CashtabState, { CashtabContact } from 'config/CashtabState';
import CashtabCache from 'config/CashtabCache';
import { CashtabCacheJson, StoredCashtabWallet } from 'helpers';

interface TxProps {
    tx: CashtabTx;
    hashes: string[];
    fiatPrice: null | number;
    fiatCurrency: string;
    cashtabState: CashtabState;
    updateCashtabState: (
        key: string,
        value:
            | CashtabWallet[]
            | CashtabCache
            | CashtabContact[]
            | CashtabSettings
            | CashtabCacheJson
            | StoredCashtabWallet[]
            | (LegacyCashtabWallet | StoredCashtabWallet)[],
    ) => Promise<boolean>;
    chaintipBlockheight: number;
    userLocale: string;
}
const Tx: React.FC<TxProps> = ({
    tx,
    fiatPrice,
    fiatCurrency,
    cashtabState,
    updateCashtabState,
    chaintipBlockheight,
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
            ? `${replyAddress.slice(6, 9)}...${replyAddress.slice(-3)}`
            : undefined;

    const knownSender = contactList.find(
        contact => contact.address === replyAddress,
    );

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

    const renderedAppActions: React.ReactNode[] = [];
    for (const appAction of appActions) {
        const { lokadId, app, isValid, action } = appAction;
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
                        const aliasAddrPreview = `${address.slice(
                            6,
                            9,
                        )}...${address.slice(-3)}`;
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
                            const { genesisInfo, tokenType } =
                                airdroppedTokenInfo;
                            const { tokenName, tokenTicker } = genesisInfo;
                            const { protocol, number } = tokenType;
                            const parsedTokenType = `${protocol}${
                                protocol !== 'ALP' ? ` ${number}` : ''
                            }`;
                            renderedAppActions.push(
                                <>
                                    <IconAndLabel>
                                        <AirdropIcon />
                                        <AppDescLabel>
                                            Airdrop (XEC)
                                        </AppDescLabel>
                                    </IconAndLabel>
                                    <TokenIcon size={32} tokenId={tokenId} />
                                    <TokenInfoCol>
                                        <TokenType>{parsedTokenType}</TokenType>
                                        <TokenName>
                                            <ActionLink
                                                href={`${explorer.blockExplorerUrl}/tx/${tokenId}`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {tokenName}
                                            </ActionLink>
                                        </TokenName>
                                        <TokenTicker>
                                            ({tokenTicker})
                                        </TokenTicker>
                                    </TokenInfoCol>
                                    {typeof msg !== 'undefined' && (
                                        <AppDescMsg>{msg}</AppDescMsg>
                                    )}
                                </>,
                            );
                            break;
                        }
                        // If we do not have token info
                        renderedAppActions.push(
                            <>
                                <IconAndLabel>
                                    <AirdropIcon />
                                    <AppDescLabel>
                                        Airdrop to holders of{' '}
                                        <ActionLink
                                            href={`${explorer.blockExplorerUrl}/tx/${tokenId}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {`${tokenId.slice(
                                                0,
                                                3,
                                            )}...${tokenId.slice(-3)}`}
                                        </ActionLink>
                                    </AppDescLabel>
                                </IconAndLabel>
                                <TokenIcon size={32} tokenId={tokenId} />
                                {typeof msg !== 'undefined' && (
                                    <AppDescMsg>{msg}</AppDescMsg>
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
                                <IconAndLabel>
                                    <CashtabMsgIcon />
                                    <AppDescLabel>Cashtab Msg</AppDescLabel>
                                </IconAndLabel>
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
        let actionIcon: React.ReactNode;
        switch (renderedTxType) {
            // "NONE" | "UNKNOWN" | "SEND" |
            // ParsedTokenTxType
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

        // Get action icon based on renderedTxType

        // Token name and ticker depends on availability of cache info
        const cachedTokenInfo = cashtabCache.tokens.get(tokenId);
        let tokenTicker: string;
        let tokenName: string;
        let decimals: undefined | number;
        if (typeof cachedTokenInfo === 'undefined') {
            tokenName = `${tokenId.slice(0, 3)}...${tokenId.slice(-3)}`;
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
            <TokenAction tokenTxType={renderedTxType}>
                <IconAndLabel>
                    {actionIcon}
                    {tokenIcon}
                    <TokenInfoCol>
                        <TokenType>{renderedTokenType}</TokenType>
                        <TokenType>
                            {renderedTokenType === 'Collection' &&
                            renderedTxType === 'NONE'
                                ? 'BURN'
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
            <TxWrapper>
                <Collapse onClick={() => setShowPanel(!showPanel)}>
                    <MainRow type={xecTxType}>
                        <MainRowLeft>
                            {isSelfSendTx ? (
                                <SelfSendIcon />
                            ) : xecTxType === 'Received' ? (
                                <ReceiveIcon />
                            ) : xecTxType === 'Sent' ? (
                                <SendIcon />
                            ) : (
                                <MinedIcon />
                            )}
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

export default Tx;
