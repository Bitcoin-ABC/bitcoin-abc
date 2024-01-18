import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal } from 'antd';
import { ThemedQrcodeOutlined } from 'components/Common/CustomIcons';
import { errorNotification } from './Notifications';
import styled from 'styled-components';
import { BrowserQRCodeReader } from '@zxing/library';
import { parseAddressInput, isValidEtokenAddress } from 'validation';

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
        const parsedAddressInput = parseAddressInput(content);

        if (
            parsedAddressInput.address.error === false ||
            isValidEtokenAddress(content)
        ) {
            // If what scanner reads from QR code is a valid eCash or eToken address
            type = 'address';
            values = {
                address: content,
            };
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

            let result = { type: 'unknown', values: {} };

            while (result.type !== 'address') {
                const content = await codeReader.decodeFromInputVideoDevice(
                    undefined,
                    'test-area-qr-code-webcam',
                );
                result = parseContent(content.text);
                if (result.type !== 'address') {
                    errorNotification(
                        content.text,
                        `${content.text} is not a valid eCash address`,
                        `${content.text} is not a valid eCash address`,
                    );
                }
            }
            // When you scan a valid address, stop scanning and fill form
            // Hide the scanner
            setVisible(false);
            onScan(result.values.address);
            return teardownCodeReader(codeReader);
        } catch (err) {
            console.log(`Error in QR scanner:`);
            console.log(err);
            console.log(JSON.stringify(err.message));
            setError(err);
            return teardownCodeReader(codeReader);
        }
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
                open={visible}
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
