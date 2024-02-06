import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import ScanQRCode from 'components/Common/ScanQRCode';

function mockFunction() {
    const original = jest.requireActual('react-router-dom');
    return {
        ...original,
        useLocation: jest.fn().mockReturnValue({
            pathname: '/another-route',
            search: '',
            hash: '',
            state: null,
            key: '5nvxpbdafa',
        }),
    };
}

jest.mock('react-router-dom', () => mockFunction());

// https://stackoverflow.com/questions/39830580/jest-test-fails-typeerror-window-matchmedia-is-not-a-function
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// https://stackoverflow.com/questions/64813447/cannot-read-property-addlistener-of-undefined-react-testing-library
window.matchMedia = query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
});

// Mock @zxing/browser
jest.mock('@zxing/browser');

describe('<ScanQRCode />', () => {
    it('Renders the modal on load if loadWithCameraOpen is true', async () => {
        const user = userEvent.setup();
        render(<ScanQRCode loadWithCameraOpen={true} />);

        // Button to open modal is rendered
        const StartScanningButton = screen.queryByTestId('scan-qr-code');
        expect(StartScanningButton).toBeInTheDocument();

        // The modal root component is rendered
        expect(screen.getByTestId('scan-qr-code-modal')).toBeInTheDocument();

        // The modal is displayed
        expect(screen.getByTestId('scan-qr-code-modal').firstChild).toHaveStyle(
            `display: block`,
        );

        // Click the close button
        await user.click(
            screen.getByRole('button', { class: /ant-modal-close/i }),
        );

        // Expect modal to be closed
        expect(
            screen.queryByTestId('scan-qr-code-modal').firstChild,
        ).toHaveStyle(`display: none`);
    });
    it('Does not render the modal on load if loadWithCameraOpen is false', async () => {
        const user = userEvent.setup();
        render(<ScanQRCode loadWithCameraOpen={false} />);

        // Button to open modal is rendered
        const StartScanningButton = screen.queryByTestId('scan-qr-code');
        expect(StartScanningButton).toBeInTheDocument();

        // The modal root component is not rendered
        expect(
            screen.queryByTestId('scan-qr-code-modal'),
        ).not.toBeInTheDocument();

        // Click the open modal button
        await user.click(StartScanningButton);

        // The modal root component is rendered
        expect(screen.getByTestId('scan-qr-code-modal')).toBeInTheDocument();

        // Expect modal to be open
        expect(screen.getByTestId('scan-qr-code-modal').firstChild).toHaveStyle(
            `display: block`,
        );
    });
});
