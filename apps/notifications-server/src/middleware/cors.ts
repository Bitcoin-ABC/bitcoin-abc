// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Request, Response, NextFunction } from 'express';

/** Origins allowed to call the push API from a browser / WebView. */
const ALLOWED_ORIGINS = new Set([
    // Production Cashtab web app
    'https://cashtab.com',
    'https://www.cashtab.com',
    // Capacitor Android default: androidScheme "https" + hostname "localhost"
    // (Cap 6+). That is a real WebView origin, not a browser-on-desktop URL.
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'ionic://localhost',
]);

const isAllowedOrigin = (origin: string): boolean =>
    ALLOWED_ORIGINS.has(origin);

/**
 * CORS for Cashtab web and Capacitor WebViews calling the push API.
 *
 * This is not auth. Push register/unregister is gated by address signature.
 * Browsers/WebViews refuse cross-origin fetch responses without ACAO; Cashtab
 * web (cashtab.com) and Capacitor apps (https://localhost, etc.) need those
 * origins allowlisted (same idea as Firma's exchange CORS). Non-browser
 * clients can set any Origin — that does not matter here; they still need a
 * valid signature.
 */
export const corsMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    const origin = req.get('Origin');

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (origin && isAllowedOrigin(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    } else if (!origin) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    if (req.method === 'OPTIONS') {
        if (origin && !isAllowedOrigin(origin)) {
            res.status(403).json({
                success: false,
                error: 'Origin not allowed',
            });
            return;
        }
        res.status(204).end();
        return;
    }

    if (origin && !isAllowedOrigin(origin)) {
        res.status(403).json({
            success: false,
            error: 'Origin not allowed',
        });
        return;
    }

    next();
};
