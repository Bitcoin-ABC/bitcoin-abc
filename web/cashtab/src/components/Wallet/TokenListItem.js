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
    background: ${props => props.theme.tokenListItem.background};
    margin-bottom: 3px;
    box-shadow: ${props => props.theme.tokenListItem.boxShadow};
    border: 1px solid ${props => props.theme.tokenListItem.border};

    :hover {
        border-color: ${props => props.theme.tokenListItem.hoverBorder};
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
