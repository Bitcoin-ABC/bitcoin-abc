// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { MockChronikClient } from 'mock-chronik-client';

import {
    COORDINATOR_ENV_USAGE,
    CoordinatorConfigError,
    isWildcardBind,
    parseCoordinatorEnv,
    startCoordinator,
} from '../../src/cli/coordinator.js';
import {
    DEFAULT_CONTROL_PORT,
    DEFAULT_COVERT_PORT,
    DEFAULT_MIN_PLAYERS,
} from '../../src/protocol/constants.js';

const CHRONIK = 'https://chronik.example';

function expectConfigError(fn: () => unknown, snippet: string, exitCode = 1) {
    let threw: unknown;
    try {
        fn();
    } catch (err) {
        threw = err;
    }
    expect(threw).to.be.instanceOf(CoordinatorConfigError);
    const err = threw as CoordinatorConfigError;
    expect(err.message).to.include(snippet);
    expect(err.exitCode).to.equal(exitCode);
}

describe('isWildcardBind', () => {
    it('uses Node net.BlockList for unspecified IPv4 and IPv6 spellings', () => {
        expect(isWildcardBind('0.0.0.0')).to.equal(true);
        expect(isWildcardBind('::')).to.equal(true);
        expect(isWildcardBind('[::]')).to.equal(true);
        expect(isWildcardBind('0:0:0:0:0:0:0:0')).to.equal(true);
        expect(isWildcardBind('::0.0.0.0')).to.equal(true);
        expect(isWildcardBind('127.0.0.1')).to.equal(false);
        expect(isWildcardBind('::1')).to.equal(false);
        expect(isWildcardBind('fusion.example')).to.equal(false);
    });
});

describe('parseCoordinatorEnv', () => {
    it('requires CHRONIK_URLS', () => {
        expectConfigError(
            () => parseCoordinatorEnv({}),
            'CHRONIK_URLS is required',
        );
    });

    it('fills defaults for host, ports, and minPlayers', () => {
        expect(parseCoordinatorEnv({ CHRONIK_URLS: CHRONIK })).to.deep.equal({
            chronikUrls: [CHRONIK],
            host: '127.0.0.1',
            covertDomain: '127.0.0.1',
            controlPort: DEFAULT_CONTROL_PORT,
            covertPort: DEFAULT_COVERT_PORT,
            minPlayers: DEFAULT_MIN_PLAYERS,
        });
    });

    it('accepts comma-separated Chronik URLs and lab overrides', () => {
        expect(
            parseCoordinatorEnv({
                CHRONIK_URLS: `${CHRONIK}, http://127.0.0.1:8212`,
                HOST: '0.0.0.0',
                COVERT_DOMAIN: 'fusion.example',
                CONTROL_PORT: '0',
                COVERT_PORT: '9001',
                MIN_PLAYERS: '2',
            }),
        ).to.deep.equal({
            chronikUrls: [CHRONIK, 'http://127.0.0.1:8212'],
            host: '0.0.0.0',
            covertDomain: 'fusion.example',
            controlPort: 0,
            covertPort: 9001,
            minPlayers: 2,
        });
    });

    it('rejects a Chronik URL with a trailing slash', () => {
        expectConfigError(
            () => parseCoordinatorEnv({ CHRONIK_URLS: `${CHRONIK}/` }),
            "cannot end with '/'",
        );
    });

    it('rejects a Chronik URL without http(s)', () => {
        expectConfigError(
            () => parseCoordinatorEnv({ CHRONIK_URLS: 'chronik.example' }),
            "must start with 'https://' or 'http://'",
        );
    });

    it('rejects an empty HOST', () => {
        expectConfigError(
            () => parseCoordinatorEnv({ CHRONIK_URLS: CHRONIK, HOST: '  ' }),
            'HOST must be non-empty',
        );
    });

    it('requires COVERT_DOMAIN when HOST is a wildcard', () => {
        expectConfigError(
            () =>
                parseCoordinatorEnv({
                    CHRONIK_URLS: CHRONIK,
                    HOST: '0.0.0.0',
                }),
            'set COVERT_DOMAIN',
        );
        expectConfigError(
            () =>
                parseCoordinatorEnv({
                    CHRONIK_URLS: CHRONIK,
                    HOST: '::',
                }),
            'set COVERT_DOMAIN',
        );
        expectConfigError(
            () =>
                parseCoordinatorEnv({
                    CHRONIK_URLS: CHRONIK,
                    HOST: '0:0:0:0:0:0:0:0',
                }),
            'set COVERT_DOMAIN',
        );
    });

    it('rejects a wildcard COVERT_DOMAIN', () => {
        expectConfigError(
            () =>
                parseCoordinatorEnv({
                    CHRONIK_URLS: CHRONIK,
                    COVERT_DOMAIN: '0.0.0.0',
                }),
            'must be a reachable host',
        );
    });

    it('rejects an empty COVERT_DOMAIN', () => {
        expectConfigError(
            () =>
                parseCoordinatorEnv({
                    CHRONIK_URLS: CHRONIK,
                    COVERT_DOMAIN: '  ',
                }),
            'COVERT_DOMAIN must be non-empty',
        );
    });

    it('rejects a non-integer CONTROL_PORT', () => {
        expectConfigError(
            () =>
                parseCoordinatorEnv({
                    CHRONIK_URLS: CHRONIK,
                    CONTROL_PORT: 'nope',
                }),
            'CONTROL_PORT must be an integer',
        );
    });

    it('rejects a port above 65535', () => {
        expectConfigError(
            () =>
                parseCoordinatorEnv({
                    CHRONIK_URLS: CHRONIK,
                    COVERT_PORT: '65536',
                }),
            'COVERT_PORT must be 0-65535',
        );
    });

    it('rejects MIN_PLAYERS below 2', () => {
        expectConfigError(
            () =>
                parseCoordinatorEnv({
                    CHRONIK_URLS: CHRONIK,
                    MIN_PLAYERS: '1',
                }),
            'MIN_PLAYERS must be an integer >= 2',
        );
    });

    it('prints usage on --help with exitCode 0', () => {
        expectConfigError(
            () => parseCoordinatorEnv({ CHRONIK_URLS: CHRONIK }, ['--help']),
            COORDINATOR_ENV_USAGE.trim(),
            0,
        );
    });

    it('rejects unexpected argv', () => {
        expectConfigError(
            () => parseCoordinatorEnv({ CHRONIK_URLS: CHRONIK }, ['--tls']),
            'Unexpected argument',
        );
    });
});

describe('startCoordinator', () => {
    it('binds control + covert and logs the ports', async () => {
        const lines: string[] = [];
        const started = await startCoordinator(
            parseCoordinatorEnv({
                CHRONIK_URLS: CHRONIK,
                CONTROL_PORT: '0',
                COVERT_PORT: '0',
                MIN_PLAYERS: '2',
            }),
            {
                createChronik: () => new MockChronikClient(),
                log: line => {
                    lines.push(line);
                },
            },
        );
        try {
            expect(started.controlPort).to.be.greaterThan(0);
            expect(started.covertPort).to.be.greaterThan(0);
            expect(started.covertPort).to.not.equal(started.controlPort);
            expect(started.coordinator.sessionCount).to.equal(0);
            expect(started.config.minPlayers).to.equal(2);
            expect(started.config.covertDomain).to.equal('127.0.0.1');
            expect(lines[0]).to.include('bind=127.0.0.1');
            expect(lines[0]).to.include(`control=${started.controlPort}`);
            expect(lines[0]).to.include(`covert=${started.covertPort}`);
            expect(lines[0]).to.include('advertise=127.0.0.1');
            expect(lines[0]).to.include('minPlayers=2');
        } finally {
            await started.coordinator.close();
        }
    });

    it('binds a wildcard and advertises COVERT_DOMAIN separately', async () => {
        const lines: string[] = [];
        const started = await startCoordinator(
            parseCoordinatorEnv({
                CHRONIK_URLS: CHRONIK,
                HOST: '0.0.0.0',
                COVERT_DOMAIN: '127.0.0.1',
                CONTROL_PORT: '0',
                COVERT_PORT: '0',
                MIN_PLAYERS: '2',
            }),
            {
                createChronik: () => new MockChronikClient(),
                log: line => {
                    lines.push(line);
                },
            },
        );
        try {
            expect(started.config.host).to.equal('0.0.0.0');
            expect(started.config.covertDomain).to.equal('127.0.0.1');
            expect(lines[0]).to.include('bind=0.0.0.0');
            expect(lines[0]).to.include('advertise=127.0.0.1');
        } finally {
            await started.coordinator.close();
        }
    });

    it('closes after a bind failure', async () => {
        let threw: unknown;
        try {
            await startCoordinator(
                parseCoordinatorEnv({
                    CHRONIK_URLS: CHRONIK,
                    HOST: '256.256.256.256',
                }),
                { createChronik: () => new MockChronikClient() },
            );
        } catch (err) {
            threw = err;
        }
        expect(threw).to.be.instanceOf(CoordinatorConfigError);
        expect((threw as CoordinatorConfigError).message).to.include(
            'Failed to start coordinator',
        );
    });
});
