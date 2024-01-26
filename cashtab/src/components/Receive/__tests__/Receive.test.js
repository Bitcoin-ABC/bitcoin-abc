import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import Receive from '../Receive';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { loadingTrue, walletWithBalancesMockContext } from '../fixtures/mocks';
import { WalletContext } from 'utils/context';
import { BrowserRouter } from 'react-router-dom';

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

const TestReceiveScreen = (
    <BrowserRouter>
        <WalletContext.Provider value={walletWithBalancesMockContext}>
            <ThemeProvider theme={theme}>
                <Receive />
            </ThemeProvider>
        </WalletContext.Provider>
    </BrowserRouter>
);

describe('<Receive />', () => {
    afterEach(() => {
        // Reset the width and height to jsdom defaults
        Object.defineProperty(window, 'innerWidth', {
            value: 1024,
            writable: true, // possibility to overwrite
        });
        Object.defineProperty(window, 'innerHeight', {
            value: 768,
            writable: true, // possibility to overwrite
        });
    });
    it('Renders the loading component while loading', async () => {
        render(
            <BrowserRouter>
                <WalletContext.Provider value={loadingTrue}>
                    <ThemeProvider theme={theme}>
                        <Receive />
                    </ThemeProvider>
                </WalletContext.Provider>
            </BrowserRouter>,
        );

        // Receive component is not rendered
        expect(screen.queryByTestId('receive-ctn')).not.toBeInTheDocument();

        // Loading ctn is rendered
        expect(screen.queryByTestId('rcv-loading')).toBeInTheDocument();
    });
    it('Renders the Receive screen correctly', async () => {
        render(TestReceiveScreen);
        // Loading ctn is not rendered
        expect(screen.queryByTestId('rcv-loading')).not.toBeInTheDocument();

        // Receive component is rendered
        expect(screen.queryByTestId('receive-ctn')).toBeInTheDocument();

        // QR Code is rendered
        expect(screen.queryByTestId('qr-code-ctn')).toBeInTheDocument();

        // Copy div is not displayed
        expect(screen.queryByTestId('qr-code-copied')).toHaveStyle(
            'display: none',
        );
    });
    it('Renders the Receive screen with QR code of expected width for desktop', async () => {
        render(TestReceiveScreen);
        // Loading ctn is not rendered
        expect(screen.queryByTestId('rcv-loading')).not.toBeInTheDocument();

        // Receive component is rendered
        expect(screen.queryByTestId('receive-ctn')).toBeInTheDocument();

        // QR Code container is rendered
        expect(screen.queryByTestId('qr-code-ctn')).toBeInTheDocument();

        // We expect QR Code width of 420px
        // QR Code is rendered
        const EXPECTED_DESKTOP_WIDTH = '420';
        const qrCodeItself = screen.queryByTestId('raw-qr-code');
        expect(qrCodeItself).toBeInTheDocument();
        expect(qrCodeItself).toHaveAttribute('width', EXPECTED_DESKTOP_WIDTH);
        expect(qrCodeItself).toHaveAttribute('height', EXPECTED_DESKTOP_WIDTH);
    });
    it('Renders the Receive screen with QR code of expected width for smallest supported mobile view', async () => {
        // Reset the width to mobile
        Object.defineProperty(window, 'innerWidth', {
            value: 320,
            writable: true, // possibility to overwrite
        });
        render(TestReceiveScreen);
        // Loading ctn is not rendered
        expect(screen.queryByTestId('rcv-loading')).not.toBeInTheDocument();

        // Receive component is rendered
        expect(screen.queryByTestId('receive-ctn')).toBeInTheDocument();

        // QR Code container is rendered
        expect(screen.queryByTestId('qr-code-ctn')).toBeInTheDocument();

        // We expect QR Code width of 245px = 320 - CASHTAB_MOBILE_QR_PADDING of 75px
        // QR Code is rendered
        const EXPECTED_DESKTOP_WIDTH = '245';
        const qrCodeItself = screen.queryByTestId('raw-qr-code');
        expect(qrCodeItself).toBeInTheDocument();
        expect(qrCodeItself).toHaveAttribute('width', EXPECTED_DESKTOP_WIDTH);
        expect(qrCodeItself).toHaveAttribute('height', EXPECTED_DESKTOP_WIDTH);
    });
    it('Renders the Receive screen with QR code of size that is fully viewable in extension dimensions', async () => {
        // Reset the width and height to extension
        // Note that, while these dimensions are in the css of App.js,
        // the 600 height is also imposed by Chrome
        // So we need to have a QR code size that works with this
        Object.defineProperty(window, 'innerWidth', {
            value: 400,
            writable: true, // possibility to overwrite
        });
        Object.defineProperty(window, 'innerHeight', {
            value: 600,
            writable: true, // possibility to overwrite
        });
        render(TestReceiveScreen);
        // Loading ctn is not rendered
        expect(screen.queryByTestId('rcv-loading')).not.toBeInTheDocument();

        // Receive component is rendered
        expect(screen.queryByTestId('receive-ctn')).toBeInTheDocument();

        // QR Code container is rendered
        expect(screen.queryByTestId('qr-code-ctn')).toBeInTheDocument();

        // We expect QR Code width of 250 for extension
        // QR Code is rendered
        const EXPECTED_DESKTOP_WIDTH = '250';
        const qrCodeItself = screen.queryByTestId('raw-qr-code');
        expect(qrCodeItself).toBeInTheDocument();
        expect(qrCodeItself).toHaveAttribute('width', EXPECTED_DESKTOP_WIDTH);
        expect(qrCodeItself).toHaveAttribute('height', EXPECTED_DESKTOP_WIDTH);
    });
    it('Clicking the QR code copy pastes address to clipboard', async () => {
        render(TestReceiveScreen);
        // Loading ctn is not rendered
        expect(screen.queryByTestId('rcv-loading')).not.toBeInTheDocument();

        // Receive component is rendered
        expect(screen.queryByTestId('receive-ctn')).toBeInTheDocument();

        // QR Code container is rendered
        expect(screen.queryByTestId('qr-code-ctn')).toBeInTheDocument();

        // We expect QR Code width of 420px
        // QR Code is rendered
        const EXPECTED_DESKTOP_WIDTH = '420';
        const qrCodeItself = screen.queryByTestId('raw-qr-code');
        expect(qrCodeItself).toBeInTheDocument();
        expect(qrCodeItself).toHaveAttribute('width', EXPECTED_DESKTOP_WIDTH);
        expect(qrCodeItself).toHaveAttribute('height', EXPECTED_DESKTOP_WIDTH);

        // Click the QR Code
        await userEvent.click(qrCodeItself);

        // Copy div is displayed
        expect(screen.queryByTestId('qr-code-copied')).toHaveStyle(
            'display: block',
        );
        // Copy div renders address as expected
        expect(screen.queryByTestId('qr-code-copied')).toHaveTextContent(
            'Address Copied to Clipboardecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
        );
    });
    // Copy pasting works
    // Copy pasting makes the copy paste div visible
});
