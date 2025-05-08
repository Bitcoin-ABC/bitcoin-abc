// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { getWalletsForNewActiveWallet } from 'wallet';
import WalletHeaderActions from 'components/Common/WalletHeaderActions';
import CashtabSettings, {
    supportedFiatCurrencies,
} from 'config/CashtabSettings';
import { CashtabWallet } from 'wallet';
import { UpdateCashtabState } from 'wallet/useWallet';
import CashtabState from 'config/CashtabState';
import appConfig from 'config/app';
import Cashtab from 'assets/cashtab_xec.png';
import PopOut from 'assets/popout.png';
import { toXec } from 'wallet';
import { FIRMA } from 'constants/tokens';
import Ecash from 'assets/ecash.png';
import Staking from 'assets/staking.png';
import Savings from 'assets/savings.png';
import {
    HeaderCtn,
    WalletDropdown,
    WalletSelectCtn,
    Price,
    LabelCtn,
    MobilePrice,
    MobileHeader,
    ExtenstionButton,
    WalletOption,
    BalanceXec,
    BalanceCard,
    BalanceRow,
    BalanceTitle,
    BackgroundImage,
    BalanceFiat,
    CardWrapper,
} from './styled';

interface HeaderProps {
    wallets: CashtabWallet[];
    settings: CashtabSettings;
    updateCashtabState: UpdateCashtabState;
    setCashtabState: React.Dispatch<React.SetStateAction<CashtabState>>;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    fiatPrice: null | number;
    userLocale?: string;
    path: string;
    balanceSats: number;
    /** In decimalized XECX */
    balanceXecx: number;
    /** In decimalized firma */
    balanceFirma: number;
    firmaPrice: null | number;
}

const Header: React.FC<HeaderProps> = ({
    wallets,
    updateCashtabState,
    setCashtabState,
    loading,
    setLoading,
    fiatPrice = null,
    userLocale = 'en-US',
    path,
    balanceSats,
    balanceXecx,
    balanceFirma,
    settings = new CashtabSettings(),
    firmaPrice = null,
}) => {
    const address = wallets[0].paths.get(1899).address;

    const handleSelectWallet = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const walletName = e.target.value;

        // Get the active wallet by name
        const walletToActivate = wallets.find(
            wallet => wallet.name === walletName,
        );

        if (typeof walletToActivate === 'undefined') {
            return;
        }

        // Get desired wallets array after activating walletToActivate
        const walletsAfterActivation = getWalletsForNewActiveWallet(
            walletToActivate,
            wallets,
        );
        /**
         * Update state
         * useWallet.ts has a useEffect that will then sync this new
         * active wallet with the network and update it in storage
         *
         * We also setLoading(true) on a wallet change, because we want
         * to prevent rapid wallet cycling
         *
         * setLoading(false) is called after the wallet is updated in useWallet.ts
         */
        setLoading(true);
        setCashtabState(prevState => ({
            ...prevState,
            wallets: walletsAfterActivation,
        }));
    };

    // If navigator.language is undefined, default to en-US
    userLocale = typeof userLocale === 'undefined' ? 'en-US' : userLocale;

    const renderFiatValues =
        typeof fiatPrice === 'number' && typeof firmaPrice === 'number';

    // Display exchange rate formatted for user's browser locale
    const formattedExchangeRate = renderFiatValues
        ? fiatPrice.toLocaleString(userLocale, {
              minimumFractionDigits: appConfig.pricePrecisionDecimals,
              maximumFractionDigits: appConfig.pricePrecisionDecimals,
          })
        : undefined;

    const formatBalance = (amount: number, decimals: number) =>
        amount.toLocaleString(userLocale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });

    const formatFiat = (amount: number, price: number) =>
        (amount * price).toLocaleString(userLocale, {
            minimumFractionDigits: appConfig.fiatDecimals,
            maximumFractionDigits: appConfig.fiatDecimals,
        });

    const balanceXec = toXec(balanceSats);

    const formattedBalanceXec = formatBalance(
        balanceXec,
        appConfig.cashDecimals,
    );
    const formattedBalanceXecx = formatBalance(
        balanceXecx,
        appConfig.cashDecimals,
    );
    const formattedBalanceFirma = formatBalance(
        balanceFirma,
        FIRMA.token.genesisInfo.decimals,
    );

    const formattedXECBalanceFiat = renderFiatValues
        ? formatFiat(balanceXec, fiatPrice)
        : undefined;

    const formattedXECXBalanceFiat = renderFiatValues
        ? formatFiat(balanceXecx, fiatPrice)
        : undefined;

    const formattedFIRMABalanceFiat = renderFiatValues
        ? formatFiat(balanceFirma, firmaPrice)
        : undefined;

    type AssetBalanceCardProps = {
        title: string;
        logo: string;
        logoAlt: string;
        tokenLabel: string;
        balanceAmount: string;
        fiatAmount: string | undefined;
        balanceVisible: boolean;
    };

    const AssetBalanceCard = ({
        title,
        logo,
        logoAlt,
        tokenLabel,
        balanceAmount,
        fiatAmount,
        balanceVisible,
    }: AssetBalanceCardProps) => {
        return (
            <BalanceCard tokenLabel={tokenLabel}>
                <BackgroundImage src={logo} alt={logoAlt} />
                <BalanceTitle tokenLabel={tokenLabel}>{title}</BalanceTitle>

                <BalanceRow
                    title={`Balance ${tokenLabel}`}
                    hideBalance={balanceVisible}
                    tokenLabel={tokenLabel}
                >
                    {balanceAmount}{' '}
                    {tokenLabel === 'FIRMA' ? (
                        <a href={`#/token/${FIRMA.tokenId}`}>{tokenLabel}</a>
                    ) : tokenLabel === 'XECX' ? (
                        <a href={`#/token/${appConfig.vipTokens.xecx.tokenId}`}>
                            XECX
                        </a>
                    ) : (
                        <>{tokenLabel}</>
                    )}
                </BalanceRow>
                {renderFiatValues && (
                    <BalanceFiat
                        balanceVisible={balanceVisible}
                        title={`Balance ${tokenLabel} Fiat`}
                    >
                        {supportedFiatCurrencies[settings.fiatCurrency].symbol}
                        {fiatAmount}&nbsp;
                        {supportedFiatCurrencies[
                            settings.fiatCurrency
                        ].slug.toUpperCase()}
                    </BalanceFiat>
                )}
            </BalanceCard>
        );
    };

    return (
        <HeaderCtn title="Wallet Info">
            <MobileHeader>
                <img src={Cashtab} alt="cashtab" />
                {renderFiatValues && (
                    <MobilePrice title="Price in Local Currency mobile">
                        1 {appConfig.ticker} = {formattedExchangeRate}{' '}
                        {settings.fiatCurrency.toUpperCase()}
                    </MobilePrice>
                )}
            </MobileHeader>
            <LabelCtn>
                {renderFiatValues && (
                    <Price title="Price in Local Currency">
                        1 {appConfig.ticker} = {formattedExchangeRate}{' '}
                        {settings.fiatCurrency.toUpperCase()}
                    </Price>
                )}
                <WalletSelectCtn>
                    {process.env.REACT_APP_BUILD_ENV === 'extension' && (
                        <ExtenstionButton
                            data-tip="Open in tab"
                            onClick={() => window.open(`index.html#${path}`)}
                        >
                            <img src={PopOut} alt="Open in tab" />
                        </ExtenstionButton>
                    )}
                    <WalletHeaderActions
                        address={address}
                        settings={settings}
                        updateCashtabState={updateCashtabState}
                    />
                    <WalletDropdown
                        name="wallets"
                        id="wallets"
                        data-testid="wallet-select"
                        onChange={e => handleSelectWallet(e)}
                        value={wallets[0].name}
                        disabled={loading}
                    >
                        {wallets.map((wallet, index) => (
                            <WalletOption key={index} value={wallet.name}>
                                {wallet.name}
                            </WalletOption>
                        ))}
                    </WalletDropdown>
                </WalletSelectCtn>
            </LabelCtn>
            <CardWrapper>
                <BalanceXec>
                    <AssetBalanceCard
                        title="eCash"
                        logo={Ecash}
                        logoAlt="eCash"
                        tokenLabel={appConfig.ticker}
                        balanceAmount={formattedBalanceXec}
                        fiatAmount={formattedXECBalanceFiat}
                        balanceVisible={settings.balanceVisible === false}
                    />
                    <AssetBalanceCard
                        title="Staking"
                        logo={Staking}
                        logoAlt="eCash Staking"
                        tokenLabel="XECX"
                        balanceAmount={formattedBalanceXecx}
                        fiatAmount={formattedXECXBalanceFiat}
                        balanceVisible={settings.balanceVisible === false}
                    />
                    <AssetBalanceCard
                        title="Savings"
                        logo={Savings}
                        logoAlt="Savings"
                        tokenLabel="FIRMA"
                        balanceAmount={formattedBalanceFirma}
                        fiatAmount={formattedFIRMABalanceFiat}
                        balanceVisible={settings.balanceVisible === false}
                    />
                </BalanceXec>
            </CardWrapper>
        </HeaderCtn>
    );
};

export default Header;
