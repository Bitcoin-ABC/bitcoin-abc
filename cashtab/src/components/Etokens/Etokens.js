// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import { LoadingCtn } from 'components/Common/Atoms';
import TokenList from './TokenList';
import { getWalletState } from 'utils/cashMethods';
import appConfig from 'config/app';
import { getUserLocale } from 'helpers';
import { PrimaryLink } from 'components/Common/PrimaryButton';

const EtokensCtn = styled.div`
    color: ${props => props.theme.contrast};
    width: 100%;
    h2 {
        margin: 0 0 20px;
        margin-top: 10px;
    }
    padding-top: 24px;
`;

const ButtonHolder = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
    justify-content: center;
`;
const Etokens = () => {
    const ContextValue = React.useContext(WalletContext);
    const { loading, cashtabState } = ContextValue;
    const { wallets, cashtabCache } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const walletState = getWalletState(wallet);
    const { tokens } = walletState;
    const userLocale = getUserLocale(navigator);
    return (
        <>
            {loading ? (
                <LoadingCtn />
            ) : (
                <EtokensCtn title="Wallet Tokens">
                    <ButtonHolder title="Create eToken">
                        <PrimaryLink
                            to={{
                                pathname: `/create-token`,
                            }}
                        >
                            Create eToken
                        </PrimaryLink>
                    </ButtonHolder>
                    {tokens && tokens.size > 0 ? (
                        <TokenList
                            tokens={tokens}
                            tokenCache={cashtabCache.tokens}
                            userLocale={userLocale}
                        />
                    ) : (
                        <p>
                            Tokens sent to your {appConfig.tokenTicker} address
                            will appear here
                        </p>
                    )}
                </EtokensCtn>
            )}
        </>
    );
};

export default Etokens;
