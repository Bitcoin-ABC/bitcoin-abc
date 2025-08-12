// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import Modal from 'components/Common/Modal';
import { Alert } from 'components/Common/Atoms';
import { QRCodeIcon } from 'components/Common/CustomIcons';
import styled from 'styled-components';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const StyledScanQRCode = styled.button`
    cursor: pointer;
    border-radius: 0 9px 9px 0;
    background-color: ${props => props.theme.secondaryBackground};
    border-left: none !important;
    padding: 0 12px;
`;

const QRPreview = styled.div`
    width: 100%;
    height: 100%;
    position: relative;
    & video,
    & canvas {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover;
    }
`;

const ZoomControls = styled.div`
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 1;
`;

interface ScanQRCodeProps {
    onScan: (value: string) => void;
}

/**
 * Component to scan QR codes using the webcam
 * - Default not the front-facing camera
 * - Default zoom 1x but allow different zoom levels
 *
 * Based on scanapp.org implementation. This has better performance
 * scanning more info-dense QR codes and QR codes with larger logos
 * in the center of the code
 */
const ScanQRCode: React.FC<ScanQRCodeProps> = ({
    onScan = () => null,
    ...otherProps
}) => {
    const [qrInstance, setQrInstance] = useState<Html5Qrcode | null>(null);
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState<false | Error>(false);
    const [zoomSupported, setZoomSupported] = useState(false);
    const [zoomMin, setZoomMin] = useState<number | null>(null);
    const [zoomMax, setZoomMax] = useState<number | null>(null);
    const [zoomStep, setZoomStep] = useState<number | null>(null);
    const [zoomValue, setZoomValue] = useState<number | null>(null);
    const [modalSize, setModalSize] = useState<number>(480);

    const computeModalSize = () => {
        if (typeof window === 'undefined') return 480;
        const vw = Math.floor(window.innerWidth * 0.9);
        const vh = Math.floor(window.innerHeight * 0.9);
        // Keep it square and within viewport
        return Math.max(300, Math.min(vw, vh));
    };

    const applyVideoConstraints = async (
        instance: Html5Qrcode,
        constraints: MediaTrackConstraints,
    ) => {
        const anyInstance = instance as unknown as {
            applyVideoConstraints?: (c: MediaTrackConstraints) => Promise<void>;
        };
        if (typeof anyInstance.applyVideoConstraints === 'function') {
            try {
                await anyInstance.applyVideoConstraints(constraints);
            } catch {
                // Silently ignore failures; not all browsers support zoom
            }
        }
    };

    const scanForQrCode = async () => {
        // https://www.npmjs.com/package/html5-qrcode
        try {
            const instance = new Html5Qrcode('test-area-qr-code-webcam');
            setQrInstance(instance);

            const qrboxFunction = (
                viewfinderWidth: number,
                viewfinderHeight: number,
            ) => {
                // Square QR Box at ~80% of the min edge, min 250px
                const minEdge =
                    viewfinderWidth > viewfinderHeight
                        ? viewfinderHeight
                        : viewfinderWidth;
                const minEdgeSizeThreshold = 250;
                const edgeSizePercentage = 0.8;
                const boxSize = Math.floor(minEdge * edgeSizePercentage);
                if (boxSize < minEdgeSizeThreshold) {
                    const size = Math.min(minEdge, minEdgeSizeThreshold);
                    return { width: size, height: size };
                }
                return { width: boxSize, height: boxSize };
            };

            const qrConfig = {
                fps: 10,
                qrbox: qrboxFunction,
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                willReadFrequently: true,
            } as const;

            await instance.start(
                { facingMode: 'environment' },
                qrConfig,
                decodedText => {
                    onScan(decodedText);
                    // Close modal; useEffect will stop/clear the instance safely
                    setVisible(false);
                },
                () => {
                    // Ignore scan errors; keep scanning
                },
            );

            // After start, try to detect and initialize zoom support
            try {
                const anyInstance = instance as unknown as {
                    getRunningTrackCapabilities?: () => MediaTrackCapabilities;
                };
                const caps =
                    typeof anyInstance.getRunningTrackCapabilities ===
                    'function'
                        ? anyInstance.getRunningTrackCapabilities()
                        : null;
                if (caps && (caps as any).zoom) {
                    const zoomCaps = (caps as any).zoom as {
                        min: number;
                        max: number;
                        step?: number;
                    };
                    setZoomSupported(true);
                    setZoomMin(zoomCaps.min);
                    setZoomMax(zoomCaps.max);
                    setZoomStep(zoomCaps.step || 0.1);
                    // We default to 1x zoom although scanapp.org does 1.5, seems to work best
                    // User has option to adjust
                    const desired = 1;
                    const initial = Math.min(
                        Math.max(desired, zoomCaps.min),
                        zoomCaps.max,
                    );
                    setZoomValue(initial);
                    await applyVideoConstraints(instance, {
                        advanced: [
                            {
                                zoom: initial,
                            } as unknown as MediaTrackConstraintSet,
                        ],
                    });
                } else {
                    setZoomSupported(false);
                }
            } catch {
                setZoomSupported(false);
            }
        } catch (e) {
            console.error('Error starting QR scanner', e);
            setError(e as Error);
        }
    };

    useEffect(() => {
        if (!visible) {
            setError(false);
            if (qrInstance) {
                qrInstance
                    .stop()
                    .then(() => qrInstance.clear())
                    .catch(() => null);
                setQrInstance(null);
            }
            setZoomSupported(false);
            setZoomMin(null);
            setZoomMax(null);
            setZoomStep(null);
            setZoomValue(null);
        } else {
            // Initialize modal size and bind resize listener
            const size = computeModalSize();
            setModalSize(size);
            const onResize = () => setModalSize(computeModalSize());
            window.addEventListener('resize', onResize);
            scanForQrCode();
            return () => window.removeEventListener('resize', onResize);
        }
    }, [visible]);

    return (
        <>
            <StyledScanQRCode
                title="Scan QR Code"
                {...otherProps}
                onClick={() => setVisible(!visible)}
            >
                <QRCodeIcon />
            </StyledScanQRCode>
            {visible === true && (
                <Modal
                    handleCancel={() => setVisible(false)}
                    showButtons={false}
                    width={modalSize}
                    height={modalSize}
                >
                    {error ? (
                        <Alert>{`Error in QR scanner: ${error}.\n\nPlease ensure your camera is not in use.`}</Alert>
                    ) : (
                        <QRPreview
                            title="Video Preview"
                            id="test-area-qr-code-webcam"
                        ></QRPreview>
                    )}
                    {zoomSupported && zoomMin !== null && zoomMax !== null && (
                        <ZoomControls>
                            <input
                                type="range"
                                min={zoomMin}
                                max={zoomMax}
                                step={zoomStep || 0.1}
                                value={zoomValue || zoomMin}
                                onChange={async e => {
                                    const value = parseFloat(e.target.value);
                                    setZoomValue(value);
                                    if (qrInstance) {
                                        await applyVideoConstraints(
                                            qrInstance,
                                            {
                                                advanced: [
                                                    {
                                                        zoom: value,
                                                    } as unknown as MediaTrackConstraintSet,
                                                ],
                                            },
                                        );
                                    }
                                }}
                                aria-label="Zoom"
                            />
                        </ZoomControls>
                    )}
                </Modal>
            )}
        </>
    );
};

export default ScanQRCode;
