import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {
    ArrowUpOutlined,
    ArrowDownOutlined,
    ExperimentOutlined,
    ExclamationOutlined,
} from '@ant-design/icons';
import { currency } from '@components/Common/Ticker';
import makeBlockie from 'ethereum-blockies-base64';
import { Img } from 'react-image';
import { fromLegacyDecimals } from '@utils/cashMethods';
import { formatBalance, formatDate } from '@utils/formatting';
const SentTx = styled(ArrowUpOutlined)`
    color: ${props => props.theme.secondary} !important;
`;
const ReceivedTx = styled(ArrowDownOutlined)`
    color: ${props => props.theme.primary} !important;
`;
const GenesisTx = styled(ExperimentOutlined)`
    color: ${props => props.theme.primary} !important;
`;
const UnparsedTx = styled(ExclamationOutlined)`
    color: ${props => props.theme.primary} !important;
`;
const DateType = styled.div`
    text-align: left;
    padding: 12px;
    @media screen and (max-width: 500px) {
        font-size: 0.8rem;
    }
`;
const OpReturnType = styled.span`
    text-align: left;
    width: 300%;
    max-height: 200px;
    padding: 3px;
    margin: auto;
    word-break: break-word;
    padding-left: 13px;
    padding-right: 30px;
    /* invisible scrollbar */
    overflow: hidden;
    height: 100%;
    margin-right: -50px; /* Maximum width of scrollbar */
    padding-right: 50px; /* Maximum width of scrollbar */
    overflow-y: scroll;
    ::-webkit-scrollbar {
        display: none;
    }
`;
const SentLabel = styled.span`
    font-weight: bold;
    color: ${props => props.theme.secondary} !important;
`;
const ReceivedLabel = styled.span`
    font-weight: bold;
    color: ${props => props.theme.primary} !important;
`;
const CashtabMessageLabel = styled.span`
    text-align: left;
    font-weight: bold;
    color: ${props => props.theme.primary} !important;
    white-space: nowrap;
`;
const EncryptionMessageLabel = styled.span`
    text-align: left;
    font-weight: bold;
    color: ${props => props.theme.wallet.encryption};
    white-space: nowrap;
`;
const UnauthorizedDecryptionMessage = styled.span`
    text-align: left;
    color: ${props => props.theme.wallet.encryption};
    white-space: nowrap;
    font-style: italic;
`;
const MessageLabel = styled.span`
    text-align: left;
    font-weight: bold;
    color: ${props => props.theme.secondary} !important;
    white-space: nowrap;
`;
const ReplyMessageLabel = styled.span`
    color: ${props => props.theme.primary} !important;
`;
const TxIcon = styled.div`
    svg {
        width: 32px;
        height: 32px;
    }
    height: 32px;
    width: 32px;
    @media screen and (max-width: 500px) {
        svg {
            width: 24px;
            height: 24px;
        }
        height: 24px;
        width: 24px;
    }
`;

const TxInfo = styled.div`
    padding: 12px;
    font-size: 1rem;
    text-align: right;

    color: ${props =>
        props.outgoing ? props.theme.secondary : props.theme.primary};

    @media screen and (max-width: 500px) {
        font-size: 0.8rem;
    }
`;
const TxFiatPrice = styled.span`
    font-size: 0.8rem;
`;
const TokenInfo = styled.div`
    display: grid;
    grid-template-rows: 50%;
    grid-template-columns: 24px auto;
    padding: 12px;
    font-size: 1rem;

    color: ${props =>
        props.outgoing ? props.theme.secondary : props.theme.primary};

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
const TokenTxAmt = styled.div`
    padding-left: 12px;
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;
const TokenName = styled.div`
    padding-left: 12px;
    font-size: 0.8rem;
    @media screen and (max-width: 500px) {
        font-size: 0.6rem;
    }
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const TxWrapper = styled.div`
    display: grid;
    grid-template-columns: 36px 30% 50%;

    justify-content: space-between;
    align-items: center;
    padding: 15px 25px;
    border-radius: 16px;
    background: ${props => props.theme.tokenListItem.background};
    margin-bottom: 12px;
    box-shadow: ${props => props.theme.tokenListItem.boxShadow};

    :hover {
        transform: translateY(-2px);
        box-shadow: rgb(136 172 243 / 25%) 0px 10px 30px,
            rgb(0 0 0 / 3%) 0px 1px 1px, rgb(0 51 167 / 10%) 0px 10px 20px;
        transition: all 0.8s cubic-bezier(0.075, 0.82, 0.165, 1) 0s;
    }
    @media screen and (max-width: 500px) {
        grid-template-columns: 24px 30% 50%;
        padding: 12px 12px;
    }
`;

const Tx = ({ data, fiatPrice, fiatCurrency }) => {
    const txDate =
        typeof data.blocktime === 'undefined'
            ? formatDate()
            : formatDate(data.blocktime, navigator.language);
    // if data only includes height and txid, then the tx could not be parsed by cashtab
    // render as such but keep link to block explorer
    let unparsedTx = false;
    if (!Object.keys(data).includes('outgoingTx')) {
        unparsedTx = true;
    }
    return (
        <>
            {unparsedTx ? (
                <TxWrapper>
                    <TxIcon>
                        <UnparsedTx />
                    </TxIcon>
                    <DateType>
                        <ReceivedLabel>Unparsed</ReceivedLabel>
                        <br />
                        {txDate}
                    </DateType>
                    <TxInfo>Open in Explorer</TxInfo>
                </TxWrapper>
            ) : (
                <TxWrapper>
                    <TxIcon>
                        {data.outgoingTx ? (
                            <>
                                {data.tokenTx &&
                                data.tokenInfo.transactionType === 'GENESIS' ? (
                                    <GenesisTx />
                                ) : (
                                    <SentTx />
                                )}
                            </>
                        ) : (
                            <ReceivedTx />
                        )}
                    </TxIcon>
                    <DateType>
                        {data.outgoingTx ? (
                            <>
                                {data.tokenTx &&
                                data.tokenInfo.transactionType === 'GENESIS' ? (
                                    <ReceivedLabel>Genesis</ReceivedLabel>
                                ) : (
                                    <SentLabel>Sent</SentLabel>
                                )}
                            </>
                        ) : (
                            <ReceivedLabel>Received</ReceivedLabel>
                        )}
                        <br />
                        {txDate}
                    </DateType>
                    {data.tokenTx ? (
                        <TokenInfo outgoing={data.outgoingTx}>
                            {data.tokenTx && data.tokenInfo ? (
                                <>
                                    <TxTokenIcon>
                                        {currency.tokenIconsUrl !== '' ? (
                                            <Img
                                                src={`${currency.tokenIconsUrl}/32/${data.tokenInfo.tokenId}.png`}
                                                unloader={
                                                    <img
                                                        alt={`identicon of tokenId ${data.tokenInfo.tokenId} `}
                                                        style={{
                                                            borderRadius: '50%',
                                                        }}
                                                        key={`identicon-${data.tokenInfo.tokenId}`}
                                                        src={makeBlockie(
                                                            data.tokenInfo
                                                                .tokenId,
                                                        )}
                                                    />
                                                }
                                            />
                                        ) : (
                                            <img
                                                alt={`identicon of tokenId ${data.tokenInfo.tokenId} `}
                                                style={{
                                                    borderRadius: '50%',
                                                }}
                                                key={`identicon-${data.tokenInfo.tokenId}`}
                                                src={makeBlockie(
                                                    data.tokenInfo.tokenId,
                                                )}
                                            />
                                        )}
                                    </TxTokenIcon>
                                    {data.outgoingTx ? (
                                        <>
                                            {data.tokenInfo.transactionType ===
                                            'GENESIS' ? (
                                                <>
                                                    <TokenTxAmt>
                                                        +{' '}
                                                        {data.tokenInfo.qtyReceived.toString()}
                                                        &nbsp;
                                                        {
                                                            data.tokenInfo
                                                                .tokenTicker
                                                        }
                                                    </TokenTxAmt>
                                                    <TokenName>
                                                        {
                                                            data.tokenInfo
                                                                .tokenName
                                                        }
                                                    </TokenName>
                                                </>
                                            ) : (
                                                <>
                                                    <TokenTxAmt>
                                                        -{' '}
                                                        {data.tokenInfo.qtySent.toString()}
                                                        &nbsp;
                                                        {
                                                            data.tokenInfo
                                                                .tokenTicker
                                                        }
                                                    </TokenTxAmt>
                                                    <TokenName>
                                                        {
                                                            data.tokenInfo
                                                                .tokenName
                                                        }
                                                    </TokenName>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <TokenTxAmt>
                                                +{' '}
                                                {data.tokenInfo.qtyReceived.toString()}
                                                &nbsp;
                                                {data.tokenInfo.tokenTicker}
                                            </TokenTxAmt>
                                            <TokenName>
                                                {data.tokenInfo.tokenName}
                                            </TokenName>
                                        </>
                                    )}
                                </>
                            ) : (
                                <span>Token Tx</span>
                            )}
                        </TokenInfo>
                    ) : (
                        <>
                            <TxInfo outgoing={data.outgoingTx}>
                                {data.outgoingTx ? (
                                    <>
                                        -{' '}
                                        {formatBalance(
                                            fromLegacyDecimals(data.amountSent),
                                        )}{' '}
                                        {currency.ticker}
                                        <br />
                                        {fiatPrice !== null &&
                                            !isNaN(data.amountSent) && (
                                                <TxFiatPrice>
                                                    -{' '}
                                                    {
                                                        currency.fiatCurrencies[
                                                            fiatCurrency
                                                        ].symbol
                                                    }
                                                    {(
                                                        fromLegacyDecimals(
                                                            data.amountSent,
                                                        ) * fiatPrice
                                                    ).toFixed(2)}{' '}
                                                    {
                                                        currency.fiatCurrencies
                                                            .fiatCurrency
                                                    }
                                                </TxFiatPrice>
                                            )}
                                    </>
                                ) : (
                                    <>
                                        +{' '}
                                        {formatBalance(
                                            fromLegacyDecimals(
                                                data.amountReceived,
                                            ),
                                        )}{' '}
                                        {currency.ticker}
                                        <br />
                                        {fiatPrice !== null &&
                                            !isNaN(data.amountReceived) && (
                                                <TxFiatPrice>
                                                    +{' '}
                                                    {
                                                        currency.fiatCurrencies[
                                                            fiatCurrency
                                                        ].symbol
                                                    }
                                                    {(
                                                        fromLegacyDecimals(
                                                            data.amountReceived,
                                                        ) * fiatPrice
                                                    ).toFixed(2)}{' '}
                                                    {
                                                        currency.fiatCurrencies
                                                            .fiatCurrency
                                                    }
                                                </TxFiatPrice>
                                            )}
                                    </>
                                )}
                            </TxInfo>
                        </>
                    )}
                    {data.opReturnMessage && (
                        <>
                            <br />
                            <OpReturnType>
                                {data.isCashtabMessage ? (
                                    <CashtabMessageLabel>
                                        Cashtab Message
                                    </CashtabMessageLabel>
                                ) : (
                                    <MessageLabel>
                                        External Message
                                    </MessageLabel>
                                )}
                                {data.isEncryptedMessage ? (
                                    <EncryptionMessageLabel>
                                        &nbsp;-&nbsp;Encrypted
                                    </EncryptionMessageLabel>
                                ) : (
                                    ''
                                )}
                                <br />
                                {/*unencrypted OP_RETURN Message*/}
                                {data.opReturnMessage &&
                                !data.isEncryptedMessage
                                    ? data.opReturnMessage
                                    : ''}
                                {/*encrypted and wallet is authorized to view OP_RETURN Message*/}
                                {data.opReturnMessage &&
                                data.isEncryptedMessage &&
                                data.decryptionSuccess
                                    ? data.opReturnMessage
                                    : ''}
                                {/*encrypted but wallet is not authorized to view OP_RETURN Message*/}
                                {data.opReturnMessage &&
                                data.isEncryptedMessage &&
                                !data.decryptionSuccess ? (
                                    <UnauthorizedDecryptionMessage>
                                        {data.opReturnMessage}
                                    </UnauthorizedDecryptionMessage>
                                ) : (
                                    ''
                                )}
                                {!data.outgoingTx && data.replyAddress ? (
                                    <Link
                                        to={{
                                            pathname: `/send`,
                                            state: {
                                                replyAddress: data.replyAddress,
                                            },
                                        }}
                                    >
                                        <br />
                                        <br />
                                        <ReplyMessageLabel>
                                            Reply To Message
                                        </ReplyMessageLabel>
                                    </Link>
                                ) : (
                                    ''
                                )}
                            </OpReturnType>
                        </>
                    )}
                </TxWrapper>
            )}
        </>
    );
};

Tx.propTypes = {
    data: PropTypes.object,
    fiatPrice: PropTypes.number,
    fiatCurrency: PropTypes.string,
};

export default Tx;
