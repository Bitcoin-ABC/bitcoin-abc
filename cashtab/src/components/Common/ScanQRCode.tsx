// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import Modal from 'components/Common/Modal';
import { Alert } from 'components/Common/Atoms';
import { QRCodeIcon } from 'components/Common/CustomIcons';
import styled from 'styled-components';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import {
    NotFoundException,
    FormatException,
    ChecksumException,
    Result,
} from '@zxing/library';

const StyledScanQRCode = styled.button`
  cursor: pointer;
  border-radius 0 9px 9px 0;
  background-color: ${props => props.theme.forms.selectionBackground};  
  border-left: none !important;
  padding: 0 12px;
`;

const QRPreview = styled.video`
    width: 100%;
`;

/**
 * This interesting interface results from ts throwing issues because the
 * Result interface from @zxing/library apparently has text as private
 * The docs of the lib say to access it with result.text
 * would probably need to contact authors to update
 */
class ZxingResult {
    private _result: Result;

    constructor(result: Result) {
        this._result = result;
    }

    /**
     * Gets the text from the result if available.
     * @returns The text content if it exists, otherwise undefined.
     */
    get text(): string | undefined {
        try {
            // Assuming 'text' might not be string, but we cast to string | undefined
            return (this._result as unknown as { text?: string }).text;
        } catch {
            // In case accessing .text throws an error
            return undefined;
        }
    }
}

interface ScanQRCodeProps {
    loadWithScannerOpen: boolean;
    onScan: React.ChangeEventHandler<HTMLInputElement>;
}
const ScanQRCode: React.FC<ScanQRCodeProps> = ({
    loadWithScannerOpen,
    onScan = () => null,
    ...otherProps
}) => {
    const [codeReaderControls, setCodeReaderControls] =
        useState<null | IScannerControls>(null);
    const [visible, setVisible] = useState(loadWithScannerOpen);
    const [error, setError] = useState<false | Error>(false);

    const codeReader = new BrowserQRCodeReader();

    const scanForQrCode = async () => {
        // https://www.npmjs.com/package/@zxing/browser

        const controls = await codeReader.decodeFromVideoDevice(
            // This is the video input device ID
            // If undefined, app will use the user's default device
            undefined,
            'test-area-qr-code-webcam',
            (result: Result | ZxingResult | undefined, error, controls) => {
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
                    console.error(`Error scanning for QR code`, error);
                    // The error will be displayed in the modal area
                    setError(error);

                    // Stop scanning
                    return controls.stop();
                }

                if (
                    typeof (result as unknown as ZxingResult)?.text !==
                    'undefined'
                ) {
                    // Pass the result to the Send To input field
                    // We will pass the result of any scanned QR code
                    // and allow validation in SendXec and SendToken to handle
                    onScan(
                        (result as unknown as ZxingResult)
                            .text as unknown as React.ChangeEvent<HTMLInputElement>,
                    );
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
                    height={250}
                >
                    {error ? (
                        <Alert>{`Error in QR scanner: ${error}.\n\nPlease ensure your camera is not in use.`}</Alert>
                    ) : (
                        <QRPreview
                            title="Video Preview"
                            id="test-area-qr-code-webcam"
                        ></QRPreview>
                    )}
                </Modal>
            )}
        </>
    );
};

export default ScanQRCode;
