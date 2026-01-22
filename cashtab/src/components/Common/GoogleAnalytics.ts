// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useEffect } from 'react';
import { useLocation } from 'react-router';

interface ReactGA {
    pageview: (path: string) => void;
    initialize: (trackingID: string) => void;
    event: (event: {
        category: string;
        action: string;
        label?: string;
    }) => void;
}

let ReactGA: ReactGA | undefined;
let ReactGALoaded = false;

// Lazy load react-ga for Vite compatibility (can't use require in browser)
const loadReactGA = async () => {
    if (ReactGALoaded || ReactGA !== undefined) return ReactGA;
    if (import.meta.env.VITE_BUILD_ENV !== 'extension') {
        try {
            const module = await import('react-ga');
            ReactGA = module.default || module;
            ReactGALoaded = true;
        } catch (e) {
            console.warn('Failed to load react-ga:', e);
        }
    }
    return ReactGA;
};

const RouteTracker: React.FC = () => {
    const location = useLocation();
    useEffect(() => {
        loadReactGA().then(ga => {
            if (ga) {
                ga.pageview(location.pathname + location.search);
            }
        });
    }, [location]);
    return null;
};

const init = async () => {
    const ga = await loadReactGA();
    if (typeof ga === 'undefined') {
        // We return false here to prevent rendering route tracker in non-prod and extension
        // see top level index.tsx
        // in this case ReactGA is undefined and will not have an initialize method
        return false;
    }
    const isGAEnabled = import.meta.env.PROD;
    if (isGAEnabled) {
        ga.initialize(import.meta.env.VITE_GOOGLE_ANALYTICS as string);
    }
    return isGAEnabled;
};

export const Event = (category: string, action: string, label: string) => {
    // Fire and forget - load ReactGA asynchronously and track event
    loadReactGA().then(ga => {
        if (ga) {
            ga.event({
                category,
                action,
                label,
            });
        }
    });
};

export default {
    RouteTracker,
    init,
};
