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
} from 'components/Common/CustomIcons';
import PropTypes from 'prop-types';
import { supportedFiatCurrencies } from 'config/cashtabSettings';
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

const Tx = ({
    tx,
    hashes,
    fiatPrice,
    fiatCurrency,
    cashtabState,
    updateCashtabState,
    userLocale = 'en-US',
}) => {
    const { txid, timeFirstSeen, block, tokenEntries, inputs, outputs } = tx;
    const { satoshisSent, xecTxType, stackArray, recipients } = parseTx(
        tx,
        hashes,
    );
    const { cashtabCache, contactList } = cashtabState;

    let replyAddress, replyAddressPreview, knownSender;
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
                                        {airdroppedTokenId}
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
                            {xecTxType === 'Received' &&
                                typeof replyAddress !== 'undefined' && (
                                    <PanelLink
                                        to="/send"
                                        state={{
                                            replyAddress: replyAddress,
                                        }}
                                    >
                                        <ReplyIcon />
                                    </PanelLink>
                                )}
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
        const parsedTokenType = `${protocol}${
            protocol !== 'ALP' ? ` ${number}` : ''
        }`;

        // Ref TokenTxType in ChronikClientNode
        if (txType === 'NONE' || txType === 'UNKNOWN') {
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

        const cachedTokenInfo = cashtabCache.tokens.get(tokenId);
        const renderedTxType =
            txType === 'SEND' && !isUnintentionalBurn
                ? xecTxType
                : txType === 'GENESIS'
                ? 'Created'
                : isUnintentionalBurn || txType === 'BURN'
                ? 'Burned'
                : txType === 'MINT'
                ? 'Minted'
                : txType;
        if (typeof cachedTokenInfo === 'undefined') {
            tokenActions.push(
                <TokenAction tokenTxType={renderedTxType}>
                    <IconAndLabel>
                        {txType === 'GENESIS' && <GenesisIcon />}
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
                    <TokenDesc>{renderedTxType}</TokenDesc>
                </TokenAction>,
            );
            continue;
        } else {
            const { decimals, tokenName, tokenTicker } =
                cachedTokenInfo.genesisInfo;
            let amountTotal = BigInt(0);
            let amountThisWallet = BigInt(0);
            // For unexpected burns, we do not need to iterate over outputs
            // Enough info is available in the burnSummary key
            if (isUnintentionalBurn) {
                amountTotal = BigInt(actualBurnAmount);
            } else {
                for (const output of outputs) {
                    if (
                        typeof output.token !== 'undefined' &&
                        typeof output.token.entryIdx !== 'undefined' &&
                        output.token.entryIdx === i
                    ) {
                        // Get the amount associated with this token entry
                        // Per ChronikClientNode, we will always have amount as a string in
                        // the token key of an output, see type Token_InNode
                        amountTotal += BigInt(output.token.amount);
                        for (const hash of hashes) {
                            if (output.outputScript.includes(hash)) {
                                amountThisWallet += BigInt(output.token.amount);
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
                renderedTxType === 'Received'
                    ? amountThisWallet
                    : renderedTxType === 'Created' ||
                      renderedTxType === 'Minted'
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
                        {txType === 'GENESIS' && <GenesisIcon />}
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

                    <TokenInfoCol>
                        <TokenName>{tokenName}</TokenName>
                        <TokenTicker>({tokenTicker})</TokenTicker>
                    </TokenInfoCol>
                    <TokenDesc>
                        {renderedTxType} {formattedAmount} {tokenTicker}
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
                            {xecTxType === 'Received' ? (
                                <ReceiveIcon />
                            ) : xecTxType === 'Sent' ? (
                                <SendIcon />
                            ) : (
                                <MinedIcon />
                            )}
                            <TxDescCol>
                                <TxDesc>
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
                                      typeof recipients[0] !== 'undefined' ? (
                                        <>
                                            {' to'}
                                            <AddressLink
                                                href={`${explorer.blockExplorerUrl}/address/${recipients[0]}`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {renderedRecipient}
                                            </AddressLink>
                                            {renderedOtherRecipients !== '' && (
                                                <AddressLink
                                                    href={`${explorer.blockExplorerUrl}/tx/${txid}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {renderedOtherRecipients}
                                                </AddressLink>
                                            )}
                                        </>
                                    ) : xecTxType === 'Sent' ||
                                      xecTxType === 'Received' ? (
                                        ' to self'
                                    ) : (
                                        ''
                                    )}
                                </TxDesc>
                                <Timestamp>{renderedTimestamp}</Timestamp>
                            </TxDescCol>
                        </MainRowLeft>
                        <AmountCol>
                            <AmountTop>
                                {xecTxType === 'Sent' ? '-' : ''}
                                {toFormattedXec(satoshisSent, userLocale)} XEC
                            </AmountTop>
                            <AmountBottom>
                                {xecTxType === 'Sent' ? '-' : ''}
                                {supportedFiatCurrencies[fiatCurrency].symbol}
                                {(
                                    fiatPrice * toXec(satoshisSent)
                                ).toLocaleString(userLocale, {
                                    maximumFractionDigits: 2,
                                    minimumFractionDigits: 2,
                                })}
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
                </Expand>
            </TxWrapper>
        </>
    );
};

Tx.propTypes = {
    tx: PropTypes.shape({
        txid: PropTypes.string,
        timeFirstSeen: PropTypes.number,
        block: PropTypes.shape({ timestamp: PropTypes.number }),
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
    userLocale: PropTypes.string,
};

export default Tx;
