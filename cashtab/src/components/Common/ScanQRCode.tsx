// Copyright (c) 2024-2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import {
    CapacitorBarcodeScanner,
    CapacitorBarcodeScannerTypeHint,
    CapacitorBarcodeScannerCameraDirection,
    CapacitorBarcodeScannerScanOrientation,
} from '@capacitor/barcode-scanner';
import { QRCodeIcon } from 'components/Common/CustomIcons';
import styled from 'styled-components';
import { Capacitor } from '@capacitor/core';

const StyledScanQRCode = styled.button`
    cursor: pointer;
    border-radius: 0 9px 9px 0;
    background-color: ${props => props.theme.secondaryBackground};
    border-left: none !important;
    padding: 0 12px;
`;

interface ScanQRCodeProps {
    onScan: (value: string) => void;
}

/**
 * Component to scan QR codes using Capacitor's native barcode scanner
 * This provides a native UI experience with better performance and reliability
 * compared to the web-based html5-qrcode or zxing implementations
 */
const ScanQRCode: React.FC<ScanQRCodeProps> = ({
    onScan = () => null,
    ...otherProps
}) => {
    const [isScanning, setIsScanning] = React.useState(false);

    const startScanning = async () => {
        try {
            setIsScanning(true);

            // Start scanning with native UI
            const result = await CapacitorBarcodeScanner.scanBarcode({
                scanInstructions: 'Point your camera at a QR code',
                scanButton: false,
                scanText: 'Scanning...',
                hint: CapacitorBarcodeScannerTypeHint.QR_CODE,

                // Force back camera for better quality
                cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,

                // Adaptive orientation for better detection
                scanOrientation:
                    CapacitorBarcodeScannerScanOrientation.ADAPTIVE,

                ...(Capacitor.getPlatform() === 'web' && {
                    web: {
                        // Lower FPS for more processing time per frame
                        scannerFPS: 17,
                        // Allow camera selection for better quality
                        showCameraSelection: true,
                    },
                }),
            });

            if (result.ScanResult) {
                console.log('QR Code detected:', result.ScanResult);
                onScan(result.ScanResult);
            }
            // If no result, user cancelled or no QR code found
        } catch (err) {
            console.error('Failed to start QR scanner:', err);
            // Close on any error (permission denied, etc.)
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <StyledScanQRCode
            title="Scan QR Code"
            disabled={isScanning}
            {...otherProps}
            onClick={startScanning}
        >
            <QRCodeIcon />
        </StyledScanQRCode>
    );
};

export default ScanQRCode;
