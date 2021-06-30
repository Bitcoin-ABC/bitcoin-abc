import React from 'react';
import styled from 'styled-components';
import {
    ArrowUpOutlined,
    ArrowDownOutlined,
    ExperimentOutlined,
} from '@ant-design/icons';
import { currency } from '@components/Common/Ticker';
import makeBlockie from 'ethereum-blockies-base64';
import { Img } from 'react-image';
import { formatBalance, fromLegacyDecimals } from '@utils/cashMethods';

const SentTx = styled(ArrowUpOutlined)`
    color: ${props => props.theme.secondary} !important;
`;
const ReceivedTx = styled(ArrowDownOutlined)`
    color: ${props => props.theme.primary} !important;
`;
const GenesisTx = styled(ExperimentOutlined)`
    color: ${props => props.theme.primary} !important;
`;
const DateType = styled.div`
    text-align: left;
    padding: 12px;
    @media screen and (max-width: 500px) {
        font-size: 0.8rem;
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
    border-radius: 3px;
    background: ${props => props.theme.tokenListItem.background};
    margin-bottom: 3px;
    box-shadow: ${props => props.theme.tokenListItem.boxShadow};
    border: 1px solid ${props => props.theme.tokenListItem.border};

    :hover {
        border-color: ${props => props.theme.primary};
    }
    @media screen and (max-width: 500px) {
        grid-template-columns: 24px 30% 50%;
        padding: 12px 12px;
    }
`;

const Tx = ({ data, fiatPrice }) => {
    const txDate =
        typeof data.blocktime === 'undefined'
            ? new Date().toLocaleDateString()
            : new Date(data.blocktime * 1000).toLocaleDateString();

    return (
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
                                        src={`${currency.tokenIconsUrl}/${data.tokenInfo.tokenId}.png`}
                                        unloader={
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
                                                {data.tokenInfo.tokenTicker}
                                            </TokenTxAmt>
                                            <TokenName>
                                                {data.tokenInfo.tokenName}
                                            </TokenName>
                                        </>
                                    ) : (
                                        <>
                                            <TokenTxAmt>
                                                -{' '}
                                                {data.tokenInfo.qtySent.toString()}
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
                                <>
                                    <TokenTxAmt>
                                        +{' '}
                                        {data.tokenInfo.qtyReceived.toString()}
                                        &nbsp;{data.tokenInfo.tokenTicker}
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
                                )}
                                {currency.ticker}
                                <br />
                                {fiatPrice !== null &&
                                    !isNaN(data.amountSent) && (
                                        <TxFiatPrice>
                                            - $
                                            {(
                                                fromLegacyDecimals(
                                                    data.amountSent,
                                                ) * fiatPrice
                                            ).toFixed(2)}{' '}
                                            USD
                                        </TxFiatPrice>
                                    )}
                            </>
                        ) : (
                            <>
                                +{' '}
                                {formatBalance(
                                    fromLegacyDecimals(data.amountReceived),
                                )}
                                {currency.ticker}
                                <br />
                                {fiatPrice !== null &&
                                    !isNaN(data.amountReceived) && (
                                        <TxFiatPrice>
                                            + $
                                            {(
                                                fromLegacyDecimals(
                                                    data.amountReceived,
                                                ) * fiatPrice
                                            ).toFixed(2)}{' '}
                                            USD
                                        </TxFiatPrice>
                                    )}
                            </>
                        )}
                    </TxInfo>
                </>
            )}
        </TxWrapper>
    );
};

export default Tx;
