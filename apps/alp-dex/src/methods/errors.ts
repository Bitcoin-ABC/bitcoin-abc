// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * HTTP-aware failure for route handlers.
 *
 * Carry the status on the error so catch blocks can do
 * `res.status(error.status)` instead of mapping a marker type to 400.
 * Unexpected failures stay plain `Error` / unknown → 500, no body leak.
 */
export class HttpError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

/**
 * Bad client / quote input. Always HTTP 400.
 *
 * Throw from validation and pricing helpers instead of plain `Error`, so
 * route catch blocks do not need a blanket "wrap every Error as 400".
 */
export class ValidationError extends HttpError {
    constructor(message: string) {
        super(400, message);
        this.name = 'ValidationError';
    }
}
