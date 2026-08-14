// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import Modal from 'components/Common/Modal';
import {
    getAppUpdatePrompt,
    openAppStoreListing,
    type AppUpdatePromptInfo,
} from 'services/storeVersionService';

export const APP_UPDATE_MODAL_TITLE = 'Update available';

/**
 * On native Android launches, show a dismissable modal when the install
 * is behind the latest published Play Store (or hosted) version.
 * iOS is not prompted: there is no App Store listing yet.
 */
const AppUpdatePrompt: React.FC = () => {
    const [prompt, setPrompt] = useState<AppUpdatePromptInfo | null>(null);
    const dismissedRef = useRef(false);

    const checkForUpdate = useCallback(async (): Promise<void> => {
        if (dismissedRef.current) {
            return;
        }
        try {
            const nextPrompt = await getAppUpdatePrompt();
            if (dismissedRef.current) {
                return;
            }
            setPrompt(nextPrompt);
        } catch {
            // Never block app launch on a failed version check.
        }
    }, []);

    useEffect(() => {
        if (!Capacitor.isNativePlatform() || import.meta.env.DEV) {
            return;
        }

        let cancelled = false;
        let listenerHandle: PluginListenerHandle | undefined;

        const runCheck = (): void => {
            if (cancelled) {
                return;
            }
            void checkForUpdate();
        };

        runCheck();

        void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                runCheck();
            }
        }).then(handle => {
            if (cancelled) {
                void handle.remove();
                return;
            }
            listenerHandle = handle;
        });

        return () => {
            cancelled = true;
            void listenerHandle?.remove();
        };
    }, [checkForUpdate]);

    const handleLater = (): void => {
        dismissedRef.current = true;
        setPrompt(null);
    };

    const handleUpdate = (): void => {
        if (prompt === null) {
            return;
        }
        void openAppStoreListing(prompt.storeUrl);
    };

    if (prompt === null) {
        return null;
    }

    return (
        <Modal
            title={APP_UPDATE_MODAL_TITLE}
            description={`Version ${prompt.latestVersion} is available. You're on ${prompt.installedVersion}. Update to get the latest features and fixes.`}
            handleOk={handleUpdate}
            handleCancel={handleLater}
            showCancelButton
            okText="Update"
            cancelText="Later"
        />
    );
};

export default AppUpdatePrompt;
