// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import JSDOMEnvironment from 'jest-environment-jsdom';
import { TextEncoder, TextDecoder } from 'util';

export default class CustomEnvironment extends JSDOMEnvironment {
    constructor(config, context) {
        super(config, context);
        this.testPath = context.testPath;
        this.docblockPragmas = context.docblockPragmas;
        // FIXME https://github.com/jsdom/jsdom/issues/3363
        this.global.structuredClone = structuredClone;
    }

    async setup() {
        await super.setup();
        this.global.Uint8Array = Uint8Array;
        this.global.ArrayBuffer = ArrayBuffer;
        this.global.TextEncoder = TextEncoder;
        this.global.TextDecoder = TextDecoder;
    }

    async teardown() {
        await super.teardown();
    }

    getVmContext() {
        return super.getVmContext();
    }
}
