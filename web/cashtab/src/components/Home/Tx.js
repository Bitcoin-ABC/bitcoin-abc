import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {
    SendIcon,
    ReceiveIcon,
    GenesisIcon,
    UnparsedIcon,
    ThemedContactsOutlined,
    ThemedBurnOutlined,
} from 'components/Common/CustomIcons';
import { currency } from 'components/Common/Ticker';
import { formatBalance, formatDate } from 'utils/formatting';
import TokenIcon from 'components/Tokens/TokenIcon';
import { Collapse } from 'antd';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import {
    ThemedCopySolid,
    ThemedLinkSolid,
    ThemedPdfSolid,
} from 'components/Common/CustomIcons';

const TxIcon = styled.div`
    svg {
        width: 20px;
        height: 20px;
    }
    height: 40px;
    width: 40px;
    border: 1px solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 100px;
`;

const AddToContacts = styled.span`
    max-height: 200px;
    text-align: left;
`;

const SentTx = styled(TxIcon)`
    svg {
        margin-right: -3px;
    }
    fill: ${props => props.theme.contrast};
`;
const BurnedTx = styled(TxIcon)`
    svg {
        margin-right: -3px;
    }
    border-color: ${props => props.theme.eCashPurple};
`;
const ReceivedTx = styled(TxIcon)`
    svg {
        fill: ${props => props.theme.eCashBlue};
    }
    border-color: ${props => props.theme.eCashBlue};
`;
const GenesisTx = styled(TxIcon)`
    border-color: ${props => props.theme.genesisGreen};
    svg {
        fill: ${props => props.theme.genesisGreen};
    }
`;
const UnparsedTx = styled(TxIcon)`
    color: ${props => props.theme.eCashBlue} !important;
`;
const DateType = styled.div`
    text-align: left;
    padding: 12px;
    @media screen and (max-width: 500px) {
        font-size: 0.8rem;
    }
`;

const GenesisHeader = styled.h3``;
const ReceivedHeader = styled.h3``;

const LeftTextCtn = styled.div`
    text-align: left;
    display: flex;
    align-items: left;
    flex-direction: column;
    margin-left: 10px;
    h3 {
        color: ${props => props.theme.contrast};
        font-size: 14px;
        font-weight: 700;
        margin: 0;
    }
    ${GenesisHeader} {
        color: ${props => props.theme.genesisGreen};
    }
    ${ReceivedHeader} {
        color: ${props => props.theme.eCashBlue};
    }
    h4 {
        font-size: 12px;
        color: ${props => props.theme.lightWhite};
        margin: 0;
    }
`;

const RightTextCtn = styled.div`
    text-align: right;
    display: flex;
    align-items: left;
    flex-direction: column;
    margin-left: 10px;
    h3 {
        color: ${props => props.theme.contrast};
        font-size: 14px;
        font-weight: 700;
        margin: 0;
    }
    h4 {
        font-size: 12px;
        color: ${props => props.theme.lightWhite};
        margin: 0;
    }
`;

const OpReturnType = styled.div`
    text-align: right;
    width: 100%;
    padding: 10px;
    border-radius: 5px;
    background: ${props => props.theme.sentMessage};
    margin-top: 15px;
    transition: max-height 500ms cubic-bezier(0, 1, 0, 1);
    ${({ hideMessagesFromUnknownSenders }) =>
        hideMessagesFromUnknownSenders &&
        `
    max-height: auto;
    &[aria-expanded='true'] {
        max-height: 5000px;
        transition: max-height 500ms ease-in;
    }

    &[aria-expanded='false'] {
        transition: max-height 200ms ease-in;
        max-height: 6rem;
    }
  `}

    h4 {
        color: ${props => props.theme.lightWhite};
        margin: 0;
        font-size: 12px;
        display: inline-block;
    }
    p {
        color: ${props => props.theme.contrast};
        margin: 0;
        font-size: 14px;
        margin-bottom: 10px;
        overflow-wrap: break-word;
    }
    a {
        color: ${props => props.theme.contrast};
        margin: 0px 0px 0px 5px;
        font-size: 10px;
        border: 1px solid ${props => props.theme.contrast};
        border-radius: 5px;
        padding: 2px 10px;
        opacity: 0.6;
    }
    a:hover {
        opacity: 1;
        border-color: ${props => props.theme.eCashBlue};
        color: ${props => props.theme.contrast};
        background: ${props => props.theme.eCashBlue};
    }
    ${({ received, ...props }) =>
        received &&
        `
        text-align: left;    
        background: ${props.theme.receivedMessage};
  `}
`;

const ShowHideMessageButton = styled.button`
    color: ${props => props.theme.contrast};
    background-color: transparent;
    margin: 0px 0px 0px 5px;
    font-size: 10px;
    border: 1px solid ${props => props.theme.contrast};
    border-radius: 5px;
    padding: 1.6px 10px;
    opacity: 0.6;
    &:hover {
        opacity: 1;
        border-color: ${props => props.theme.eCashBlue};
        color: ${props => props.theme.contrast};
        background: ${props => props.theme.eCashBlue};
    }
`;
const ReceivedLabel = styled.span`
    font-weight: bold;
    color: ${props => props.theme.eCashBlue} !important;
`;

const EncryptionMessageLabel = styled.span`
    font-weight: bold;
    font-size: 12px;
    color: ${props => props.theme.encryptionRed};
    white-space: nowrap;
`;
const UnauthorizedDecryptionMessage = styled.span`
    text-align: left;
    color: ${props => props.theme.encryptionRed};
    white-space: nowrap;
    font-style: italic;
`;

const DecryptedMessage = styled.div`
    ${props =>
        props.authorized
            ? {
                  color: `${props => props.theme.contrast}`,
                  margin: '0',
                  fontSize: '14px',
                  marginBottom: '10px',
                  overflowWrap: 'break-word',
              }
            : `${UnauthorizedDecryptionMessage}`}
`;

const TxInfo = styled.div`
    text-align: right;
    display: flex;
    align-items: left;
    flex-direction: column;
    margin-left: 10px;
    flex-grow: 2;
    h3 {
        color: ${props => props.theme.contrast};
        font-size: 14px;
        font-weight: 700;
        margin: 0;
    }

    h4 {
        font-size: 12px;
        color: ${props => props.theme.lightWhite};
        margin: 0;
    }

    @media screen and (max-width: 500px) {
        font-size: 0.8rem;
    }
`;

const TokenInfo = styled.div`
    display: flex;
    flex-grow: 1;
    justify-content: flex-end;

    color: ${props =>
        props.outgoing ? props.theme.secondary : props.theme.eCashBlue};

    @media screen and (max-width: 500px) {
        font-size: 0.8rem;
        grid-template-columns: 16px auto;
    }
`;
const TxTokenIcon = styled.div`
    img {
        height: 24px;
        width: 24px;
    }
    @media screen and (max-width: 500px) {
        img {
            height: 16px;
            width: 16px;
        }
    }
    grid-column-start: 1;
    grid-column-end: span 1;
    grid-row-start: 1;
    grid-row-end: span 2;
    align-self: center;
`;
const TokenTxAmt = styled.h3`
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const TokenTxAmtGenesis = styled(TokenTxAmt)`
    color: ${props => props.theme.genesisGreen} !important;
`;
const TokenTxAmtReceived = styled(TokenTxAmt)`
    color: ${props => props.theme.eCashBlue} !important;
`;

const TokenName = styled.h4`
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const TxWrapper = styled.div`
    display: flex;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    color: ${props => props.theme.contrast};
    padding: 10px 0;
    flex-wrap: wrap;
    width: 100%;
`;

const AntdContextCollapseWrapper = styled.div`
    .ant-collapse {
        border: none !important;
        background-color: transparent !important;
    }
    .ant-collapse-item {
        border: none !important;
    }
    .ant-collapse-header {
        padding: 0 !important;
        color: ${props => props.theme.forms.text} !important;
    }
    border-radius: 16px;
    .ant-collapse-content-box {
        padding-right: 0 !important;
    }

    @media screen and (max-width: 500px) {
        grid-template-columns: 24px 30% 50%;
    }
`;

const Panel = Collapse.Panel;

const DropdownIconWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const TextLayer = styled.div`
    font-size: 12px;
    color: ${props => props.theme.contrast};
    white-space: nowrap;
`;

const DropdownButton = styled.button`
    display: flex;
    justify-content: flex-end;
    position: relative;
    background-color: ${props => props.theme.walletBackground};
    border: none;
    cursor: pointer;
    padding: 0;
    &:hover {
        div {
            color: ${props => props.theme.eCashBlue}!important;
        }
        svg {
            fill: ${props => props.theme.eCashBlue}!important;
        }
    }
`;

const PanelCtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    right: 0;
    gap: 8px;
    @media (max-width: 500px) {
        flex-wrap: wrap;
    }
`;

const TxLink = styled.a`
    color: ${props => props.theme.primary};
`;

const NotInContactsAlert = styled.h4`
    color: ${props => props.theme.forms.error} !important;
    font-style: italic;
`;

const ReceivedFromCtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    h4 {
        margin-top: 2.5px;
    }
`;

const Tx = ({
    data,
    fiatPrice,
    fiatCurrency,
    addressesInContactList,
    contactList,
    cashtabSettings,
}) => {
    const [displayedMessage, setDisplayedMessage] = useState(false);
    const handleShowMessage = () => {
        setDisplayedMessage(!displayedMessage);
    };
    const txDate = formatDate(data.timeFirstSeen, navigator.language);

    // A wallet migrating from bch-api tx history to chronik will get caught here for one update cycle
    let unparsedTx = false;
    if (!Object.keys(data).includes('parsed')) {
        unparsedTx = true;
    }
    return (
        <>
            {unparsedTx ? (
                <TxWrapper>
                    <UnparsedTx>
                        <UnparsedIcon />
                    </UnparsedTx>

                    <DateType>
                        <ReceivedLabel>Unparsed</ReceivedLabel>
                        <br />
                        {txDate}
                    </DateType>
                    <TxInfo>Open in Explorer</TxInfo>
                </TxWrapper>
            ) : (
                <AntdContextCollapseWrapper>
                    <Collapse bordered={false}>
                        <Panel
                            showArrow={false}
                            header={
                                <>
                                    <TxWrapper>
                                        {data.parsed.legacy.outgoingTx ? (
                                            <>
                                                {data.parsed.legacy.tokenTx &&
                                                data.slpTxData.slpMeta
                                                    .txType === 'GENESIS' ? (
                                                    <GenesisTx>
                                                        <GenesisIcon />
                                                    </GenesisTx>
                                                ) : data.parsed.isTokenBurn ? (
                                                    <BurnedTx>
                                                        <ThemedBurnOutlined />
                                                    </BurnedTx>
                                                ) : (
                                                    <SentTx>
                                                        <SendIcon />
                                                    </SentTx>
                                                )}
                                            </>
                                        ) : (
                                            <ReceivedTx>
                                                <ReceiveIcon />
                                            </ReceivedTx>
                                        )}

                                        <LeftTextCtn>
                                            {data.parsed.legacy.outgoingTx ? (
                                                <>
                                                    {data.parsed.legacy
                                                        .tokenTx &&
                                                    data.slpTxData.slpMeta
                                                        .txType ===
                                                        'GENESIS' ? (
                                                        <GenesisHeader>
                                                            Genesis
                                                        </GenesisHeader>
                                                    ) : (
                                                        <h3>
                                                            {data.parsed
                                                                .isTokenBurn
                                                                ? 'Burned'
                                                                : 'Sent'}
                                                        </h3>
                                                    )}
                                                </>
                                            ) : (
                                                <ReceivedFromCtn>
                                                    <ReceivedHeader>
                                                        Received
                                                    </ReceivedHeader>

                                                    {addressesInContactList.includes(
                                                        data.parsed.legacy
                                                            .replyAddress,
                                                    ) && (
                                                        <>
                                                            <h4>from</h4>
                                                            {contactList.map(
                                                                (
                                                                    contact,
                                                                    index,
                                                                ) => {
                                                                    let result;
                                                                    const contactAddress =
                                                                        contact.address;
                                                                    const dataAddress =
                                                                        data
                                                                            .parsed
                                                                            .legacy
                                                                            .replyAddress;
                                                                    if (
                                                                        contactAddress ===
                                                                        dataAddress
                                                                    ) {
                                                                        result =
                                                                            contact.name;
                                                                    } else {
                                                                        result =
                                                                            '';
                                                                    }
                                                                    return (
                                                                        <h4
                                                                            key={`${data.txid}${index}`}
                                                                        >
                                                                            {
                                                                                result
                                                                            }
                                                                        </h4>
                                                                    );
                                                                },
                                                            )}
                                                        </>
                                                    )}
                                                </ReceivedFromCtn>
                                            )}
                                            <h4>{txDate}</h4>
                                        </LeftTextCtn>
                                        {data.parsed.legacy.tokenTx ? (
                                            <TokenInfo
                                                outgoing={
                                                    data.parsed.legacy
                                                        .outgoingTx
                                                }
                                            >
                                                {data.parsed.legacy.tokenTx &&
                                                data.parsed.genesisInfo ? (
                                                    <>
                                                        <TxTokenIcon>
                                                            <TokenIcon
                                                                size={32}
                                                                tokenId={
                                                                    data.parsed
                                                                        .genesisInfo
                                                                        .tokenId
                                                                }
                                                            />
                                                        </TxTokenIcon>
                                                        {data.parsed.legacy
                                                            .outgoingTx ? (
                                                            <RightTextCtn>
                                                                {data.slpTxData
                                                                    .slpMeta
                                                                    .txType ===
                                                                'GENESIS' ? (
                                                                    <>
                                                                        <TokenTxAmtGenesis>
                                                                            +{' '}
                                                                            {data.parsed.etokenAmount.toString()}
                                                                            &nbsp;
                                                                            {
                                                                                data
                                                                                    .parsed
                                                                                    .genesisInfo
                                                                                    .tokenTicker
                                                                            }
                                                                        </TokenTxAmtGenesis>
                                                                        <TokenName>
                                                                            {
                                                                                data
                                                                                    .parsed
                                                                                    .genesisInfo
                                                                                    .tokenName
                                                                            }
                                                                        </TokenName>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <TokenTxAmt>
                                                                            -{' '}
                                                                            {data.parsed.etokenAmount.toString()}
                                                                            &nbsp;
                                                                            {
                                                                                data
                                                                                    .parsed
                                                                                    .genesisInfo
                                                                                    .tokenTicker
                                                                            }
                                                                        </TokenTxAmt>
                                                                        <TokenName>
                                                                            {
                                                                                data
                                                                                    .parsed
                                                                                    .genesisInfo
                                                                                    .tokenName
                                                                            }
                                                                        </TokenName>
                                                                    </>
                                                                )}
                                                            </RightTextCtn>
                                                        ) : (
                                                            <RightTextCtn>
                                                                <TokenTxAmtReceived>
                                                                    +{' '}
                                                                    {data.parsed.etokenAmount.toString()}
                                                                    &nbsp;
                                                                    {
                                                                        data
                                                                            .parsed
                                                                            .genesisInfo
                                                                            .tokenTicker
                                                                    }
                                                                </TokenTxAmtReceived>
                                                                <TokenName>
                                                                    {
                                                                        data
                                                                            .parsed
                                                                            .genesisInfo
                                                                            .tokenName
                                                                    }
                                                                </TokenName>
                                                            </RightTextCtn>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span>Token Tx</span>
                                                )}
                                            </TokenInfo>
                                        ) : (
                                            <>
                                                <TxInfo
                                                    outgoing={
                                                        data.parsed.legacy
                                                            .outgoingTx
                                                    }
                                                >
                                                    {data.parsed.legacy
                                                        .outgoingTx ? (
                                                        <>
                                                            <h3>
                                                                -
                                                                {formatBalance(
                                                                    data.parsed
                                                                        .legacy
                                                                        .amountSent,
                                                                )}{' '}
                                                                {
                                                                    currency.ticker
                                                                }
                                                            </h3>
                                                            {fiatPrice !==
                                                                null &&
                                                                !isNaN(
                                                                    data.parsed
                                                                        .legacy
                                                                        .amountSent,
                                                                ) && (
                                                                    <h4>
                                                                        -
                                                                        {
                                                                            currency
                                                                                .fiatCurrencies[
                                                                                fiatCurrency
                                                                            ]
                                                                                .symbol
                                                                        }
                                                                        {(
                                                                            data
                                                                                .parsed
                                                                                .legacy
                                                                                .amountSent *
                                                                            fiatPrice
                                                                        ).toFixed(
                                                                            2,
                                                                        )}{' '}
                                                                        {
                                                                            currency
                                                                                .fiatCurrencies
                                                                                .fiatCurrency
                                                                        }
                                                                    </h4>
                                                                )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TokenTxAmtReceived>
                                                                +
                                                                {formatBalance(
                                                                    data.parsed
                                                                        .legacy
                                                                        .amountReceived,
                                                                )}{' '}
                                                                {
                                                                    currency.ticker
                                                                }
                                                            </TokenTxAmtReceived>
                                                            {fiatPrice !==
                                                                null &&
                                                                !isNaN(
                                                                    data.parsed
                                                                        .legacy
                                                                        .amountReceived,
                                                                ) && (
                                                                    <h4>
                                                                        +
                                                                        {
                                                                            currency
                                                                                .fiatCurrencies[
                                                                                fiatCurrency
                                                                            ]
                                                                                .symbol
                                                                        }
                                                                        {(
                                                                            data
                                                                                .parsed
                                                                                .legacy
                                                                                .amountReceived *
                                                                            fiatPrice
                                                                        ).toFixed(
                                                                            2,
                                                                        )}{' '}
                                                                        {
                                                                            currency
                                                                                .fiatCurrencies
                                                                                .fiatCurrency
                                                                        }
                                                                    </h4>
                                                                )}
                                                        </>
                                                    )}
                                                </TxInfo>
                                            </>
                                        )}
                                        {data.parsed.legacy.opReturnMessage && (
                                            <>
                                                <OpReturnType
                                                    received={
                                                        !data.parsed.legacy
                                                            .outgoingTx
                                                    }
                                                    aria-expanded={
                                                        cashtabSettings.hideMessagesFromUnknownSenders
                                                            ? displayedMessage
                                                            : false
                                                    }
                                                >
                                                    {!data.parsed.legacy
                                                        .outgoingTx &&
                                                        !addressesInContactList.includes(
                                                            data.parsed.legacy
                                                                .replyAddress,
                                                        ) && (
                                                            <NotInContactsAlert>
                                                                Warning: This
                                                                sender is not in
                                                                your contact
                                                                list. Beware of
                                                                scams.
                                                            </NotInContactsAlert>
                                                        )}
                                                    {data.parsed.legacy
                                                        .isCashtabMessage ? (
                                                        <h4>
                                                            Cashtab Message{' '}
                                                        </h4>
                                                    ) : (
                                                        <h4>
                                                            External Message
                                                        </h4>
                                                    )}
                                                    {data.parsed.legacy
                                                        .isEncryptedMessage ? (
                                                        <EncryptionMessageLabel>
                                                            &nbsp;-&nbsp;Encrypted
                                                        </EncryptionMessageLabel>
                                                    ) : (
                                                        ''
                                                    )}
                                                    <br />
                                                    {cashtabSettings.hideMessagesFromUnknownSenders ? (
                                                        <>
                                                            {/*unencrypted OP_RETURN Message*/}
                                                            {data.parsed.legacy
                                                                .opReturnMessage &&
                                                                !data.parsed
                                                                    .legacy
                                                                    .isEncryptedMessage && (
                                                                    <>
                                                                        {!displayedMessage &&
                                                                        !data
                                                                            .parsed
                                                                            .legacy
                                                                            .outgoingTx &&
                                                                        !addressesInContactList.includes(
                                                                            data
                                                                                .parsed
                                                                                .legacy
                                                                                .replyAddress,
                                                                        ) ? (
                                                                            <ShowHideMessageButton
                                                                                onClick={e => {
                                                                                    e.stopPropagation();
                                                                                    handleShowMessage();
                                                                                }}
                                                                            >
                                                                                Show
                                                                            </ShowHideMessageButton>
                                                                        ) : (
                                                                            <>
                                                                                <p>
                                                                                    {' '}
                                                                                    {
                                                                                        data
                                                                                            .parsed
                                                                                            .legacy
                                                                                            .opReturnMessage
                                                                                    }
                                                                                </p>
                                                                                {!addressesInContactList.includes(
                                                                                    data
                                                                                        .parsed
                                                                                        .legacy
                                                                                        .replyAddress,
                                                                                ) &&
                                                                                    !data
                                                                                        .parsed
                                                                                        .legacy
                                                                                        .outgoingTx && (
                                                                                        <ShowHideMessageButton
                                                                                            onClick={e => {
                                                                                                e.stopPropagation();
                                                                                                handleShowMessage();
                                                                                            }}
                                                                                        >
                                                                                            Hide
                                                                                        </ShowHideMessageButton>
                                                                                    )}
                                                                            </>
                                                                        )}
                                                                    </>
                                                                )}
                                                            {data.parsed.legacy
                                                                .opReturnMessage &&
                                                                data.parsed
                                                                    .legacy
                                                                    .isEncryptedMessage && (
                                                                    <>
                                                                        {!displayedMessage &&
                                                                        !data
                                                                            .parsed
                                                                            .legacy
                                                                            .outgoingTx &&
                                                                        !addressesInContactList.includes(
                                                                            data
                                                                                .parsed
                                                                                .legacy
                                                                                .replyAddress,
                                                                        ) ? (
                                                                            <ShowHideMessageButton
                                                                                onClick={e => {
                                                                                    e.stopPropagation();
                                                                                    handleShowMessage();
                                                                                }}
                                                                            >
                                                                                Show
                                                                            </ShowHideMessageButton>
                                                                        ) : (
                                                                            <>
                                                                                <DecryptedMessage
                                                                                    authorized={
                                                                                        data
                                                                                            .parsed
                                                                                            .legacy
                                                                                            .decryptionSuccess
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        data
                                                                                            .parsed
                                                                                            .legacy
                                                                                            .opReturnMessage
                                                                                    }
                                                                                </DecryptedMessage>
                                                                                {!addressesInContactList.includes(
                                                                                    data
                                                                                        .parsed
                                                                                        .legacy
                                                                                        .replyAddress,
                                                                                ) &&
                                                                                    // do not render 'Hide' button if msg cannot be decrypted
                                                                                    data
                                                                                        .parsed
                                                                                        .legacy
                                                                                        .decryptionSuccess && (
                                                                                        <ShowHideMessageButton
                                                                                            onClick={e => {
                                                                                                e.stopPropagation();
                                                                                                handleShowMessage();
                                                                                            }}
                                                                                        >
                                                                                            Hide
                                                                                        </ShowHideMessageButton>
                                                                                    )}
                                                                            </>
                                                                        )}
                                                                    </>
                                                                )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/*unencrypted OP_RETURN Message*/}
                                                            {data.parsed.legacy
                                                                .opReturnMessage &&
                                                            !data.parsed.legacy
                                                                .isEncryptedMessage ? (
                                                                <p>
                                                                    {
                                                                        data
                                                                            .parsed
                                                                            .legacy
                                                                            .opReturnMessage
                                                                    }
                                                                </p>
                                                            ) : (
                                                                ''
                                                            )}
                                                            {/*encrypted and wallet is authorized to view OP_RETURN Message*/}
                                                            {data.parsed.legacy
                                                                .opReturnMessage &&
                                                            data.parsed.legacy
                                                                .isEncryptedMessage &&
                                                            data.parsed.legacy
                                                                .decryptionSuccess ? (
                                                                <p>
                                                                    {
                                                                        data
                                                                            .parsed
                                                                            .legacy
                                                                            .opReturnMessage
                                                                    }
                                                                </p>
                                                            ) : (
                                                                ''
                                                            )}
                                                            {/*encrypted but wallet is not authorized to view OP_RETURN Message*/}
                                                            {data.parsed.legacy
                                                                .opReturnMessage &&
                                                            data.parsed.legacy
                                                                .isEncryptedMessage &&
                                                            !data.parsed.legacy
                                                                .decryptionSuccess ? (
                                                                <UnauthorizedDecryptionMessage>
                                                                    {
                                                                        data
                                                                            .parsed
                                                                            .legacy
                                                                            .opReturnMessage
                                                                    }
                                                                </UnauthorizedDecryptionMessage>
                                                            ) : (
                                                                ''
                                                            )}
                                                        </>
                                                    )}
                                                    {(!data.parsed.legacy
                                                        .outgoingTx &&
                                                        data.parsed.legacy
                                                            .replyAddress &&
                                                        addressesInContactList.includes(
                                                            data.parsed.legacy
                                                                .replyAddress,
                                                        )) ||
                                                    (!cashtabSettings.hideMessagesFromUnknownSenders &&
                                                        !data.parsed.legacy
                                                            .outgoingTx &&
                                                        data.parsed.legacy
                                                            .replyAddress &&
                                                        displayedMessage) ? (
                                                        <Link
                                                            to={{
                                                                pathname: `/send`,
                                                                state: {
                                                                    replyAddress:
                                                                        data
                                                                            .parsed
                                                                            .legacy
                                                                            .replyAddress,
                                                                },
                                                            }}
                                                        >
                                                            Reply
                                                        </Link>
                                                    ) : (
                                                        ''
                                                    )}
                                                </OpReturnType>
                                            </>
                                        )}
                                    </TxWrapper>
                                </>
                            }
                        >
                            <PanelCtn>
                                <CopyToClipboard
                                    data={data.txid}
                                    optionalOnCopyNotification={{
                                        title: 'Txid copied to clipboard',
                                        msg: `${data.txid}`,
                                    }}
                                >
                                    <DropdownButton>
                                        <DropdownIconWrapper>
                                            <TextLayer>Txid</TextLayer>

                                            <ThemedCopySolid />
                                        </DropdownIconWrapper>
                                    </DropdownButton>
                                </CopyToClipboard>
                                {data.parsed.legacy.opReturnMessage && (
                                    <CopyToClipboard
                                        data={
                                            data.parsed.legacy.opReturnMessage
                                        }
                                        optionalOnCopyNotification={{
                                            title: 'Cashtab message copied to clipboard',
                                            msg: `${data.parsed.legacy.opReturnMessage}`,
                                        }}
                                    >
                                        <DropdownButton>
                                            <DropdownIconWrapper>
                                                <TextLayer>Msg</TextLayer>
                                                <ThemedCopySolid />
                                            </DropdownIconWrapper>
                                        </DropdownButton>
                                    </CopyToClipboard>
                                )}
                                <TxLink
                                    key={data.txid}
                                    href={`${currency.blockExplorerUrl}/tx/${data.txid}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <DropdownButton>
                                        <DropdownIconWrapper>
                                            <TextLayer>
                                                View on e.cash
                                            </TextLayer>
                                            <ThemedLinkSolid />
                                        </DropdownIconWrapper>
                                    </DropdownButton>
                                </TxLink>
                                <TxLink
                                    key={`${data.txid}_receipt`}
                                    href={`${currency.pdfReceiptUrl}/${data.txid}.pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <DropdownButton>
                                        <DropdownIconWrapper>
                                            <TextLayer>Receipt</TextLayer>
                                            <ThemedPdfSolid />
                                        </DropdownIconWrapper>
                                    </DropdownButton>
                                </TxLink>
                                {!data.parsed.legacy.outgoingTx &&
                                    data.parsed.legacy.replyAddress &&
                                    !addressesInContactList.includes(
                                        data.parsed.legacy.replyAddress,
                                    ) && (
                                        <AddToContacts>
                                            <DropdownButton>
                                                <Link
                                                    to={{
                                                        pathname: `/configure`,
                                                        state: {
                                                            contactToAdd:
                                                                data.parsed
                                                                    .legacy
                                                                    .replyAddress,
                                                        },
                                                    }}
                                                >
                                                    <DropdownIconWrapper>
                                                        <TextLayer>
                                                            Add to contacts
                                                        </TextLayer>
                                                        <ThemedContactsOutlined />
                                                    </DropdownIconWrapper>
                                                </Link>
                                            </DropdownButton>
                                        </AddToContacts>
                                    )}
                            </PanelCtn>
                        </Panel>
                    </Collapse>
                </AntdContextCollapseWrapper>
            )}
        </>
    );
};

Tx.propTypes = {
    data: PropTypes.object,
    fiatPrice: PropTypes.number,
    fiatCurrency: PropTypes.string,
    addressesInContactList: PropTypes.arrayOf(PropTypes.string),
    contactList: PropTypes.arrayOf(
        PropTypes.shape({
            address: PropTypes.string,
            name: PropTypes.string,
        }),
    ),
    cashtabSettings: PropTypes.oneOfType([
        PropTypes.shape({
            fiatCurrency: PropTypes.string,
            sendModal: PropTypes.bool,
            autoCameraOn: PropTypes.bool,
            hideMessagesFromUnknownSenders: PropTypes.bool,
        }),
        PropTypes.bool,
    ]),
};

export default Tx;
