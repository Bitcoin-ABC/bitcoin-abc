import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { QRCode } from '../QRCode';
import { ThemeProvider } from 'styled-components';
import { theme } from '@assets/styles/theme';

describe('<QRCode />', () => {
    jest.useFakeTimers();

    it('QRCode copying cash address', async () => {
        const OnClick = jest.fn();
        const { container } = render(
            <ThemeProvider theme={theme}>
                <QRCode
                    pixelRatio={25}
                    onClick={OnClick}
                    address="bitcoincash:qqyumjtrftl5yfdwuglhq6l9af2ner39jq6z6ja5zp"
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

    it('QRCode copying SLP address', () => {
        const OnClick = jest.fn();
        const { container } = render(
            <ThemeProvider theme={theme}>
                <QRCode
                    pixelRatio={25}
                    onClick={OnClick}
                    address="simpleledger:qqyumjtrftl5yfdwuglhq6l9af2ner39jq6z6ja5zp"
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
