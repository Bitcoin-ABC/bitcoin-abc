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
    AirdropIcon,
    AliasIcon,
} from 'components/Common/CustomIcons';
import { formatBalance, formatDate } from 'utils/formatting';
import TokenIcon from 'components/Etokens/TokenIcon';
import { Collapse } from 'antd';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import {
    ThemedCopySolid,
    ThemedLinkSolid,
    ThemedPdfSolid,
} from 'components/Common/CustomIcons';
import { explorer } from 'config/explorer';
import { supportedFiatCurrencies } from 'config/cashtabSettings';
import appConfig from 'config/app';

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

const AirdropSentTx = styled(TxIcon)`
    fill: ${props => props.theme.contrast};
`;

const AirdropReceivedTx = styled(TxIcon)`
    svg {
        fill: ${props => props.theme.eCashBlue};
    }
    border-color: ${props => props.theme.eCashBlue};
`;

const AirdropTokenInfoCtn = styled.div`
    flex-grow: 3;

    h4 {
        font-size: 10px;
        color: ${props => props.theme.lightWhite};
        margin: 0;
        margin-top: 5px;
    }
`;

const GenesisTx = styled(TxIcon)`
    border-color: ${props => props.theme.genesisGreen};
    svg {
        fill: ${props => props.theme.genesisGreen};
    }
`;
const AliasRegistrationTx = styled(TxIcon)`
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
        justify-content: left;
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
        width: 100%;
        margin-bottom: 10px;
        word-break: break-word;
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

const TxInfo = styled.div`
    text-align: right;
    display: flex;
    align-items: left;
    flex-direction: column;
    margin-left: 10px;
    flex-grow: 1;
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

const TokenName = styled.div`
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    margin: 0px;
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

const NotInContactsAlert = styled.div`
    color: ${props => props.theme.forms.error} !important;
    font-style: italic;
`;

const ReceivedFromCtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: left;
    gap: 2px;
    h4 {
        margin-top: 2.5px;
    }
`;

const Tx = ({
    data,
    fiatPrice,
    fiatCurrency,
    contactList,
    cashtabSettings,
    cashtabCache,
}) => {
    const [displayedMessage, setDisplayedMessage] = useState(false);
    const handleShowMessage = () => {
        setDisplayedMessage(!displayedMessage);
    };
    let txDate, txTime;
    if (data.timeFirstSeen === '0') {
        // If chronik does not have a timeFirstSeen for this tx
        if (!('block' in data)) {
            // If it is also unconfirmed, we have nothing to go on here
            // Do not render txDate or txTime
            txDate = false;
            txTime = false;
        } else {
            // If it is confirmed, use the block timestamp
            txDate = formatDate(data.block.timestamp, navigator.language);
            txTime = new Date(
                parseInt(`${data.block.timestamp}000`),
            ).toLocaleTimeString();
        }
    } else {
        // If it is unconfirmed and we have data.timeFirstSeen, use that
        txDate = formatDate(data.timeFirstSeen, navigator.language);
        txTime = new Date(
            parseInt(`${data.timeFirstSeen}000`),
        ).toLocaleTimeString();
    }

    const knownContact = contactList.find(
        contact => contact.address === data.parsed.replyAddress,
    );
    const fromKnownSender = typeof knownContact !== 'undefined';

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
                        {typeof txTime === 'string' && ` at ${txTime}`}
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
                                        {!data.parsed.incoming ? (
                                            <>
                                                {data.parsed.isEtokenTx &&
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
                                                    <>
                                                        {data.parsed
                                                            .airdropFlag ? (
                                                            <AirdropSentTx>
                                                                <AirdropIcon />
                                                            </AirdropSentTx>
                                                        ) : data.parsed
                                                              .aliasFlag ? (
                                                            <AliasRegistrationTx>
                                                                <AliasIcon />
                                                            </AliasRegistrationTx>
                                                        ) : (
                                                            <SentTx>
                                                                <SendIcon />
                                                            </SentTx>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {data.parsed.airdropFlag ? (
                                                    <AirdropReceivedTx>
                                                        <AirdropIcon />
                                                    </AirdropReceivedTx>
                                                ) : (
                                                    <ReceivedTx>
                                                        <ReceiveIcon />
                                                    </ReceivedTx>
                                                )}
                                            </>
                                        )}

                                        <LeftTextCtn data-testid="left-txt-ctn">
                                            {!data.parsed.incoming ? (
                                                <>
                                                    {data.parsed.isEtokenTx &&
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
                                                                : data.parsed
                                                                      .airdropFlag
                                                                ? 'Airdrop'
                                                                : data.parsed
                                                                      .aliasFlag
                                                                ? 'Alias'
                                                                : 'Sent'}
                                                        </h3>
                                                    )}
                                                </>
                                            ) : (
                                                <ReceivedFromCtn>
                                                    <ReceivedHeader>
                                                        {data.parsed.airdropFlag
                                                            ? 'Airdrop'
                                                            : 'Received'}
                                                    </ReceivedHeader>

                                                    {fromKnownSender && (
                                                        <h4>
                                                            from{' '}
                                                            {knownContact.name}
                                                        </h4>
                                                    )}
                                                </ReceivedFromCtn>
                                            )}
                                            <h4>
                                                {txDate}
                                                {typeof txTime === 'string' &&
                                                    ` at ${txTime}`}
                                            </h4>
                                        </LeftTextCtn>
                                        {data.parsed.isEtokenTx ? (
                                            <TokenInfo
                                                outgoing={!data.parsed.incoming}
                                            >
                                                {data.parsed.isEtokenTx &&
                                                data.parsed.slpMeta ? (
                                                    <>
                                                        <TxTokenIcon>
                                                            <TokenIcon
                                                                size={32}
                                                                tokenId={
                                                                    data.parsed
                                                                        .slpMeta
                                                                        .tokenId
                                                                }
                                                            />
                                                        </TxTokenIcon>
                                                        {!data.parsed
                                                            .incoming ? (
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
                                                {data.parsed.airdropFlag && (
                                                    <AirdropTokenInfoCtn>
                                                        <TokenIcon
                                                            size={32}
                                                            tokenId={
                                                                data.parsed
                                                                    .airdropTokenId
                                                            }
                                                        />
                                                        {cashtabCache &&
                                                            Object.keys(
                                                                cashtabCache.tokenInfoById,
                                                            ).includes(
                                                                data.parsed
                                                                    .airdropTokenId,
                                                            ) && (
                                                                <h4>
                                                                    {cashtabCache
                                                                        .tokenInfoById[
                                                                        data
                                                                            .parsed
                                                                            .airdropTokenId
                                                                    ] &&
                                                                        cashtabCache
                                                                            .tokenInfoById[
                                                                            data
                                                                                .parsed
                                                                                .airdropTokenId
                                                                        ]
                                                                            .tokenName}
                                                                </h4>
                                                            )}
                                                    </AirdropTokenInfoCtn>
                                                )}
                                                <TxInfo
                                                    outgoing={
                                                        !data.parsed.incoming
                                                    }
                                                >
                                                    {!data.parsed.incoming ? (
                                                        <>
                                                            <h3>
                                                                -
                                                                {formatBalance(
                                                                    data.parsed
                                                                        .xecAmount,
                                                                )}{' '}
                                                                {
                                                                    appConfig.ticker
                                                                }
                                                            </h3>
                                                            {fiatPrice !==
                                                                null &&
                                                                !isNaN(
                                                                    data.parsed
                                                                        .xecAmount,
                                                                ) && (
                                                                    <h4>
                                                                        -
                                                                        {
                                                                            supportedFiatCurrencies[
                                                                                fiatCurrency
                                                                            ]
                                                                                .symbol
                                                                        }
                                                                        {(
                                                                            data
                                                                                .parsed
                                                                                .xecAmount *
                                                                            fiatPrice
                                                                        ).toFixed(
                                                                            2,
                                                                        )}{' '}
                                                                        {
                                                                            supportedFiatCurrencies.fiatCurrency
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
                                                                        .xecAmount,
                                                                )}{' '}
                                                                {
                                                                    appConfig.ticker
                                                                }
                                                            </TokenTxAmtReceived>
                                                            {fiatPrice !==
                                                                null &&
                                                                !isNaN(
                                                                    data.parsed
                                                                        .xecAmount,
                                                                ) && (
                                                                    <h4>
                                                                        +
                                                                        {
                                                                            supportedFiatCurrencies[
                                                                                fiatCurrency
                                                                            ]
                                                                                .symbol
                                                                        }
                                                                        {(
                                                                            data
                                                                                .parsed
                                                                                .xecAmount *
                                                                            fiatPrice
                                                                        ).toFixed(
                                                                            2,
                                                                        )}{' '}
                                                                        {
                                                                            supportedFiatCurrencies.fiatCurrency
                                                                        }
                                                                    </h4>
                                                                )}
                                                        </>
                                                    )}
                                                </TxInfo>
                                            </>
                                        )}
                                        {data.parsed.opReturnMessage && (
                                            <>
                                                <OpReturnType
                                                    received={
                                                        data.parsed.incoming
                                                    }
                                                    aria-expanded={
                                                        cashtabSettings.hideMessagesFromUnknownSenders
                                                            ? displayedMessage
                                                            : false
                                                    }
                                                >
                                                    {data.parsed.incoming &&
                                                        !fromKnownSender && (
                                                            <NotInContactsAlert>
                                                                Warning: This
                                                                sender is not in
                                                                your contact
                                                                list. Beware of
                                                                scams.
                                                            </NotInContactsAlert>
                                                        )}
                                                    {data.parsed
                                                        .isCashtabMessage ? (
                                                        <h4>
                                                            Cashtab Message{' '}
                                                        </h4>
                                                    ) : data.parsed
                                                          .aliasFlag ? (
                                                        <h4>
                                                            Alias Registration
                                                        </h4>
                                                    ) : (
                                                        <h4>
                                                            External Message
                                                        </h4>
                                                    )}
                                                    {data.parsed
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
                                                            {data.parsed
                                                                .opReturnMessage &&
                                                                !data.parsed
                                                                    .isEncryptedMessage && (
                                                                    <>
                                                                        {!displayedMessage &&
                                                                        data
                                                                            .parsed
                                                                            .incoming &&
                                                                        !fromKnownSender ? (
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
                                                                                            .opReturnMessage
                                                                                    }
                                                                                </p>
                                                                                {!fromKnownSender &&
                                                                                    data
                                                                                        .parsed
                                                                                        .incoming && (
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
                                                            {data.parsed
                                                                .opReturnMessage &&
                                                                data.parsed
                                                                    .isEncryptedMessage && (
                                                                    <>
                                                                        {!displayedMessage &&
                                                                        data
                                                                            .parsed
                                                                            .incoming &&
                                                                        !fromKnownSender ? (
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
                                                                                    {
                                                                                        data
                                                                                            .parsed
                                                                                            .opReturnMessage
                                                                                    }
                                                                                </p>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/*unencrypted OP_RETURN Message*/}
                                                            {data.parsed
                                                                .opReturnMessage &&
                                                            !data.parsed
                                                                .isEncryptedMessage ? (
                                                                <p>
                                                                    {
                                                                        data
                                                                            .parsed
                                                                            .opReturnMessage
                                                                    }
                                                                </p>
                                                            ) : (
                                                                ''
                                                            )}
                                                        </>
                                                    )}
                                                    {(!cashtabSettings.hideMessagesFromUnknownSenders &&
                                                        data.parsed.incoming &&
                                                        data.parsed
                                                            .replyAddress) ||
                                                    (cashtabSettings.hideMessagesFromUnknownSenders &&
                                                        displayedMessage) ||
                                                    (fromKnownSender &&
                                                        data.parsed.incoming &&
                                                        data.parsed
                                                            .replyAddress) ? (
                                                        <Link
                                                            data-testid="cashtab-msg-reply"
                                                            to="/send"
                                                            state={{
                                                                replyAddress:
                                                                    data.parsed
                                                                        .replyAddress,
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
                                {data.parsed.opReturnMessage && (
                                    <CopyToClipboard
                                        data={data.parsed.opReturnMessage}
                                        optionalOnCopyNotification={{
                                            title: 'Cashtab message copied to clipboard',
                                            msg: `${data.parsed.opReturnMessage}`,
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
                                    href={`${explorer.blockExplorerUrl}/tx/${data.txid}`}
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
                                    href={`${explorer.pdfReceiptUrl}/${data.txid}.pdf`}
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
                                {!!data.parsed.incoming &&
                                    data.parsed.replyAddress &&
                                    !fromKnownSender && (
                                        <AddToContacts>
                                            <DropdownButton>
                                                <Link
                                                    data-testid="add-to-contacts-btn"
                                                    to="/configure"
                                                    state={{
                                                        contactToAdd:
                                                            data.parsed
                                                                .replyAddress,
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
    contactList: PropTypes.arrayOf(
        PropTypes.shape({
            address: PropTypes.string,
            name: PropTypes.string,
        }),
    ),
    cashtabCache: PropTypes.object,
    cashtabSettings: PropTypes.oneOfType([
        PropTypes.shape({
            fiatCurrency: PropTypes.string,
            sendModal: PropTypes.bool,
            autoCameraOn: PropTypes.bool,
            hideMessagesFromUnknownSenders: PropTypes.bool,
            toggleShowHideBalance: PropTypes.bool,
        }),
        PropTypes.bool,
    ]),
};

export default Tx;
