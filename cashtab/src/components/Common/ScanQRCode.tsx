// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import Modal from 'components/Common/Modal';
import { Alert } from 'components/Common/Atoms';
import { QRCodeIcon } from 'components/Common/CustomIcons';
import styled from 'styled-components';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { platformInfo } from 'platform';
import { Camera } from '@capacitor/camera';

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
    overflow: hidden;
    & video,
    & canvas {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain;
    }
    & video::-webkit-media-controls,
    & video::-webkit-media-controls-enclosure,
    & video::-webkit-media-controls-start-playback-button {
        display: none !important;
    }
`;

const ControlsBar = styled.div`
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 80px);
    bottom: 12px;
    z-index: 1;
    display: flex;
    gap: 12px;
    align-items: center;
`;

const TorchButton = styled.button<{ off: boolean }>`
    position: absolute;
    right: 12px;
    bottom: 12px;
    padding: 8px;
    border-radius: 50%;
    border: 1px solid ${props => props.theme.secondaryAccent};
    background: ${props => props.theme.secondaryBackground};
    color: ${props => props.theme.primaryText};
    cursor: pointer;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    overflow: visible;
    &:after {
        content: ${props => (props.off ? "''" : "'\u274C'")};
        position: absolute;
        top: -6px;
        right: -6px;
        font-size: 14px;
    }
`;

interface ScanQRCodeProps {
    onScan: (value: string) => void;
}

// Minimal local copy of the Html5Qrcode start options type to avoid using 'any'
type QrboxFunction = (
    viewfinderWidth: number,
    viewfinderHeight: number,
) => { width: number; height: number };
interface Html5QrcodeStartOptionsLike {
    fps: number;
    qrbox?: number | QrboxFunction;
    formatsToSupport?: Html5QrcodeSupportedFormats[];
    experimentalFeatures?: { useBarCodeDetectorIfSupported?: boolean };
    willReadFrequently?: boolean;
    aspectRatio?: number;
    videoConstraints?: MediaTrackConstraints;
}

// Global aspect ratio used across platforms
const ASPECT_RATIO = 16 / 9;

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
    const [modalWidth, setModalWidth] = useState<number>(480);
    const [modalHeight, setModalHeight] = useState<number>(360);
    const [torchSupported, setTorchSupported] = useState(false);
    const [torchOn, setTorchOn] = useState(false);

    const isMobileDevice = (): boolean => {
        try {
            const ua = navigator.userAgent || '';
            if (
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    ua,
                )
            ) {
                return true;
            }
            return (window.innerWidth || 0) <= 768;
        } catch {
            return false;
        }
    };

    const computeModalDims = (): {
        width: number;
        height: number;
        paddingPx: number;
    } => {
        if (typeof window === 'undefined')
            return { width: 480, height: 360, paddingPx: 12 };
        const vv: any = (window as any).visualViewport;
        const viewportW = vv && vv.width ? vv.width : window.innerWidth;
        const viewportH = vv && vv.height ? vv.height : window.innerHeight;
        if (isMobileDevice()) {
            // Fullscreen modal on mobile with no padding; overlays float on top
            return {
                width: Math.floor(viewportW),
                height: Math.floor(viewportH),
                paddingPx: 0,
            };
        }
        // Desktop: keep 16:9 area centered with modest padding
        const paddingPx = 12;
        const availableW = Math.floor(viewportW - paddingPx * 2);
        const availableH = Math.floor(viewportH - paddingPx * 2);
        const targetRatio = ASPECT_RATIO;
        let width = Math.min(availableW, Math.floor(availableH * targetRatio));
        let height = Math.floor(width / targetRatio);
        const minEdge = 300;
        if (Math.min(width, height) < minEdge) {
            if (width < height) {
                width = Math.min(availableW, minEdge);
                height = Math.floor(width / targetRatio);
            } else {
                height = Math.min(availableH, minEdge);
                width = Math.floor(height * targetRatio);
            }
        }
        return { width, height, paddingPx };
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
            // On Capacitor Android, proactively request camera permission
            if (platformInfo.platform === 'capacitor-android') {
                try {
                    await Camera.requestPermissions();
                } catch (permErr) {
                    // Permission request failed; proceed and let getUserMedia surface errors
                    console.warn('Camera permission request failed', permErr);
                }
            }

            const instance = new Html5Qrcode('test-area-qr-code-webcam');
            setQrInstance(instance);

            const mobile = isMobileDevice();
            const hasBarcodeDetector =
                typeof (window as any).BarcodeDetector === 'function';

            // Use full-frame ROI for better performance on dense QR codes
            const qrbox = hasBarcodeDetector
                ? (viewfinderWidth: number, viewfinderHeight: number) => ({
                      width: viewfinderWidth,
                      height: viewfinderHeight,
                  })
                : mobile
                ? Math.floor(
                      Math.max(250, Math.min(modalWidth, modalHeight)) * 0.85,
                  )
                : (viewfinderWidth: number, viewfinderHeight: number) => ({
                      width: viewfinderWidth,
                      height: viewfinderHeight,
                  });

            const qrConfig: Html5QrcodeStartOptionsLike = {
                fps: hasBarcodeDetector ? 12 : 10,
                qrbox,
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                willReadFrequently: true,
                aspectRatio: ASPECT_RATIO,
            };

            // Use environment camera directly - no enumeration to avoid delay
            const cameraParam = { facingMode: 'environment' };

            await instance.start(
                cameraParam,
                qrConfig,
                decodedText => {
                    onScan(decodedText);
                    setVisible(false);
                },
                () => {
                    /* noop */
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
                    // Default to 1.5x zoom for faster decode if supported
                    const desired = 1.5;
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
                // Attempt continuous focus to improve decode stability
                try {
                    await applyVideoConstraints(instance, {
                        advanced: [
                            {
                                // Not standardized everywhere; best-effort
                                focusMode: 'continuous',
                            } as unknown as MediaTrackConstraintSet,
                        ],
                    });
                } catch {
                    /* noop */
                }
                // Torch capability
                const torchCap = (caps as any)?.torch;
                setTorchSupported(Boolean(torchCap));
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
            const dims = computeModalDims();
            setModalWidth(dims.width);
            setModalHeight(dims.height);
            // Prevent background/body scrolling while modal is open
            const previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            const onResize = () => {
                const next = computeModalDims();
                setModalWidth(next.width);
                setModalHeight(next.height);
            };
            window.addEventListener('resize', onResize);
            const vv: any = (window as any).visualViewport;
            if (vv && typeof vv.addEventListener === 'function') {
                vv.addEventListener('resize', onResize);
            }
            scanForQrCode();
            return () => {
                window.removeEventListener('resize', onResize);
                if (vv && typeof vv.removeEventListener === 'function') {
                    vv.removeEventListener('resize', onResize);
                }
                document.body.style.overflow = previousOverflow;
            };
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
                    width={modalWidth}
                    height={modalHeight}
                    noScroll
                    paddingPx={isMobileDevice() ? 0 : 12}
                >
                    {error ? (
                        <Alert>{`Error in QR scanner: ${error}.\n\nPlease ensure your camera is not in use.`}</Alert>
                    ) : (
                        <QRPreview
                            title="Video Preview"
                            id="test-area-qr-code-webcam"
                            style={{ width: '100%', height: '100%' }}
                        >
                            {zoomSupported &&
                                zoomMin !== null &&
                                zoomMax !== null && (
                                    <ControlsBar>
                                        <input
                                            type="range"
                                            min={zoomMin}
                                            max={zoomMax}
                                            step={zoomStep || 0.1}
                                            value={zoomValue || zoomMin}
                                            onChange={async e => {
                                                const value = parseFloat(
                                                    e.target.value,
                                                );
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
                                        {torchSupported && (
                                            <TorchButton
                                                off={!torchOn}
                                                onClick={async () => {
                                                    const next = !torchOn;
                                                    setTorchOn(next);
                                                    if (qrInstance) {
                                                        await applyVideoConstraints(
                                                            qrInstance,
                                                            {
                                                                advanced: [
                                                                    {
                                                                        torch: next,
                                                                    } as unknown as MediaTrackConstraintSet,
                                                                ],
                                                            },
                                                        );
                                                    }
                                                }}
                                                aria-label="Toggle torch"
                                            >
                                                {/* flashlight emoji */}
                                                {'🔦'}
                                            </TorchButton>
                                        )}
                                    </ControlsBar>
                                )}
                        </QRPreview>
                    )}
                </Modal>
            )}
        </>
    );
};

export default ScanQRCode;
