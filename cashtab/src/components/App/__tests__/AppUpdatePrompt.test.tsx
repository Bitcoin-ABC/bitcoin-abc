// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ANDROID_STORE_URL } from 'constants/store';

const mockIsNativePlatform = jest.fn(() => true);
const mockAddListener = jest.fn();
const mockGetAppUpdatePrompt = jest.fn();
const mockOpenAppStoreListing = jest.fn();

jest.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => mockIsNativePlatform(),
    },
}));

jest.mock('@capacitor/app', () => ({
    App: {
        addListener: (...args: unknown[]) => mockAddListener(...args),
    },
}));

jest.mock('services/storeVersionService', () => ({
    getAppUpdatePrompt: (...args: unknown[]) => mockGetAppUpdatePrompt(...args),
    openAppStoreListing: (...args: unknown[]) =>
        mockOpenAppStoreListing(...args),
}));

import AppUpdatePrompt, {
    APP_UPDATE_MODAL_TITLE,
} from 'components/App/AppUpdatePrompt';

const renderPrompt = () =>
    render(
        <ThemeProvider theme={theme}>
            <AppUpdatePrompt />
        </ThemeProvider>,
    );

describe('<AppUpdatePrompt />', () => {
    beforeEach(() => {
        mockIsNativePlatform.mockReturnValue(true);
        mockGetAppUpdatePrompt.mockReset();
        mockOpenAppStoreListing.mockReset();
        mockAddListener.mockReset();
        mockAddListener.mockResolvedValue({ remove: jest.fn() });
    });

    it('does not check for updates on web', () => {
        mockIsNativePlatform.mockReturnValue(false);
        renderPrompt();
        expect(mockGetAppUpdatePrompt).not.toHaveBeenCalled();
    });

    it('shows the modal when a native install is outdated', async () => {
        mockGetAppUpdatePrompt.mockResolvedValue({
            installedVersion: '5.24.0',
            latestVersion: '5.25.0',
            storeUrl: ANDROID_STORE_URL,
        });
        renderPrompt();

        expect(
            await screen.findByText(APP_UPDATE_MODAL_TITLE),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Version 5.25.0 is available. You're on 5.24.0./),
        ).toBeInTheDocument();
    });

    it('stays hidden when the install is current', async () => {
        mockGetAppUpdatePrompt.mockResolvedValue(null);
        renderPrompt();
        await waitFor(() => {
            expect(mockGetAppUpdatePrompt).toHaveBeenCalled();
        });
        expect(
            screen.queryByText(APP_UPDATE_MODAL_TITLE),
        ).not.toBeInTheDocument();
    });

    it('dismisses on Later and does not reopen', async () => {
        const user = userEvent.setup();
        mockGetAppUpdatePrompt.mockResolvedValue({
            installedVersion: '5.24.0',
            latestVersion: '5.25.0',
            storeUrl: ANDROID_STORE_URL,
        });
        renderPrompt();
        expect(
            await screen.findByText(APP_UPDATE_MODAL_TITLE),
        ).toBeInTheDocument();

        await user.click(screen.getByText('Later'));
        expect(
            screen.queryByText(APP_UPDATE_MODAL_TITLE),
        ).not.toBeInTheDocument();
        expect(mockOpenAppStoreListing).not.toHaveBeenCalled();
    });

    it('opens the store listing from Update', async () => {
        const user = userEvent.setup();
        mockGetAppUpdatePrompt.mockResolvedValue({
            installedVersion: '5.24.0',
            latestVersion: '5.25.0',
            storeUrl: ANDROID_STORE_URL,
        });
        renderPrompt();
        expect(
            await screen.findByText(APP_UPDATE_MODAL_TITLE),
        ).toBeInTheDocument();

        await user.click(screen.getByText('Update'));
        expect(mockOpenAppStoreListing).toHaveBeenCalledWith(ANDROID_STORE_URL);
    });
});
