// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import { LoadingCtn } from 'components/Common/Atoms';
import TokenList from './TokenList';
import { getWalletState } from 'utils/cashMethods';
import appConfig from 'config/app';
import { getUserLocale } from 'helpers';
import { PrimaryLink } from 'components/Common/Buttons';
import { Input } from 'components/Common/Inputs';

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

    const [tokenSearch, setTokenSearch] = useState('');
    // tokensInWallet is a key value array of the cashtab cache tokens Map,
    // except that it contains only the tokens in wallet.state.tokens,
    // and, in addition to cached info, it has the user's token balance
    const [tokensInWallet, setTokensInWallet] = useState(null);

    // renderedTokens is a subset of tokensInWallet, filtered by the user's search query
    const [renderedTokens, setRenderedTokens] = useState(null);

    useEffect(() => {
        // On page load, create a key value array of all the cached info for tokens you have in the wallet
        // Clone cashtab cache tokens
        const tokenMapWithBalance = new Map(cashtabCache.tokens);
        // Add balance to all cached tokens where balance info is available
        tokens.forEach((tokenBalance, tokenId) => {
            tokenMapWithBalance.set(tokenId, {
                ...tokenMapWithBalance.get(tokenId),
                balance: tokenBalance,
            });
        });

        // Convert to a keyValueArray so you can filter()
        const cacheKeyValueArray = [...tokenMapWithBalance];
        // Filter so you only have tokens with balance (or 0 balance and mint baton)
        const walletTokensKeyValueArray = cacheKeyValueArray.filter(kv =>
            tokens.has(kv[0]),
        );

        // Sort alphabetical by token ticker, since the ticker is what you render
        walletTokensKeyValueArray.sort((a, b) => {
            return a[1].genesisInfo.tokenTicker.localeCompare(
                b[1].genesisInfo.tokenTicker,
            );
        });
        setTokensInWallet(walletTokensKeyValueArray);

        // Initialize rendered  tokens as all tokens
        setRenderedTokens(walletTokensKeyValueArray);
    }, [wallet.state.tokens]);

    const handleTokenSearchInput = e => {
        const { value } = e.target;
        setTokenSearch(value);

        // make the search case insensitive
        const searchString = value.toLowerCase();

        // Get the tokensInWallet that include this search string in ticker or name
        const filteredTokensInWallet = tokensInWallet.filter(
            kv =>
                kv[1].genesisInfo.tokenName
                    .toLowerCase()
                    .includes(searchString) ||
                kv[1].genesisInfo.tokenTicker
                    .toLowerCase()
                    .includes(searchString),
        );

        // Only render tokens that appear in filteredTokensInWallet
        setRenderedTokens(filteredTokensInWallet);
    };
    return (
        <>
            {loading || renderedTokens === null ? (
                <LoadingCtn title="Loading tokens" />
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
                    {Array.isArray(tokensInWallet) &&
                    tokensInWallet.length > 0 ? (
                        <>
                            <Input
                                placeholder="Start typing a token ticker or name"
                                name="tokenSearch"
                                value={tokenSearch}
                                handleInput={handleTokenSearchInput}
                            />
                            {renderedTokens.length > 0 ? (
                                <TokenList
                                    tokensKvArray={renderedTokens}
                                    userLocale={userLocale}
                                />
                            ) : (
                                <p>No tokens matching {tokenSearch}</p>
                            )}
                        </>
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
