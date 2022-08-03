import * as React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { ThemedEditOutlined } from 'components/Common/CustomIcons';
import { Link } from 'react-router-dom';

const LabelCtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3%;
`;

const WalletName = styled.h4`
    font-size: 16px;
    display: inline-block;
    color: ${props => props.theme.lightWhite};
    margin-bottom: 2px;
    @media (max-width: 400px) {
        font-size: 16px;
    }
`;

const WalletLabel = ({ name }) => {
    return (
        <LabelCtn>
            {name && typeof name === 'string' && (
                <WalletName>{name}</WalletName>
            )}
            <Link
                to={{
                    pathname: `/configure`,
                    state: {
                        showRenameWalletModal: true,
                    },
                }}
            >
                <ThemedEditOutlined />
            </Link>
        </LabelCtn>
    );
};

WalletLabel.propTypes = {
    name: PropTypes.string,
};

export default WalletLabel;
