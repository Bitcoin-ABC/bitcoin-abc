import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal } from 'antd';
import { ThemedQrcodeOutlined } from 'components/Common/CustomIcons';
import styled from 'styled-components';
import { BrowserQRCodeReader } from '@zxing/browser';
import {
    NotFoundException,
    FormatException,
    ChecksumException,
} from '@zxing/library';

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
    const [codeReaderControls, setCodeReaderControls] = useState(null);
    const [visible, setVisible] = useState(loadWithCameraOpen);
    const [error, setError] = useState(false);

    const codeReader = new BrowserQRCodeReader();

    const scanForQrCode = async () => {
        // https://www.npmjs.com/package/@zxing/browser

        const controls = await codeReader.decodeFromVideoDevice(
            // This is the video input device ID
            // If undefined, app will use the user's default device
            undefined,
            'test-area-qr-code-webcam',
            (result, error, controls) => {
                if (error) {
                    // If an error is raised
                    if (
                        error instanceof NotFoundException ||
                        error instanceof FormatException ||
                        error instanceof ChecksumException
                    ) {
                        // These are the three subclasses of the ReaderException class in original Java implementation
                        // https://zxing.github.io/zxing/apidocs/com/google/zxing/ReaderException.html

                        // NotFoundException error
                        // https://zxing.github.io/zxing/apidocs/com/google/zxing/NotFoundException.html
                        // The camera is scanning for a QR code every 0.5s
                        // It throws this error if it doesn't find one

                        // FormatException
                        // https://zxing.github.io/zxing/apidocs/com/google/zxing/FormatException.html
                        // This can occur if the camera reads a non-QR code, or misreads a QR code
                        // In either case, we want to keep scanning

                        // ChecksumException
                        // https://zxing.github.io/zxing/apidocs/com/google/zxing/ChecksumException.html
                        // In this case, it is not returning anything, so just keep scanning until you get it right
                        // This happens when the camera misreads a barcode even if the checksum was good
                        // Since no result is returned in this case, we want to keep scanning and ignore error
                        return;
                    }
                    // Other errors come from input device, permissions
                    // These are issues where the user should be notified that the scanning
                    // ain't gonna work
                    console.log(`Error scanning for QR code`, error);
                    // The error will be displayed in the modal area
                    setError(error);

                    // Stop scanning
                    return controls.stop();
                }

                if (typeof result !== 'undefined') {
                    // Pass the result to the Send To input field
                    // We will pass the result of any scanned QR code
                    // and allow validation in SendXec and SendToken to handle
                    onScan(result.text);
                    // Stop the camera
                    controls.stop();
                    // Hide the scanning modal
                    return setVisible(false);
                }
            },
        );
        // Add to state so you can call controls.stop() if the user closes the modal
        setCodeReaderControls(controls);
    };

    useEffect(() => {
        if (!visible) {
            setError(false);
            if (
                codeReaderControls !== null &&
                typeof codeReaderControls !== 'undefined'
            ) {
                codeReaderControls.stop();
            }
        } else {
            scanForQrCode();
        }
    }, [visible]);

    return (
        <>
            <StyledScanQRCode
                data-testid="scan-qr-code"
                {...otherProps}
                onClick={() => setVisible(!visible)}
            >
                <ThemedQrcodeOutlined />
            </StyledScanQRCode>
            <StyledModal
                data-testid="scan-qr-code-modal"
                title="Scan QR code"
                open={visible === true}
                onCancel={() => setVisible(false)}
                footer={null}
            >
                {visible ? (
                    <div>
                        {error ? (
                            <>
                                <Alert
                                    message="Error"
                                    description={`Error in QR scanner: ${error}.\n\nPlease ensure your camera is not in use.`}
                                    type="error"
                                    showIcon
                                    style={{ textAlign: 'left' }}
                                />
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
