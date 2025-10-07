// Copyright (c) 2024-2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import ScanQRCode from 'components/Common/ScanQRCode';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';

// Mock @capacitor/barcode-scanner
jest.mock('@capacitor/barcode-scanner', () => ({
    CapacitorBarcodeScanner: {
        scanBarcode: jest.fn(),
    },
    CapacitorBarcodeScannerTypeHint: {
        QR_CODE: 'QR_CODE',
    },
    CapacitorBarcodeScannerCameraDirection: {
        BACK: 'BACK',
    },
    CapacitorBarcodeScannerScanOrientation: {
        ADAPTIVE: 'ADAPTIVE',
    },
    CapacitorBarcodeScannerAndroidScanningLibrary: {
        MLKIT: 'MLKIT',
    },
}));

// Mock @capacitor/core
jest.mock('@capacitor/core', () => ({
    Capacitor: {
        getPlatform: jest.fn(() => 'web'),
    },
}));

describe('<ScanQRCode />', () => {
    it('Renders the scan button and calls onScan when QR code is detected', async () => {
        const mockOnScan = jest.fn();
        const {
            CapacitorBarcodeScanner,
        } = require('@capacitor/barcode-scanner');

        // Mock successful scan result
        CapacitorBarcodeScanner.scanBarcode.mockResolvedValue({
            ScanResult: 'test-qr-code-result',
        });

        render(
            <ThemeProvider theme={theme}>
                <ScanQRCode onScan={mockOnScan} />
            </ThemeProvider>,
        );

        // Button to start scanning is rendered
        const scanButton = screen.queryByTitle('Scan QR Code');
        expect(scanButton).toBeInTheDocument();

        // Click the scan button
        await userEvent.click(scanButton!);

        // Wait for the async scan to complete
        await new Promise(resolve => setTimeout(resolve, 0));

        // Verify that the barcode scanner was called with optimized parameters
        expect(CapacitorBarcodeScanner.scanBarcode).toHaveBeenCalledWith({
            scanInstructions: 'Point your camera at a QR code',
            scanButton: false,
            scanText: 'Scanning...',
            hint: 'QR_CODE',
            cameraDirection: 'BACK',
            scanOrientation: 'ADAPTIVE',
            web: {
                scannerFPS: 17,
                showCameraSelection: true,
            },
        });

        // Verify that onScan was called with the result
        expect(mockOnScan).toHaveBeenCalledWith('test-qr-code-result');
    });

    it('Handles scan cancellation gracefully', async () => {
        const mockOnScan = jest.fn();
        const {
            CapacitorBarcodeScanner,
        } = require('@capacitor/barcode-scanner');

        // Mock cancelled scan (no result)
        CapacitorBarcodeScanner.scanBarcode.mockResolvedValue({});

        render(
            <ThemeProvider theme={theme}>
                <ScanQRCode onScan={mockOnScan} />
            </ThemeProvider>,
        );

        const scanButton = screen.queryByTitle('Scan QR Code');
        await userEvent.click(scanButton!);

        // Wait for the async scan to complete
        await new Promise(resolve => setTimeout(resolve, 0));

        // Verify that onScan was not called when scan is cancelled
        expect(mockOnScan).not.toHaveBeenCalled();
    });

    it('Handles scan errors gracefully', async () => {
        const mockOnScan = jest.fn();
        const {
            CapacitorBarcodeScanner,
        } = require('@capacitor/barcode-scanner');

        // Mock scan error
        CapacitorBarcodeScanner.scanBarcode.mockRejectedValue(
            new Error('Permission denied'),
        );

        render(
            <ThemeProvider theme={theme}>
                <ScanQRCode onScan={mockOnScan} />
            </ThemeProvider>,
        );

        const scanButton = screen.queryByTitle('Scan QR Code');
        await userEvent.click(scanButton!);

        // Wait for the async scan to complete
        await new Promise(resolve => setTimeout(resolve, 0));

        // Verify that onScan was not called when scan fails
        expect(mockOnScan).not.toHaveBeenCalled();
    });
});
