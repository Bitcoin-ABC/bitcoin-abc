// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import { LoadingCtn, SidePaddingCtn } from 'components/Common/Atoms';
import { Link } from 'react-router-dom';
import TokenList from './TokenList';
import { getWalletState } from 'utils/cashMethods';
import appConfig from 'config/app';

const EtokensCtn = styled.div`
    color: ${props => props.theme.contrast};
    width: 100%;
    h2 {
        margin: 0 0 20px;
        margin-top: 10px;
    }
`;

const CreateToken = styled(Link)`
    color: ${props => props.theme.contrast};
    border: 1px solid ${props => props.theme.contrast};
    padding: 8px 15px;
    border-radius: 5px;
    margin-top: 10px;
    margin-bottom: 20px;
    display: inline-block;
    width: 200px;
    :hover {
        background: ${props => props.theme.eCashPurple};
        border-color: ${props => props.theme.eCashPurple};
        color: ${props => props.theme.contrast};
    }
`;

const Etokens = () => {
    let navigate = useNavigate();
    const ContextValue = React.useContext(WalletContext);
    const { wallet, loading } = ContextValue;
    const walletState = getWalletState(wallet);
    const { tokens } = walletState;
    return (
        <>
            {loading ? (
                <LoadingCtn />
            ) : (
                <>
                    {wallet && wallet.Path1899 ? (
                        <EtokensCtn data-testid="etokens-ctn">
                            <br />
                            <SidePaddingCtn>
                                <CreateToken
                                    to={{
                                        pathname: `/create-token`,
                                    }}
                                >
                                    Create eToken
                                </CreateToken>
                                {tokens && tokens.length > 0 ? (
                                    <TokenList
                                        wallet={wallet}
                                        tokens={tokens}
                                    />
                                ) : (
                                    <p>
                                        Tokens sent to your{' '}
                                        {appConfig.tokenTicker} address will
                                        appear here
                                    </p>
                                )}
                            </SidePaddingCtn>
                        </EtokensCtn>
                    ) : (
                        // If no existing wallet detected, take user to the wallet creation screen
                        navigate('/wallet')
                    )}
                </>
            )}
        </>
    );
};

export default Etokens;
