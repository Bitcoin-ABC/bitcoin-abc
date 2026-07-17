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
    TitleTicker,
    BalanceFiat,
    StakedPercent,
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
    /** Whole card navigates here (e.g. XECX or Firma token page). */
    to: string;
    /** When set, shown under fiat as "X% staked" (eCash total includes XECX). */
    stakedPercentLabel?: string;
    /**
     * Put ticker on the title line (smaller) instead of after the amount.
     * Used for eCash — title already says eCash, so "XEC" after the number is
     * redundant.
     */
    tickerInTitle?: boolean;
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
    to,
    stakedPercentLabel,
    tickerInTitle = false,
}: AssetBalanceCardProps) => {
    return (
        <BalanceCard to={to} tokenLabel={tokenLabel}>
            <BalanceTitle tokenLabel={tokenLabel}>
                {logo}
                {title}
                {tickerInTitle && <TitleTicker>{tokenLabel}</TitleTicker>}
            </BalanceTitle>

            <BalanceRow
                title={`Balance ${tokenLabel}`}
                hideBalance={balanceVisible}
                tokenLabel={tokenLabel}
            >
                {balanceAmount}
                {!tickerInTitle && <> {tokenLabel}</>}
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
            {typeof stakedPercentLabel === 'string' && (
                <StakedPercent balanceVisible={balanceVisible} title="Staked">
                    {stakedPercentLabel} staked
                </StakedPercent>
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
 * Balance cards with count-roll animation on total XEC (incl. staked XECX)
 * and Firma Alpha when balances change (e.g. incoming websocket tx +
 * notification). Isolated so useCountRoll mounts only after the wallet is
 * loaded.
 *
 * XECX is staked XEC (1:1). There is no separate XECX card — the eCash card
 * shows XEC + XECX as the total and the staked share of that total as a %.
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

    const rolledTotalXec = rolledXec + rolledXecx;
    const stakedPercent =
        rolledTotalXec > 0 ? (100 * rolledXecx) / rolledTotalXec : 0;

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

    const formatStakedPercent = (percent: number) =>
        `${percent.toLocaleString(userLocale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
        })}%`;

    return (
        <BalanceXec>
            <AssetBalanceCard
                title="eCash"
                logo={<EcashIcon />}
                tokenLabel={appConfig.ticker}
                balanceAmount={formatBalance(
                    rolledTotalXec,
                    appConfig.cashDecimals,
                )}
                fiatAmount={
                    renderFiatValues
                        ? formatFiat(rolledTotalXec, fiatPrice)
                        : undefined
                }
                balanceVisible={balanceVisible}
                renderFiatValues={renderFiatValues}
                fiatCurrency={fiatCurrency}
                to={`/token/${appConfig.vipTokens.xecx.tokenId}`}
                stakedPercentLabel={formatStakedPercent(stakedPercent)}
                tickerInTitle
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
                to={`/token/${FIRMA.tokenId}`}
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
