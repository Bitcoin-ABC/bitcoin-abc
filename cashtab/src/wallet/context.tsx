// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import useWallet, { UseWalletReturnType } from 'wallet/useWallet';
import { ChronikClient } from 'chronik-client';
import { Agora } from 'ecash-agora';
import { Ecc } from 'ecash-lib';

export function isWalletContextLoaded(
    context: UseWalletReturnType | NullDefaultUseWalletReturnType,
): context is UseWalletReturnType {
    return (
        context !== undefined &&
        'chronik' in context &&
        'agora' in context &&
        'ecc' in context &&
        'chaintipBlockheight' in context &&
        'fiatPrice' in context &&
        'cashtabLoaded' in context &&
        'loading' in context &&
        'apiError' in context &&
        'refreshAliases' in context &&
        'aliases' in context &&
        'setAliases' in context &&
        'aliasServerError' in context &&
        'setAliasServerError' in context &&
        'aliasPrices' in context &&
        'setAliasPrices' in context &&
        'updateCashtabState' in context &&
        'processChronikWsMsg' in context &&
        'cashtabState' in context
    );
}

interface NullDefaultUseWalletReturnType {
    chronik: undefined;
    agora: undefined;
    ecc: undefined;
    chaintipBlockheight: undefined;
    fiatPrice: undefined;
    cashtabLoaded: undefined;
    loading: undefined;
    apiError: undefined;
    refreshAliases: undefined;
    aliases: undefined;
    setAliases: undefined;
    aliasServerError: undefined;
    setAliasServerError: undefined;
    aliasPrices: undefined;
    setAliasPrices: undefined;
    updateCashtabState: undefined;
    processChronikWsMsg: undefined;
    cashtabState: undefined;
}

const nullDefaultUseWalletReturnType: NullDefaultUseWalletReturnType = {
    chronik: undefined,
    agora: undefined,
    ecc: undefined,
    chaintipBlockheight: undefined,
    fiatPrice: undefined,
    cashtabLoaded: undefined,
    loading: undefined,
    apiError: undefined,
    refreshAliases: undefined,
    aliases: undefined,
    setAliases: undefined,
    aliasServerError: undefined,
    setAliasServerError: undefined,
    aliasPrices: undefined,
    setAliasPrices: undefined,
    updateCashtabState: undefined,
    processChronikWsMsg: undefined,
    cashtabState: undefined,
};

export const WalletContext = React.createContext<
    UseWalletReturnType | NullDefaultUseWalletReturnType
>(nullDefaultUseWalletReturnType);

interface WalletProviderProps {
    chronik: ChronikClient;
    agora: Agora;
    ecc: Ecc;
    children: React.ReactNode;
}
export const WalletProvider: React.FC<WalletProviderProps> = ({
    chronik,
    agora,
    ecc,
    children,
}) => {
    return (
        <WalletContext.Provider value={useWallet(chronik, agora, ecc)}>
            {children}
        </WalletContext.Provider>
    );
};
