import React from 'react';
import styled from 'styled-components';
import { UpCircleOutlined, DownCircleOutlined } from '@ant-design/icons';
import { currency } from '@components/Common/Ticker';

const SentTx = styled(UpCircleOutlined)`
    color: ${props => props.theme.secondary} !important;
`;
const ReceivedTx = styled(DownCircleOutlined)`
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

    color: ${props =>
        props.outgoing ? props.theme.secondary : props.theme.primary};

    @media screen and (max-width: 500px) {
        font-size: 0.8rem;
    }
`;

const TxWrapper = styled.div`
    display: grid;
    grid-template-columns: 36px 30% 50%;
    @media screen and (max-width: 500px) {
        grid-template-columns: 24px 30% 50%;
    }
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
`;

const Tx = ({ data }) => {
    const txDate =
        typeof data.blocktime === 'undefined'
            ? new Date().toLocaleDateString()
            : new Date(data.blocktime * 1000).toLocaleDateString();

    return (
        <TxWrapper>
            <TxIcon>{data.outgoingTx ? <SentTx /> : <ReceivedTx />}</TxIcon>
            <DateType>
                {data.outgoingTx ? (
                    <SentLabel>Sent</SentLabel>
                ) : (
                    <ReceivedLabel>Received</ReceivedLabel>
                )}
                <br />
                {txDate}
            </DateType>
            <TxInfo outgoing={data.outgoingTx}>
                {data.tokenTx ? (
                    <span>Token Tx</span>
                ) : (
                    <>
                        {data.outgoingTx
                            ? `- ${data.amountSent.toFixed(8)} ${
                                  currency.ticker
                              }`
                            : `+ ${data.amountReceived.toFixed(8)} ${
                                  currency.ticker
                              }`}
                    </>
                )}
            </TxInfo>
        </TxWrapper>
    );
};

export default Tx;
