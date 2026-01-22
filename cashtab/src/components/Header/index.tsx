// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useContext } from 'react';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import WalletHeaderActions from 'components/Common/WalletHeaderActions';
import { supportedFiatCurrencies } from 'config/CashtabSettings';
import { getUserLocale } from 'helpers';
import appConfig from 'config/app';
import Cashtab from 'assets/cashtab_xec.png';
import PopOut from 'assets/popout.png';
import { toXec } from 'wallet';
import { FIRMA } from 'constants/tokens';
import Ecash from 'assets/ecash.png';
import Staking from 'assets/staking.png';
import Savings from 'assets/savings.png';
import { sortWalletsForDisplay } from 'wallet';
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
    path: string;
}

const Header: React.FC<HeaderProps> = ({ path }) => {
    const userLocale = getUserLocale(navigator);
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const {
        cashtabState,
        updateCashtabState,
        loading,
        setLoading,
        fiatPrice,
        firmaPrice,
        ecashWallet,
        getWalletByAddress,
    } = ContextValue;
    const { wallets, settings, tokens } = cashtabState;

    if (!ecashWallet || !tokens) {
        // Without an active wallet, all components except App, which renders Onboarding, are disabled
        return null;
    }

    const activeStoredWallet = getWalletByAddress(ecashWallet.address);
    if (!activeStoredWallet) {
        return null;
    }
    const activeWalletAddress = ecashWallet.address;

    const menuWallets = sortWalletsForDisplay(activeStoredWallet, wallets);

    const handleSelectWallet = async (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        const selectedWalletAddress = e.target.value;

        // Get the wallet to activate by name
        const walletToActivate = getWalletByAddress(selectedWalletAddress);

        if (walletToActivate === null) {
            return;
        }

        setLoading(true);
        try {
            // Update active wallet address in state (which also persists to storage)
            // This triggers the useEffect that calls initializeWallet()
            await updateCashtabState({
                activeWalletAddress: walletToActivate.address,
            });
        } catch (error) {
            console.error('Error switching wallet:', error);
            // Reset dropdown to previous value on error
            e.target.value = activeWalletAddress;
        } finally {
            setLoading(false);
        }
    };

    const renderFiatValues = typeof fiatPrice === 'number';

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

    const balanceXec = toXec(Number(ecashWallet.balanceSats));

    const formattedBalanceXec = formatBalance(
        balanceXec,
        appConfig.cashDecimals,
    );

    const balanceXecx =
        Number(tokens.get(appConfig.vipTokens.xecx.tokenId)) || 0;

    const formattedBalanceXecx = formatBalance(
        balanceXecx,
        appConfig.cashDecimals,
    );

    const balanceFirma = Number(tokens.get(FIRMA.tokenId)) || 0;

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

    const formattedFIRMABalanceFiat =
        firmaPrice !== null ? formatFiat(balanceFirma, firmaPrice) : undefined;

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
                {renderFiatValues ? (
                    <Price title="Price in Local Currency">
                        1 {appConfig.ticker} = {formattedExchangeRate}{' '}
                        {settings.fiatCurrency.toUpperCase()}
                    </Price>
                ) : (
                    <div>
                        {/** Render a placeholder if there is no price so we do not content jump the menu */}
                    </div>
                )}
                <WalletSelectCtn>
                    {import.meta.env.VITE_BUILD_ENV === 'extension' && (
                        <ExtenstionButton
                            data-tip="Open in tab"
                            onClick={() => window.open(`index.html#${path}`)}
                        >
                            <img src={PopOut} alt="Open in tab" />
                        </ExtenstionButton>
                    )}
                    <WalletHeaderActions
                        address={ecashWallet.address}
                        settings={settings}
                        updateCashtabState={updateCashtabState}
                    />
                    <WalletDropdown
                        name="wallets"
                        id="wallets"
                        data-testid="wallet-select"
                        onChange={e => handleSelectWallet(e)}
                        value={activeWalletAddress}
                        disabled={loading}
                    >
                        {menuWallets.map((wallet, index) => (
                            <WalletOption key={index} value={wallet.address}>
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
