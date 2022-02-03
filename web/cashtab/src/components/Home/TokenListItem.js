import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import makeBlockie from 'ethereum-blockies-base64';
import { Img } from 'react-image';
import { currency } from '@components/Common/Ticker';

const TokenIcon = styled.div`
    height: 32px;
    width: 32px;
    margin-right: 10px;
`;

const TokenNameCtn = styled.div`
    display: flex;
    align-items: center;
`;

const Wrapper = styled.div`
    display: flex;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    color: ${props => props.theme.contrast};
    padding: 10px 0;
    justify-content: space-between;
    h4 {
        font-size: 16px;
        color: ${props => props.theme.contrast};
        margin: 0;
        font-weight: bold;
    }
    :hover {
        h4 {
            color: ${props => props.theme.eCashPurple};
        }
    }
`;

const TokenListItem = ({ ticker, balance, tokenId }) => {
    return (
        <Wrapper>
            <TokenNameCtn>
                <TokenIcon>
                    {currency.tokenIconsUrl !== '' ? (
                        <Img
                            src={`${currency.tokenIconsUrl}/32/${tokenId}.png`}
                            width={32}
                            height={32}
                            unloader={
                                <img
                                    alt={`identicon of tokenId ${tokenId} `}
                                    height="32"
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
                            height="32"
                            width="32"
                            style={{
                                borderRadius: '50%',
                            }}
                            key={`identicon-${tokenId}`}
                            src={makeBlockie(tokenId)}
                        />
                    )}
                </TokenIcon>
                <h4>{ticker}</h4>
            </TokenNameCtn>

            <h4>{balance}</h4>
        </Wrapper>
    );
};

TokenListItem.propTypes = {
    ticker: PropTypes.string,
    balance: PropTypes.string,
    tokenId: PropTypes.string,
};

export default TokenListItem;
