import * as React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { ThemedEditOutlined } from 'components/Common/CustomIcons';
import { Link } from 'react-router-dom';
import HideBalanceSwitch from './HideBalanceSwitch';
const LabelCtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3%;
    .ant-switch {
        margin-bottom: 5px;
    }
`;

const WalletName = styled.div`
    font-size: 16px;
    display: inline-block;
    color: ${props => props.theme.lightWhite};
    margin-bottom: 2px;
    @media (max-width: 400px) {
        font-size: 16px;
    }
`;

const WalletLabel = ({ name, cashtabSettings, changeCashtabSettings }) => {
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
            <HideBalanceSwitch
                cashtabSettings={cashtabSettings}
                changeCashtabSettings={changeCashtabSettings}
            />
        </LabelCtn>
    );
};

WalletLabel.propTypes = {
    name: PropTypes.string,
    cashtabSettings: PropTypes.oneOfType([
        PropTypes.shape({
            fiatCurrency: PropTypes.string,
            sendModal: PropTypes.bool,
            autoCameraOn: PropTypes.bool,
            hideMessagesFromUnknownSender: PropTypes.bool,
            toggleShowHideBalance: PropTypes.bool,
        }),
        PropTypes.bool,
    ]),
    changeCashtabSettings: PropTypes.func,
};

export default WalletLabel;
