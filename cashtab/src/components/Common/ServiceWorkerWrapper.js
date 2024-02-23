import { useState, useEffect } from 'react';
import { notification } from 'antd';
import * as serviceWorkerRegistration from 'serviceWorkerRegistration';

const ServiceWorkerWrapper = () => {
    const [waitingWorker, setWaitingWorker] = useState(null);

    const onSWUpdate = registration => {
        notification.info({
            message: 'New Version Available',
            description:
                'Close this notification to update to the latest version of Cashtab',
            duration: 0,
            placement: 'topRight',
            onClose: reloadPage,
        });
        setWaitingWorker(registration.waiting);
    };

    useEffect(() => {
        serviceWorkerRegistration.register({ onUpdate: onSWUpdate });
    }, []);

    const reloadPage = () => {
        waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload(true);
    };
};

export default ServiceWorkerWrapper;
