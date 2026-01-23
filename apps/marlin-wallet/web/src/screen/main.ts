// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Navigation } from '../navigation';
import { AppSettings } from '../settings';
import { Wallet } from 'ecash-wallet';
import { XECPrice, formatPrice } from 'ecash-price';
import { config } from '../config';
import { satsToXec } from '../amount';
import { copyAddress, isValidECashAddress } from '../address';
import { getAddress } from '../wallet';
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
    navigation: Navigation;
    appSettings: AppSettings;
    priceFetcher: XECPrice | null;
    onQRScanResult: (
        result?: Bip21ParseResult | { address: string },
    ) => Promise<void>;
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
    };

    constructor(params: MainScreenParams) {
        this.params = params;
        this.assertUIElements();
        this.initializeEventListeners();
    }

    // Update wallet reference and display (called when wallet is reloaded)
    async updateWallet(
        newWallet: Wallet | null,
        availableBalanceSats: number,
        transitionalBalanceSats: number,
    ): Promise<void> {
        this.params.ecashWallet = newWallet;

        if (!newWallet) {
            return;
        }

        const address = getAddress(newWallet);
        if (!address) {
            webViewError('Cannot get address from wallet');
            return;
        }

        const pricePerXec = await this.params.priceFetcher?.current(
            this.params.appSettings.fiatCurrency,
        );

        // Update address display and generate QR code
        this.ui.address.textContent = address;
        generateQRCode(address);

        this.updateAvailableBalanceDisplay(
            0,
            satsToXec(availableBalanceSats),
            pricePerXec,
            false,
        );
        this.updateTransitionalBalance(transitionalBalanceSats, pricePerXec);
    }

    // Update available balance display with optional animation
    updateAvailableBalanceDisplay(
        fromXec: number,
        toXec: number,
        pricePerXec: number | null,
        animate: boolean = true,
    ): void {
        webViewLog(
            `Available balance updated from ${fromXec} ${config.ticker} to ${toXec} ${config.ticker}`,
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

        const sign = transitionalBalanceSats > 0 ? '+' : '';
        const type = transitionalBalanceSats > 0 ? 'receive' : 'spend';
        const transitionalXec = satsToXec(transitionalBalanceSats);

        const displayText =
            this.params.appSettings.primaryBalanceType === 'XEC' ||
            pricePerXec === null
                ? `${sign}${transitionalXec.toFixed(2)} ${config.ticker}`
                : `${sign}${formatPrice(
                      transitionalXec * pricePerXec,
                      this.params.appSettings.fiatCurrency,
                  )}`;

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
            !this.ui.cameraModal
        ) {
            webViewError('Missing required UI elements for main screen');
            throw new Error('Missing required UI elements for main screen');
        }
    }

    private initializeEventListeners(): void {
        // Address click listener for copying
        this.ui.address.addEventListener('click', () => {
            if (this.params.ecashWallet) {
                copyAddress(this.params.ecashWallet);
            }
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

        if (bip21Result) {
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
                address: result,
            });
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
                      return `${value.toFixed(2)} ${config.ticker}`;
                  }
                : (value: number) => {
                      return formatPrice(
                          value,
                          this.params.appSettings.fiatCurrency,
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
