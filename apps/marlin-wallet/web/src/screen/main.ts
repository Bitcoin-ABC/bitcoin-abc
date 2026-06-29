// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Navigation } from '../navigation';
import { AppSettings } from '../settings';
import { Wallet } from 'ecash-wallet';
import { CryptoTicker, formatPrice } from 'ecash-price';
import type { MarlinPriceFetcher } from '../price';
import {
    activeAssetDecimals,
    activeAssetDefinition,
    activeAssetTicker,
    activeCryptoTicker,
    activeQuoteCurrency,
    allowFiatForActiveAsset,
    formatActiveAssetAmount,
    setActiveAsset as commitActiveAsset,
} from '../active-asset';
import { coinIconUrlForAssetKey } from '../coin-icon-url';
import {
    SUPPORTED_ASSETS,
    XEC_ASSET,
    type AssetDefinition,
} from '../supported-assets';
import { atomsToUnit } from '../amount';
import { AddressManager, isValidECashAddress } from '../address-manager';
import {
    generateQRCode,
    startQRScanner,
    stopQRScanner,
    hideNoCameraFallback,
} from '../qrcode';
import { parseBip21Uri, Bip21ParseResult } from '../bip21';
import { webViewError, webViewLog } from '../common';

export interface MainScreenParams {
    ecashWallet: Wallet | null;
    addressManager: AddressManager;
    navigation: Navigation;
    appSettings: AppSettings;
    priceFetcher: MarlinPriceFetcher | null;
    /** Ticker used for primary crypto balance formatting */
    primaryBalanceTicker: CryptoTicker;
    /** Decimal places when showing the primary crypto amount */
    primaryBalanceDecimals: number;
    onQRScanResult: (result?: Bip21ParseResult) => Promise<void>;
    /** Sync wallet state after the user picks a different asset (e.g. TransactionManager + UTXOs). */
    onAssetSwitched: () => Promise<void>;
    /** Updates shared ticker labels (main + send) when the active asset changes. */
    refreshStaticTickerLabels: () => void;
}

interface UpdateBalanceElementParams {
    elementId: string;
    fromXec: number;
    // null means hide the balance element
    toXec: number | null;
    // null means show as XEC, otherwise show as Fiat
    pricePerXec: number | null;
    animate: boolean;
}

export class MainScreen {
    private params: MainScreenParams;
    private ui: {
        address: HTMLElement;
        qrCode: HTMLElement;
        primaryBalance: HTMLElement;
        secondaryBalance: HTMLElement;
        transitionalBalance: HTMLElement;
        scanBtn: HTMLButtonElement;
        manualEntryBtn: HTMLButtonElement;
        closeCameraBtn: HTMLButtonElement;
        cameraModal: HTMLElement;
        assetPickerBtn: HTMLButtonElement;
        assetPickerMenu: HTMLElement;
    };

    constructor(params: MainScreenParams) {
        this.params = params;
        this.assertUIElements();
        this.initializeEventListeners();
    }

    updateBalanceDisplayConfig(
        primaryBalanceTicker: CryptoTicker,
        primaryBalanceDecimals: number,
    ): void {
        this.params.primaryBalanceTicker = primaryBalanceTicker;
        this.params.primaryBalanceDecimals = primaryBalanceDecimals;
    }

    /**
     * Rebuild asset picker options from `SUPPORTED_ASSETS`.
     */
    private populateAssetPickerMenu(): void {
        const { assetPickerMenu: menu } = this.ui;
        menu.replaceChildren();
        for (const def of SUPPORTED_ASSETS) {
            const opt = document.createElement('button');
            opt.type = 'button';
            opt.className = 'asset-picker-option';
            opt.dataset.asset = def.key;
            opt.setAttribute('role', 'option');
            const assetLabel = `${def.displayName} (${def.ticker})`;
            const iconUrl = coinIconUrlForAssetKey(def.key);
            if (iconUrl) {
                const img = document.createElement('img');
                img.src = iconUrl;
                img.alt = assetLabel;
                img.className = 'asset-picker-coin-icon';
                img.decoding = 'async';
                opt.appendChild(img);
            }
            const label = document.createElement('span');
            label.textContent = assetLabel;
            opt.appendChild(label);
            menu.appendChild(opt);
        }
    }

    private setAssetPickerButtonContent(): void {
        const btn = this.ui.assetPickerBtn;
        btn.replaceChildren();
        const def = activeAssetDefinition();
        const assetLabel = `${def.displayName} (${def.ticker})`;
        const iconUrl = coinIconUrlForAssetKey(def.key);
        if (!iconUrl) {
            btn.setAttribute('aria-label', assetLabel);
            return;
        }
        btn.removeAttribute('aria-label');
        const img = document.createElement('img');
        img.src = iconUrl;
        img.alt = assetLabel;
        img.className = 'asset-picker-btn-icon';
        img.decoding = 'async';
        btn.appendChild(img);
    }

    /**
     * Wire the asset picker dropdown (main screen header).
     */
    initAssetPicker(): void {
        this.populateAssetPickerMenu();
        const { assetPickerBtn: btn, assetPickerMenu: menu } = this.ui;

        this.setAssetPickerButtonContent();

        btn.addEventListener('click', e => {
            e.stopPropagation();
            menu.classList.toggle('open');
        });
        document.addEventListener('click', () => {
            menu.classList.remove('open');
        });

        menu.addEventListener('click', async e => {
            e.stopPropagation();
            const opt = (e.target as HTMLElement).closest(
                '[data-asset]',
            ) as HTMLElement | null;
            if (!opt || !opt.dataset.asset) {
                return;
            }
            menu.classList.remove('open');
            const key = opt.dataset.asset;
            const def = SUPPORTED_ASSETS.find(a => a.key === key);
            if (!def) {
                // Should never happen
                return;
            }
            try {
                await this.setActiveAsset(def);
            } catch (error) {
                webViewError('Failed to switch asset:', error);
            }
        });
    }

    private async applyAssetSwitch(): Promise<void> {
        this.updateBalanceDisplayConfig(
            activeCryptoTicker(),
            activeAssetDecimals(),
        );
        this.params.refreshStaticTickerLabels();
        this.setAssetPickerButtonContent();
        await this.params.onAssetSwitched();
    }

    /**
     * Set the active asset and refresh main UI plus dependent services
     * (balances, picker, send labels).
     */
    async setActiveAsset(def: AssetDefinition): Promise<void> {
        commitActiveAsset({ def });
        await this.applyAssetSwitch();
    }

    // Update wallet reference and display (called when wallet is reloaded)
    async updateWallet(
        newWallet: Wallet | null,
        availableBalanceSats: number,
        transitionalBalanceSats: number,
    ): Promise<void> {
        this.params.ecashWallet = newWallet;
        this.params.addressManager.updateWallet(newWallet);

        if (!newWallet) {
            return;
        }

        this.updateAddressDisplay();

        const pricePerXec = allowFiatForActiveAsset()
            ? await this.params.priceFetcher?.current({
                  source: activeQuoteCurrency(),
                  quote: this.params.appSettings.fiatCurrency,
              })
            : null;

        this.updateAvailableBalanceDisplay(
            0,
            atomsToUnit(availableBalanceSats, activeAssetDecimals()),
            pricePerXec,
            false,
        );
        this.updateTransitionalBalance(transitionalBalanceSats, pricePerXec);
    }

    updateAddressDisplay(): void {
        const address = this.params.addressManager.getCurrentReceiveAddress();
        if (!address) {
            webViewError('Cannot get address from wallet');
            return;
        }

        this.ui.address.textContent = address;
        generateQRCode(address);
    }

    // Update available balance display with optional animation
    updateAvailableBalanceDisplay(
        fromXec: number,
        toXec: number,
        pricePerXec: number | null,
        animate: boolean = true,
    ): void {
        webViewLog(
            `Available balance updated from ${fromXec} ${activeAssetTicker()} to ${toXec} ${activeAssetTicker()}`,
        );

        this.updateBalanceElement({
            elementId: 'primary-balance',
            fromXec,
            toXec,
            // If primary balance type is XEC or price is not available, show as
            // XEC, otherwise show as Fiat
            pricePerXec:
                this.params.appSettings.primaryBalanceType === 'XEC'
                    ? null
                    : pricePerXec,
            animate,
        });
        this.updateBalanceElement({
            elementId: 'secondary-balance',
            fromXec,
            // If price is not available, hide the secondary balance element
            toXec: pricePerXec === null ? null : toXec,
            // If primary balance type is XEC show as Fiat, otherwise show as XEC
            pricePerXec:
                this.params.appSettings.primaryBalanceType === 'XEC'
                    ? pricePerXec
                    : null,
            animate,
        });
    }

    // Update transitional balance display
    updateTransitionalBalance(
        transitionalBalanceSats: number,
        pricePerXec: number | null,
    ): void {
        if (transitionalBalanceSats === 0) {
            this.ui.transitionalBalance.classList.add('hidden');
            return;
        }

        const type = transitionalBalanceSats > 0 ? 'receive' : 'spend';
        const transitionalXec = atomsToUnit(
            transitionalBalanceSats,
            activeAssetDecimals(),
        );

        const cryptoFormatOptions = {
            locale: this.params.appSettings.locale,
            decimals: this.params.primaryBalanceDecimals,
            alwaysShowSign: true,
        };
        const fiatFormatOptions = {
            locale: this.params.appSettings.locale,
            alwaysShowSign: true,
        };

        const displayText =
            this.params.appSettings.primaryBalanceType === 'XEC' ||
            pricePerXec === null
                ? formatActiveAssetAmount(transitionalXec, cryptoFormatOptions)
                : formatPrice(
                      transitionalXec * pricePerXec,
                      this.params.appSettings.fiatCurrency,
                      fiatFormatOptions,
                  );

        this.ui.transitionalBalance.textContent = displayText;
        this.ui.transitionalBalance.className = `transitional-balance ${type}`;
        this.ui.transitionalBalance.classList.remove('hidden');

        // Trigger shake animation when showing transitional balance
        this.ui.transitionalBalance.classList.add('shake');
        setTimeout(() => {
            this.ui.transitionalBalance.classList.remove('shake');
        }, 500);
    }

    // Private methods

    private assertUIElements(): void {
        this.ui = {
            address: document.getElementById('address') as HTMLElement,
            qrCode: document.getElementById('qr-code') as HTMLElement,
            primaryBalance: document.getElementById(
                'primary-balance',
            ) as HTMLElement,
            secondaryBalance: document.getElementById(
                'secondary-balance',
            ) as HTMLElement,
            transitionalBalance: document.getElementById(
                'transitional-balance',
            ) as HTMLElement,
            scanBtn: document.getElementById('scan-btn') as HTMLButtonElement,
            manualEntryBtn: document.getElementById(
                'manual-entry-btn',
            ) as HTMLButtonElement,
            closeCameraBtn: document.getElementById(
                'close-camera',
            ) as HTMLButtonElement,
            cameraModal: document.getElementById('camera-modal') as HTMLElement,
            assetPickerBtn: document.getElementById(
                'asset-picker-btn',
            ) as HTMLButtonElement,
            assetPickerMenu: document.getElementById(
                'asset-picker-menu',
            ) as HTMLElement,
        };

        if (
            !this.ui.address ||
            !this.ui.qrCode ||
            !this.ui.primaryBalance ||
            !this.ui.secondaryBalance ||
            !this.ui.transitionalBalance ||
            !this.ui.scanBtn ||
            !this.ui.manualEntryBtn ||
            !this.ui.closeCameraBtn ||
            !this.ui.cameraModal ||
            !this.ui.assetPickerBtn ||
            !this.ui.assetPickerMenu
        ) {
            webViewError('Missing required UI elements for main screen');
            throw new Error('Missing required UI elements for main screen');
        }
    }

    private initializeEventListeners(): void {
        // Address click listener for copying
        this.ui.address.addEventListener('click', () => {
            void this.params.addressManager.copyReceiveAddress();
        });

        // Scan button click listener
        this.ui.scanBtn.addEventListener('click', () => {
            this.handleScanButtonClick();
        });

        // Close camera button click listener
        this.ui.closeCameraBtn.addEventListener('click', () => {
            this.handleCloseCamera();
        });

        // Manual entry button click listener
        this.ui.manualEntryBtn.addEventListener('click', () => {
            this.handleManualEntryClick();
        });

        // Ensure camera modal starts hidden
        this.ui.cameraModal.classList.add('hidden');
        webViewLog('Camera modal initialized as hidden');
    }

    private handleScanButtonClick(): void {
        stopQRScanner();
        startQRScanner((result: string) => {
            this.handleQRScanResult(result);
        });
    }

    private async handleQRScanResult(result: string): Promise<void> {
        // First, try to parse as BIP21 URI
        const bip21Result = parseBip21Uri(result);
        if (!bip21Result.error) {
            webViewLog('BIP21 URI scanned:', result);
            stopQRScanner();
            await this.params.onQRScanResult(bip21Result);
            return;
        }

        // Fallback: validate if the scanned data is a plain valid eCash address
        if (isValidECashAddress(result)) {
            webViewLog('eCash address scanned:', result);
            stopQRScanner();
            await this.params.onQRScanResult({
                uri: result,
                address: result,
                tokenAssetKey: XEC_ASSET.key,
            });
            return;
        }
    }

    private handleCloseCamera(): void {
        stopQRScanner(true); // Force close the modal
        hideNoCameraFallback();
    }

    private async handleManualEntryClick(): Promise<void> {
        stopQRScanner(true); // Force close the modal
        hideNoCameraFallback();
        // Call onQRScanResult with no result to open send screen for manual entry
        await this.params.onQRScanResult();
    }

    private updateBalanceElement(params: UpdateBalanceElementParams): void {
        const { elementId, fromXec, toXec, pricePerXec, animate } = params;
        const balanceEl = document.getElementById(elementId) as HTMLElement;

        if (!balanceEl) {
            // This should never happen because elements are asserted in assertUIElements
            webViewError(
                `${elementId} not found, cannot update balance display`,
            );
            return;
        }

        // If toXec is null, hide the balance element
        if (toXec === null) {
            balanceEl.textContent = '';
            return;
        }

        // If pricePerXec is null show as XEC, otherwise show as Fiat
        const fromValue =
            pricePerXec === null ? fromXec : fromXec * pricePerXec;
        const toValue = pricePerXec === null ? toXec : toXec * pricePerXec;
        const formatValue =
            pricePerXec === null
                ? (value: number) => {
                      return formatActiveAssetAmount(value, {
                          locale: this.params.appSettings.locale,
                          decimals: this.params.primaryBalanceDecimals,
                      });
                  }
                : (value: number) => {
                      return formatPrice(
                          value,
                          this.params.appSettings.fiatCurrency,
                          { locale: this.params.appSettings.locale },
                      );
                  };

        if (animate) {
            this.animateBalanceChange(
                balanceEl,
                fromValue,
                toValue,
                formatValue,
            );
        } else {
            balanceEl.textContent = formatValue(toValue);
        }
    }

    // Animate balance change with counting effect
    private animateBalanceChange(
        balanceEl: HTMLElement,
        startValue: number,
        targetBalance: number,
        formatValue: (value: number) => string,
    ): void {
        const difference = targetBalance - startValue;
        const duration = 1000; // 1 second animation
        const startTime = Date.now();

        // Add highlight effect for balance changes
        if (Math.abs(difference) > 0.01) {
            // Only highlight if there's a meaningful change
            balanceEl.style.transition = 'all 0.3s ease';
            balanceEl.style.transform = 'scale(1.05)';
            balanceEl.style.color = difference > 0 ? '#4ade80' : '#f87171'; // Green for increase, red for decrease

            setTimeout(() => {
                balanceEl.style.transform = 'scale(1)';
                balanceEl.style.color = '';
            }, 300);
        }

        const updateBalance = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Use easing function for smooth animation
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentBalance = startValue + difference * easeOutCubic;

            balanceEl.textContent = formatValue(currentBalance);

            if (progress < 1) {
                requestAnimationFrame(updateBalance);
            } else {
                // Reset color after animation completes
                setTimeout(() => {
                    balanceEl.style.color = '';
                }, 200);
            }
        };

        requestAnimationFrame(updateBalance);
    }
}
