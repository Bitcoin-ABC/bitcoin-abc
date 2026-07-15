// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useContext } from 'react';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import WalletHeaderActions from 'components/Common/WalletHeaderActions';
import { supportedFiatCurrencies } from 'config/CashtabSettings';
import { getUserLocale } from 'helpers';
import appConfig from 'config/app';
import PopOut from 'assets/popout.png';
import { toXec } from 'wallet';
import { FIRMA } from 'constants/tokens';
import { FIRMA_BALANCE_LABEL } from 'constants/tokenDisplayOverrides';
import { ReactComponent as EcashIcon } from 'assets/ecash-icon.svg';
import { ReactComponent as StakeIcon } from 'assets/stake.svg';
import { ReactComponent as SavingsIcon } from 'assets/dollar-sign.svg';
import { sortWalletsForDisplay } from 'wallet';
import { useCountRoll } from 'hooks/useCountRoll';
import { getCurrentReceiveAddress } from 'wallet/hd';
import {
    HeaderCtn,
    WalletDropdown,
    WalletSelectCtn,
    Price,
    LabelCtn,
    ExtenstionButton,
    WalletOption,
    BalanceXec,
    BalanceCard,
    BalanceRow,
    BalanceTitle,
    BalanceFiat,
    CardWrapper,
} from './styled';

interface HeaderProps {
    path: string;
}

type AssetBalanceCardProps = {
    title: string;
    logo: React.ReactNode;
    tokenLabel: string;
    balanceAmount: string;
    fiatAmount: string | undefined;
    balanceVisible: boolean;
    renderFiatValues: boolean;
    fiatCurrency: string;
};

const AssetBalanceCard = ({
    title,
    logo,
    tokenLabel,
    balanceAmount,
    fiatAmount,
    balanceVisible,
    renderFiatValues,
    fiatCurrency,
}: AssetBalanceCardProps) => {
    return (
        <BalanceCard tokenLabel={tokenLabel}>
            <BalanceTitle tokenLabel={tokenLabel}>
                {logo}
                {title}
            </BalanceTitle>

            <BalanceRow
                title={`Balance ${tokenLabel}`}
                hideBalance={balanceVisible}
                tokenLabel={tokenLabel}
            >
                {balanceAmount}{' '}
                {tokenLabel === FIRMA_BALANCE_LABEL ? (
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
                    {supportedFiatCurrencies[fiatCurrency].symbol}
                    {fiatAmount}&nbsp;
                    {supportedFiatCurrencies[fiatCurrency].slug.toUpperCase()}
                </BalanceFiat>
            )}
        </BalanceCard>
    );
};

interface BalanceCardsProps {
    balanceXec: number;
    balanceXecx: number;
    balanceFirma: number;
    fiatPrice: number | null;
    firmaPrice: number | null;
    balanceVisible: boolean;
    fiatCurrency: string;
    userLocale: string;
}

/**
 * Balance cards with count-roll animation on XEC / XECX / Firma Alpha
 * when balances change (e.g. incoming websocket tx + notification).
 * Isolated so useCountRoll mounts only after the wallet is loaded.
 */
const BalanceCards: React.FC<BalanceCardsProps> = ({
    balanceXec,
    balanceXecx,
    balanceFirma,
    fiatPrice,
    firmaPrice,
    balanceVisible,
    fiatCurrency,
    userLocale,
}) => {
    const rolledXec = useCountRoll(balanceXec);
    const rolledXecx = useCountRoll(balanceXecx);
    const rolledFirma = useCountRoll(balanceFirma);

    const renderFiatValues = typeof fiatPrice === 'number';

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

    return (
        <BalanceXec>
            <AssetBalanceCard
                title="eCash"
                logo={<EcashIcon />}
                tokenLabel={appConfig.ticker}
                balanceAmount={formatBalance(rolledXec, appConfig.cashDecimals)}
                fiatAmount={
                    renderFiatValues
                        ? formatFiat(rolledXec, fiatPrice)
                        : undefined
                }
                balanceVisible={balanceVisible}
                renderFiatValues={renderFiatValues}
                fiatCurrency={fiatCurrency}
            />
            <AssetBalanceCard
                title="Staked"
                logo={<StakeIcon />}
                tokenLabel="XECX"
                balanceAmount={formatBalance(
                    rolledXecx,
                    appConfig.cashDecimals,
                )}
                fiatAmount={
                    renderFiatValues
                        ? formatFiat(rolledXecx, fiatPrice)
                        : undefined
                }
                balanceVisible={balanceVisible}
                renderFiatValues={renderFiatValues}
                fiatCurrency={fiatCurrency}
            />
            <AssetBalanceCard
                title="USD"
                logo={<SavingsIcon />}
                tokenLabel={FIRMA_BALANCE_LABEL}
                balanceAmount={formatBalance(
                    rolledFirma,
                    FIRMA.token.genesisInfo.decimals,
                )}
                fiatAmount={
                    firmaPrice !== null
                        ? formatFiat(rolledFirma, firmaPrice)
                        : undefined
                }
                balanceVisible={balanceVisible}
                renderFiatValues={renderFiatValues}
                fiatCurrency={fiatCurrency}
            />
        </BalanceXec>
    );
};

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

    const balanceXec = toXec(Number(ecashWallet.balanceSats));
    const balanceXecx =
        Number(tokens.get(appConfig.vipTokens.xecx.tokenId)) || 0;
    const balanceFirma = Number(tokens.get(FIRMA.tokenId)) || 0;

    return (
        <HeaderCtn title="Wallet Info">
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
                        address={getCurrentReceiveAddress(ecashWallet)}
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
                <BalanceCards
                    key={activeWalletAddress}
                    balanceXec={balanceXec}
                    balanceXecx={balanceXecx}
                    balanceFirma={balanceFirma}
                    fiatPrice={fiatPrice}
                    firmaPrice={firmaPrice}
                    balanceVisible={settings.balanceVisible === false}
                    fiatCurrency={settings.fiatCurrency}
                    userLocale={userLocale}
                />
            </CardWrapper>
        </HeaderCtn>
    );
};

export default Header;
