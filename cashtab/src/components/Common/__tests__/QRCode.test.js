import React from 'react';
import { render, fireEvent, act, screen } from '@testing-library/react';
import { QRCode } from '../QRCode';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';

describe('<QRCode />', () => {
    jest.useFakeTimers('legacy');

    it('QRCode copying ecash address', async () => {
        const OnClick = jest.fn();
        render(
            <ThemeProvider theme={theme}>
                <QRCode
                    pixelRatio={25}
                    onClick={OnClick}
                    address="ecash:qqyumjtrftl5yfdwuglhq6l9af2ner39jqr0wexwyk"
                    legacy={true}
                />
            </ThemeProvider>,
        );

        const qrCodeElement = screen.getByTestId('raw-qr-code');
        fireEvent.click(qrCodeElement);

        act(() => {
            jest.runAllTimers();
        });
        expect(OnClick).toHaveBeenCalled();
    });

    it('QRCode copying eToken address', () => {
        const OnClick = jest.fn();
        render(
            <ThemeProvider theme={theme}>
                <QRCode
                    pixelRatio={25}
                    onClick={OnClick}
                    address="etoken:qqyumjtrftl5yfdwuglhq6l9af2ner39jqd38msfqp"
                    legacy={true}
                />
            </ThemeProvider>,
        );
        const qrCodeElement = screen.getByTestId('raw-qr-code');
        fireEvent.click(qrCodeElement);
        expect(OnClick).toHaveBeenCalled();
    });

    it('QRCode without address', () => {
        const OnClick = jest.fn();
        render(
            <ThemeProvider theme={theme}>
                <QRCode pixelRatio={25} onClick={OnClick} />
            </ThemeProvider>,
        );

        const qrCodeElement = screen.getByTestId('raw-qr-code');
        fireEvent.click(qrCodeElement);
        expect(OnClick).toHaveBeenCalled();
    });
});
