// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { webViewError } from './common';
import QrScanner from 'qr-scanner';
import QRCode from 'qrcode';

let qrScanner: QrScanner | null = null;

// Start the QR Scanner
export async function startQRScanner(
    scanResultHandler: (result: string) => void,
) {
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    const modal = document.getElementById('camera-modal') as HTMLElement;

    if (!video || !modal) {
        webViewError('Camera elements not found');
        return;
    }

    // Show modal first
    modal.classList.remove('hidden');

    // Check initial state of fallback UI
    const fallback = document.getElementById('no-camera-fallback');
    if (fallback && !fallback.classList.contains('hidden')) {
        hideNoCameraFallback();
    }

    try {
        // Create QR scanner - this will fail if no camera is available
        qrScanner = new QrScanner(
            video,
            result => {
                scanResultHandler(result.data);
            },
            {
                onDecodeError: _error => {
                    // Silently handle decode errors (normal during scanning)
                },
            },
        );

        await qrScanner.start();
    } catch (error) {
        webViewError('Error starting QR scanner:', error);
        showNoCameraFallback();
    }
}

// Stop the QR scanner
export function stopQRScanner(forceClose = false) {
    const modal = document.getElementById('camera-modal') as HTMLElement;
    const fallback = document.getElementById('no-camera-fallback');
    const video = document.getElementById('camera-video') as HTMLVideoElement;

    if (qrScanner) {
        qrScanner.stop();
        qrScanner.destroy();
        qrScanner = null;
    }

    // Properly clean up the video element to prevent media player overlay
    if (video) {
        // Stop all video tracks
        if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            if (stream && stream.getTracks) {
                stream.getTracks().forEach(track => {
                    track.stop();
                });
            }
        }

        // Clear the video source
        video.srcObject = null;
        video.src = '';
        video.load(); // Reset the video element

        // Pause the video
        video.pause();
    }

    // Close modal if forceClose is true OR if fallback is not visible
    if (
        modal &&
        (forceClose || !fallback || fallback.classList.contains('hidden'))
    ) {
        modal.classList.add('hidden');
    }
}

// Show no camera fallback UI
function showNoCameraFallback() {
    const fallback = document.getElementById('no-camera-fallback');
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    const scanOverlay = document.querySelector('.scan-overlay');

    if (fallback) {
        // Hide video and scan overlay
        if (video) {
            video.style.display = 'none';
        }
        if (scanOverlay) {
            (scanOverlay as HTMLElement).style.display = 'none';
        }

        // Show fallback UI
        fallback.classList.remove('hidden');
    }
}

// Hide no camera fallback UI
export function hideNoCameraFallback() {
    const fallback = document.getElementById('no-camera-fallback');
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    const scanOverlay = document.querySelector('.scan-overlay');

    if (fallback) {
        // Hide fallback UI
        fallback.classList.add('hidden');

        // Restore video and scan overlay
        if (video) {
            video.style.display = 'block';
        }
        if (scanOverlay) {
            (scanOverlay as HTMLElement).style.display = 'block';
        }
    }
}

// Render the QR code for an address
export function generateQRCode(address: string) {
    const qrCodeEl = document.getElementById('qr-code') as HTMLElement;

    qrCodeEl.innerHTML = '';
    const canvas = document.createElement('canvas');
    qrCodeEl.appendChild(canvas);

    QRCode.toCanvas(
        canvas,
        address,
        {
            width: 200,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        },
        (error: any) => {
            if (error) {
                webViewError('Failed to generate QR code:', error);
                qrCodeEl.innerHTML =
                    '<p style="color: #ff6b6b;">QR Code generation failed</p>';
            }
        },
    );
}
