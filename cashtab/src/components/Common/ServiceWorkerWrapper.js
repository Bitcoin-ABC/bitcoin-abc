// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { useState, useEffect } from 'react';
import UpgradeModal from 'components/Common/UpgradeModal';
import * as serviceWorkerRegistration from 'serviceWorkerRegistration';

const ServiceWorkerWrapper = () => {
    const [waitingWorker, setWaitingWorker] = useState(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const onSWUpdate = registration => {
        setShowUpgradeModal(true);
        setWaitingWorker(registration.waiting);
    };

    useEffect(() => {
        serviceWorkerRegistration.register({ onUpdate: onSWUpdate });
    }, []);

    const reloadPage = () => {
        waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
        setShowUpgradeModal(false);
        window.location.reload(true);
    };

    return (
        showUpgradeModal && (
            <UpgradeModal
                handleOk={reloadPage}
                handleCancel={() => setShowUpgradeModal(false)}
            />
        )
    );
};

export default ServiceWorkerWrapper;
