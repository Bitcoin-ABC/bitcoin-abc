import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal } from 'antd';
import { ThemedQrcodeOutlined } from '@components/Common/CustomIcons';
import styled from 'styled-components';
import { BrowserQRCodeReader } from '@zxing/library';
import {
    currency,
    isValidCashPrefix,
    isValidTokenPrefix,
} from '@components/Common/Ticker.js';
import { Event } from '@utils/GoogleAnalytics';

const StyledScanQRCode = styled.span`
    display: block;
`;

const StyledModal = styled(Modal)`
    width: 400px !important;
    height: 400px !important;

    .ant-modal-close {
        top: 0 !important;
        right: 0 !important;
    }
`;

const QRPreview = styled.video`
    width: 100%;
`;

const ScanQRCode = ({
    loadWithCameraOpen,
    onScan = () => null,
    ...otherProps
}) => {
    const [visible, setVisible] = useState(loadWithCameraOpen);
    const [error, setError] = useState(false);
    // Use these states to debug video errors on mobile
    // Note: iOS chrome/brave/firefox does not support accessing camera, will throw error
    // iOS users can use safari
    // todo only show scanner with safari
    //const [mobileError, setMobileError] = useState(false);
    //const [mobileErrorMsg, setMobileErrorMsg] = useState(false);
    const [activeCodeReader, setActiveCodeReader] = useState(null);

    const teardownCodeReader = codeReader => {
        if (codeReader !== null) {
            codeReader.reset();
            codeReader.stop();
            codeReader = null;
            setActiveCodeReader(codeReader);
        }
    };

    const parseContent = content => {
        let type = 'unknown';
        let values = {};

        // If what scanner reads from QR code begins with 'bitcoincash:' or 'simpleledger:' or their successor prefixes
        if (isValidCashPrefix(content) || isValidTokenPrefix(content)) {
            type = 'address';
            values = { address: content };
            // Event("Category", "Action", "Label")
            // Track number of successful QR code scans
            // BCH or slp?
            let eventLabel = currency.ticker;
            const isToken = content.split(currency.tokenPrefix).length > 1;
            if (isToken) {
                eventLabel = currency.tokenTicker;
            }
            Event('ScanQRCode.js', 'Address Scanned', eventLabel);
        }
        return { type, values };
    };

    const scanForQrCode = async () => {
        const codeReader = new BrowserQRCodeReader();
        setActiveCodeReader(codeReader);

        try {
            // Need to execute this before you can decode input
            // eslint-disable-next-line no-unused-vars
            const videoInputDevices = await codeReader.getVideoInputDevices();
            //console.log(`videoInputDevices`, videoInputDevices);
            //setMobileError(JSON.stringify(videoInputDevices));

            // choose your media device (webcam, frontal camera, back camera, etc.)
            // TODO implement if necessary
            //const selectedDeviceId = videoInputDevices[0].deviceId;

            //const previewElem = document.querySelector("#test-area-qr-code-webcam");

            const content = await codeReader.decodeFromInputVideoDevice(
                undefined,
                'test-area-qr-code-webcam',
            );
            const result = parseContent(content.text);

            // stop scanning and fill form if it's an address
            if (result.type === 'address') {
                // Hide the scanner
                setVisible(false);
                onScan(result.values.address);
                return teardownCodeReader(codeReader);
            }
        } catch (err) {
            console.log(`Error in QR scanner:`);
            console.log(err);
            console.log(JSON.stringify(err.message));
            //setMobileErrorMsg(JSON.stringify(err.message));
            setError(err);
            teardownCodeReader(codeReader);
        }

        // stop scanning after 20s no matter what
    };

    React.useEffect(() => {
        if (!visible) {
            setError(false);
            // Stop the camera if user closes modal
            if (activeCodeReader !== null) {
                teardownCodeReader(activeCodeReader);
            }
        } else {
            scanForQrCode();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    return (
        <>
            <StyledScanQRCode
                {...otherProps}
                onClick={() => setVisible(!visible)}
            >
                <ThemedQrcodeOutlined />
            </StyledScanQRCode>
            <StyledModal
                title="Scan QR code"
                visible={visible}
                onCancel={() => setVisible(false)}
                footer={null}
            >
                {visible ? (
                    <div>
                        {error ? (
                            <>
                                <Alert
                                    message="Error"
                                    description="Error in QR scanner. Please ensure your camera is not in use. Due to Apple restrictions on third-party browsers, you must use Safari browser for QR code scanning on an iPhone."
                                    type="error"
                                    showIcon
                                    style={{ textAlign: 'left' }}
                                />
                                {/*
                <p>{mobileError}</p>
                <p>{mobileErrorMsg}</p>
                */}
                            </>
                        ) : (
                            <QRPreview id="test-area-qr-code-webcam"></QRPreview>
                        )}
                    </div>
                ) : null}
            </StyledModal>
        </>
    );
};

ScanQRCode.propTypes = {
    loadWithCameraOpen: PropTypes.bool,
    onScan: PropTypes.func,
};

export default ScanQRCode;
