// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useContext, useState } from 'react';
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
import { platformInfo } from 'platform';
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
    BalanceCardPanel,
    BalanceRow,
    BalanceTitle,
    TitleTicker,
    BalanceFiat,
    StakedPercent,
    StakedLink,
    BalanceToggleArea,
    BalanceBreakdown,
    BreakdownAmount,
    BreakdownLabel,
    CardWrapper,
} from './styled';

/** App-wide react-tooltip id (see App.tsx). */
const CASHTAB_TOOLTIP_ID = 'cashtab-tooltip';

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
    /** Whole card navigates here (USD → Firma). */
    to: string;
    /**
     * When true, do not append tokenLabel after the balance amount (e.g. USD
     * card title already says USD).
     */
    hideAmountTicker?: boolean;
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
    hideAmountTicker = false,
}: AssetBalanceCardProps) => {
    const showFiatLine = renderFiatValues && typeof fiatAmount === 'string';

    return (
        <BalanceCard to={to} tokenLabel={tokenLabel}>
            <BalanceTitle tokenLabel={tokenLabel}>
                {logo}
                {title}
            </BalanceTitle>

            <BalanceRow
                title={`Balance ${tokenLabel}`}
                hideBalance={balanceVisible}
                tokenLabel={tokenLabel}
            >
                {balanceAmount}
                {!hideAmountTicker && <> {tokenLabel}</>}
            </BalanceRow>
            {showFiatLine && (
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

type EcashBalanceCardProps = {
    balanceVisible: boolean;
    renderFiatValues: boolean;
    fiatCurrency: string;
    fiatAmount: string | undefined;
    totalAmount: string;
    liquidAmount: string;
    stakedAmount: string;
    stakedPercentLabel: string;
    stakedHref: string;
    /** Stacked XEC/XECX HTML for web/extension hover tooltip. */
    breakdownTooltipHtml: string;
    /** Hover tooltip only on web/extension (Android uses tap-to-expand). */
    enableHoverTooltip: boolean;
    showBreakdown: boolean;
    onToggleBreakdown: () => void;
};

/**
 * eCash card: combined total + fiat + "% staked" by default. Tap (except the
 * "staked" link) replaces the total/fiat with stacked liquid XEC / XECX.
 * On web/extension, hover also shows a stacked XEC/XECX tooltip. The USD
 * card stays visible.
 */
const EcashBalanceCard = ({
    balanceVisible,
    renderFiatValues,
    fiatCurrency,
    fiatAmount,
    totalAmount,
    liquidAmount,
    stakedAmount,
    stakedPercentLabel,
    stakedHref,
    breakdownTooltipHtml,
    enableHoverTooltip,
    showBreakdown,
    onToggleBreakdown,
}: EcashBalanceCardProps) => {
    const showFiatLine =
        !showBreakdown && renderFiatValues && typeof fiatAmount === 'string';
    // Hover preview only while showing the combined total (not after expand).
    const showHoverTooltip =
        enableHoverTooltip && !showBreakdown && !balanceVisible;

    return (
        <BalanceCardPanel
            tokenLabel={appConfig.ticker}
            onClick={onToggleBreakdown}
            role="button"
            tabIndex={0}
            aria-label="Toggle XEC and XECX balances"
            onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleBreakdown();
                }
            }}
            data-tooltip-id={showHoverTooltip ? CASHTAB_TOOLTIP_ID : undefined}
            data-tooltip-html={
                showHoverTooltip ? breakdownTooltipHtml : undefined
            }
            data-tooltip-place="bottom"
        >
            <BalanceTitle tokenLabel={appConfig.ticker}>
                <EcashIcon />
                eCash
                <TitleTicker>{appConfig.ticker}</TitleTicker>
            </BalanceTitle>

            <BalanceToggleArea>
                {showBreakdown ? (
                    <BalanceBreakdown
                        balanceVisible={balanceVisible}
                        title="Liquid and staked"
                    >
                        <BreakdownAmount>{liquidAmount}</BreakdownAmount>
                        <BreakdownLabel>{appConfig.ticker}</BreakdownLabel>
                        <BreakdownAmount>{stakedAmount}</BreakdownAmount>
                        <BreakdownLabel>XECX</BreakdownLabel>
                    </BalanceBreakdown>
                ) : (
                    <>
                        <BalanceRow
                            title={`Balance ${appConfig.ticker}`}
                            hideBalance={balanceVisible}
                            tokenLabel={appConfig.ticker}
                        >
                            {totalAmount}
                        </BalanceRow>
                        {showFiatLine && (
                            <BalanceFiat
                                balanceVisible={balanceVisible}
                                title={`Balance ${appConfig.ticker} Fiat`}
                            >
                                {supportedFiatCurrencies[fiatCurrency].symbol}
                                {fiatAmount}&nbsp;
                                {supportedFiatCurrencies[
                                    fiatCurrency
                                ].slug.toUpperCase()}
                            </BalanceFiat>
                        )}
                    </>
                )}
            </BalanceToggleArea>
            <StakedPercent balanceVisible={balanceVisible} title="Staked">
                {stakedPercentLabel}{' '}
                <StakedLink
                    to={stakedHref}
                    onClick={(e: React.MouseEvent) => {
                        // Navigate to XECX; do not toggle breakdown.
                        e.stopPropagation();
                    }}
                    onKeyDown={(e: React.KeyboardEvent) => {
                        // Let the link handle Enter/Space; don't toggle the card.
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                        }
                    }}
                >
                    staked
                </StakedLink>
            </StakedPercent>
        </BalanceCardPanel>
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
 * XECX is staked XEC (1:1). The eCash card shows the combined total and a
 * "% staked" line (word links to XECX). Tapping the card replaces the
 * total/fiat with stacked liquid XEC / XECX; the USD card stays put. On
 * web/extension, hover shows the same stacked amounts in a tooltip.
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
    const [showBreakdown, setShowBreakdown] = useState(false);
    const enableHoverTooltip = platformInfo.platform !== 'capacitor-android';

    const rolledXec = useCountRoll(balanceXec);
    const rolledXecx = useCountRoll(balanceXecx);
    const rolledFirma = useCountRoll(balanceFirma);

    const rolledTotalXec = rolledXec + rolledXecx;
    const stakedPercent =
        rolledTotalXec > 0 ? (100 * rolledXecx) / rolledTotalXec : 0;

    const renderFiatValues = typeof fiatPrice === 'number';
    // Firma is USD-pegged; fiat conversion is redundant when local currency is USD.
    const showFirmaFiat = fiatCurrency !== 'usd';

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

    // Firma USD: 2 decimals above $0.01, else full token decimals for dust.
    const firmaDecimals =
        rolledFirma > 0.01 ? 2 : FIRMA.token.genesisInfo.decimals;
    const usdSymbol = supportedFiatCurrencies.usd.symbol;
    const firmaBalanceAmount = `${usdSymbol}${formatBalance(
        rolledFirma,
        firmaDecimals,
    )}`;

    const liquidLabel = formatBalance(rolledXec, appConfig.cashDecimals);
    const stakedLabel = formatBalance(rolledXecx, appConfig.cashDecimals);
    const breakdownTooltipHtml = `<div style="display:grid;grid-template-columns:max-content auto;column-gap:0.35em;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-variant-numeric:tabular-nums"><span style="text-align:right">${liquidLabel}</span><span>${appConfig.ticker}</span><span style="text-align:right">${stakedLabel}</span><span>XECX</span></div>`;

    const xecxHref = `/token/${appConfig.vipTokens.xecx.tokenId}`;

    return (
        <BalanceXec>
            <EcashBalanceCard
                balanceVisible={balanceVisible}
                renderFiatValues={renderFiatValues}
                fiatCurrency={fiatCurrency}
                fiatAmount={
                    renderFiatValues
                        ? formatFiat(rolledTotalXec, fiatPrice)
                        : undefined
                }
                totalAmount={formatBalance(
                    rolledTotalXec,
                    appConfig.cashDecimals,
                )}
                liquidAmount={liquidLabel}
                stakedAmount={stakedLabel}
                stakedPercentLabel={formatStakedPercent(stakedPercent)}
                stakedHref={xecxHref}
                breakdownTooltipHtml={breakdownTooltipHtml}
                enableHoverTooltip={enableHoverTooltip}
                showBreakdown={showBreakdown}
                onToggleBreakdown={() => setShowBreakdown(prev => !prev)}
            />
            <AssetBalanceCard
                title="USD"
                logo={<SavingsIcon />}
                tokenLabel={FIRMA_BALANCE_LABEL}
                balanceAmount={firmaBalanceAmount}
                fiatAmount={
                    showFirmaFiat && firmaPrice !== null
                        ? formatFiat(rolledFirma, firmaPrice)
                        : undefined
                }
                balanceVisible={balanceVisible}
                renderFiatValues={renderFiatValues && showFirmaFiat}
                fiatCurrency={fiatCurrency}
                to={`/token/${FIRMA.tokenId}`}
                hideAmountTicker
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
