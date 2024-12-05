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
import { PrimaryLink, SecondaryLink } from 'components/Common/Buttons';
import { Input } from 'components/Common/Inputs';
import Switch from 'components/Common/Switch';

const EtokensCtn = styled.div`
    color: ${props => props.theme.primaryText};
    width: 100%;
    background-color: ${props => props.theme.primaryBackground};
    padding: 20px;
    border-radius: 10px;
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

const SwitchRowFlex = styled.div`
    width: 100%;
    flex-wrap: wrap;
    display: flex;
    flex-direction: row;
    justify-content: center;
`;
export const SwitchCol = styled.div`
    display: flex;
    gap: 3px;
    align-content: center;
    align-items: center;
    margin: 12px 3px;
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

    // Tokens the user filters out with switches
    // This can impact the subset of searchable tokens
    const [userFilteredTokens, setUserFilteredTokens] = useState(null);

    // renderedTokens is a subset of userFilteredTokens,
    // filtered by the user's search query AND user switch selections
    const [renderedTokens, setRenderedTokens] = useState(null);

    const switchesOff = {
        showAll: false,
        showCollections: false,
        showNfts: false,
        showFungibleTokens: false,
    };
    const [switches, setSwitches] = useState({ ...switchesOff, showAll: true });

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

        // Initialize userFilteredTokens as all tokens (screen loads with all switches on)
        setUserFilteredTokens(walletTokensKeyValueArray);

        // Initialize rendered tokens as all tokens
        setRenderedTokens(walletTokensKeyValueArray);
    }, [tokens]);

    useEffect(() => {
        if (tokensInWallet === null) {
            return;
        }
        // Adjust userFilteredTokens according to switch
        let activeSwitch;
        for (const switchCondition of Object.keys(switches)) {
            if (switches[switchCondition]) {
                activeSwitch = switchCondition;
            }
        }
        let renderedTokensAfterSwitch = tokensInWallet;
        switch (activeSwitch) {
            case 'showAll': {
                // Do nothing, renderedTokensAfterSwitch is already all
                break;
            }
            case 'showCollections': {
                renderedTokensAfterSwitch = tokensInWallet.filter(
                    kv => kv[1].tokenType.type === 'SLP_TOKEN_TYPE_NFT1_GROUP',
                );
                break;
            }
            case 'showNfts': {
                renderedTokensAfterSwitch = tokensInWallet.filter(
                    kv => kv[1].tokenType.type === 'SLP_TOKEN_TYPE_NFT1_CHILD',
                );
                break;
            }
            case 'showFungibleTokens': {
                renderedTokensAfterSwitch = tokensInWallet.filter(
                    kv =>
                        kv[1].tokenType.type === 'SLP_TOKEN_TYPE_FUNGIBLE' ||
                        kv[1].tokenType.protocol === 'ALP',
                );
                break;
            }
            default: {
                // Do nothing, default should be same as showAll
                break;
            }
        }

        return setUserFilteredTokens(renderedTokensAfterSwitch);
    }, [switches]);

    useEffect(() => {
        if (userFilteredTokens === null) {
            return;
        }
        let newRenderedTokens = userFilteredTokens;
        // When userFilteredTokens changes, we are changing the searchable set of tokens
        // If the user happens to have a search string typed, we need to search this new subset and
        // adjust renderedTokens accordingly
        // Re-run search, if we have a search query
        if (tokenSearch !== '') {
            newRenderedTokens = newRenderedTokens.filter(
                kv =>
                    kv[1].genesisInfo.tokenName
                        .toLowerCase()
                        .includes(tokenSearch) ||
                    kv[1].genesisInfo.tokenTicker
                        .toLowerCase()
                        .includes(tokenSearch),
            );
        }
        setRenderedTokens(newRenderedTokens);
    }, [userFilteredTokens]);

    const handleTokenSearchInput = e => {
        const { value } = e.target;
        setTokenSearch(value);

        // make the search case insensitive
        const searchString = value.toLowerCase();

        // Get the tokens that include this search string in ticker or name
        const searchFilteredTokens = userFilteredTokens.filter(
            kv =>
                kv[1].genesisInfo.tokenName
                    .toLowerCase()
                    .includes(searchString) ||
                kv[1].genesisInfo.tokenTicker
                    .toLowerCase()
                    .includes(searchString),
        );

        // Only render tokens that appear in searchFilteredTokens
        setRenderedTokens(searchFilteredTokens);
    };
    return (
        <>
            {loading || renderedTokens === null ? (
                <LoadingCtn title="Loading tokens" />
            ) : (
                <EtokensCtn title="Wallet Tokens">
                    <ButtonHolder title="Create eToken">
                        <PrimaryLink to="/create-token">
                            Create eToken
                        </PrimaryLink>
                    </ButtonHolder>
                    <ButtonHolder title="Create NFT Collection">
                        <SecondaryLink
                            to="/create-nft-collection"
                            state={{ createNftCollection: true }}
                        >
                            Create NFT Collection
                        </SecondaryLink>
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
                            <SwitchRowFlex>
                                <SwitchCol>
                                    <Switch
                                        name="Toggle All"
                                        on="All"
                                        off="All"
                                        checked={switches.showAll}
                                        disabled={switches.showAll}
                                        // handleToggle is only available if the switch is off
                                        handleToggle={() =>
                                            setSwitches({
                                                ...switchesOff,
                                                showAll: true,
                                            })
                                        }
                                    />
                                </SwitchCol>
                                <SwitchCol>
                                    <Switch
                                        name="Toggle Collections"
                                        on="Collections"
                                        off="Collections"
                                        width={140}
                                        right={105}
                                        checked={switches.showCollections}
                                        handleToggle={() => {
                                            if (switches.showCollections) {
                                                setSwitches({
                                                    ...switchesOff,
                                                    showAll: true,
                                                });
                                            } else {
                                                setSwitches({
                                                    ...switchesOff,
                                                    showCollections: true,
                                                });
                                            }
                                        }}
                                    />
                                </SwitchCol>
                                <SwitchCol>
                                    <Switch
                                        name="Toggle NFTs"
                                        on="NFTs"
                                        off="NFTs"
                                        width={80}
                                        right={45}
                                        checked={switches.showNfts}
                                        handleToggle={() => {
                                            if (switches.showNfts) {
                                                setSwitches({
                                                    ...switchesOff,
                                                    showAll: true,
                                                });
                                            } else {
                                                setSwitches({
                                                    ...switchesOff,
                                                    showNfts: true,
                                                });
                                            }
                                        }}
                                    />
                                </SwitchCol>
                                <SwitchCol>
                                    <Switch
                                        name="Toggle Fungible Tokens"
                                        on="eTokens"
                                        off="eTokens"
                                        width={110}
                                        right={75}
                                        checked={switches.showFungibleTokens}
                                        handleToggle={() => {
                                            if (switches.showFungibleTokens) {
                                                setSwitches({
                                                    ...switchesOff,
                                                    showAll: true,
                                                });
                                            } else {
                                                setSwitches({
                                                    ...switchesOff,
                                                    showFungibleTokens: true,
                                                });
                                            }
                                        }}
                                    />
                                </SwitchCol>
                            </SwitchRowFlex>
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
