// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import winston from 'winston';

const timestampFormat = winston.format.timestamp({
    format: 'MMM DD HH:mm:ss',
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        timestampFormat,
        winston.format.errors({ stack: true }),
        winston.format.printf(({ level, message, timestamp, stack }) => {
            const body = stack || message;
            return `${timestamp} ${level}: ${body}`;
        }),
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        timestampFormat,
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack }) => {
            const body = stack || message;
            return `${timestamp} ${level}: ${body}`;
        }),
    ),
});

// Ignore EPIPE when stdout is piped and closed early
consoleTransport.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') {
        return;
    }
    throw err;
});

logger.add(consoleTransport);

process.stdout.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') {
        return;
    }
});

export default logger;
