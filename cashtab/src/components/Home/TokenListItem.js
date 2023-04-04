import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import TokenIcon from 'components/Tokens/TokenIcon';

const TokenIconWrapper = styled.div`
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
                <TokenIconWrapper>
                    <TokenIcon size={32} tokenId={tokenId} />
                </TokenIconWrapper>
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
