import React from 'react';
import styled from 'styled-components';
import makeBlockie from 'ethereum-blockies-base64';
import { Img } from 'react-image';
import { currency } from '@components/Common/Ticker';

const TokenIcon = styled.div`
    height: 32px;
    width: 32px;
`;

const BalanceAndTicker = styled.div`
    font-size: 1rem;
`;

const Wrapper = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 25px;
    border-radius: 3px;
    background: #ffffff;
    margin-bottom: 3px;
    box-shadow: rgba(0, 0, 0, 0.01) 0px 0px 1px, rgba(0, 0, 0, 0.04) 0px 4px 8px,
        rgba(0, 0, 0, 0.04) 0px 16px 24px, rgba(0, 0, 0, 0.01) 0px 24px 32px;
    border: 1px solid #e9eaed;

    :hover {
        border-color: #5ebd6d;
    }
`;

const TokenListItem = ({ ticker, balance, tokenId }) => {
    return (
        <Wrapper>
            <TokenIcon>
                {currency.tokenIconsUrl !== '' ? (
                    <Img
                        src={`${currency.tokenIconsUrl}/${tokenId}.png`}
                        width={32}
                        height={32}
                        unloader={
                            <img
                                alt={`identicon of tokenId ${tokenId} `}
                                heigh="32"
                                width="32"
                                style={{
                                    borderRadius: '50%',
                                }}
                                key={`identicon-${tokenId}`}
                                src={makeBlockie(tokenId)}
                            />
                        }
                    />
                ) : (
                    <img
                        alt={`identicon of tokenId ${tokenId} `}
                        heigh="32"
                        width="32"
                        style={{
                            borderRadius: '50%',
                        }}
                        key={`identicon-${tokenId}`}
                        src={makeBlockie(tokenId)}
                    />
                )}
            </TokenIcon>
            <BalanceAndTicker>
                {balance} <strong>{ticker}</strong>
            </BalanceAndTicker>
        </Wrapper>
    );
};

export default TokenListItem;
