// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { useState, useEffect } from 'react';
import UpgradeModal from 'components/Common/UpgradeModal';
import * as serviceWorkerRegistration from 'serviceWorkerRegistration';

const ServiceWorkerWrapper: React.FC = () => {
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
        null,
    );
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const onSWUpdate = (registration: ServiceWorkerRegistration) => {
        setShowUpgradeModal(true);
        setWaitingWorker(registration.waiting);
    };

    useEffect(() => {
        serviceWorkerRegistration.register({ onUpdate: onSWUpdate });
    }, []);

    interface FirefoxLocation {
        reload(forceReload?: boolean): void;
    }

    const reloadPage = () => {
        waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
        setShowUpgradeModal(false);
        // Note this is only supported in Firefox, which is why the "update" modal
        // occasionally will not work without a traditional "hard" refresh, i.e.
        // ctrl+shift+r in chrome/brave desktop
        (window.location as FirefoxLocation).reload(true);
    };

    return showUpgradeModal ? (
        <UpgradeModal
            handleOk={reloadPage}
            handleCancel={() => setShowUpgradeModal(false)}
        />
    ) : null;
};

export default ServiceWorkerWrapper;
