import React, { useState, useEffect } from 'react';
import { Modal } from 'antd';
import * as serviceWorkerRegistration from 'serviceWorkerRegistration';

const ServiceWorkerWrapper = () => {
    const [showReloadModal, setShowReloadModal] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState(null);

    const onSWUpdate = registration => {
        setShowReloadModal(true);
        setWaitingWorker(registration.waiting);
    };

    useEffect(() => {
        serviceWorkerRegistration.register({ onUpdate: onSWUpdate });
    }, []);

    const reloadPage = () => {
        waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
        setShowReloadModal(false);
        window.location.reload(true);
    };

    return (
        <Modal
            title="Reload"
            open={showReloadModal}
            onOk={reloadPage}
            onCancel={reloadPage}
            cancelButtonProps={{ style: { display: 'none' } }}
        >
            <p>
                A new version of Cashtab is available. Refresh or click OK to
                load.
            </p>
        </Modal>
    );
};

export default ServiceWorkerWrapper;
