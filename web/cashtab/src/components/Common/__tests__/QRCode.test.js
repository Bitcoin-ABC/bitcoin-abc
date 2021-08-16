import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { QRCode } from '../QRCode';
import { ThemeProvider } from 'styled-components';
import { theme } from '@assets/styles/theme';

describe('<QRCode />', () => {
    jest.useFakeTimers();

    it('QRCode copying ecash address', async () => {
        const OnClick = jest.fn();
        const { container } = render(
            <ThemeProvider theme={theme}>
                <QRCode
                    pixelRatio={25}
                    onClick={OnClick}
                    address="ecash:qqyumjtrftl5yfdwuglhq6l9af2ner39jqr0wexwyk"
                    legacy={true}
                />
            </ThemeProvider>,
        );

        const qrCodeElement = container.querySelector('#borderedQRCode');
        fireEvent.click(qrCodeElement);

        act(() => {
            jest.runAllTimers();
        });
        expect(OnClick).toHaveBeenCalled();
        expect(setTimeout).toHaveBeenCalled();
    });

    it('QRCode copying eToken address', () => {
        const OnClick = jest.fn();
        const { container } = render(
            <ThemeProvider theme={theme}>
                <QRCode
                    pixelRatio={25}
                    onClick={OnClick}
                    address="etoken:qqyumjtrftl5yfdwuglhq6l9af2ner39jqd38msfqp"
                    legacy={true}
                />
            </ThemeProvider>,
        );
        const qrCodeElement = container.querySelector('#borderedQRCode');
        fireEvent.click(qrCodeElement);
        expect(OnClick).toHaveBeenCalled();
    });

    it('QRCode without address', () => {
        const { container } = render(
            <ThemeProvider theme={theme}>
                <QRCode pixelRatio={25} />
            </ThemeProvider>,
        );

        const qrCodeElement = container.querySelector('#borderedQRCode');
        fireEvent.click(qrCodeElement);
        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1500);
        expect(setTimeout).toHaveBeenCalled();
    });
});
