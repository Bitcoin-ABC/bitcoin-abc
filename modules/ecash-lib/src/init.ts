// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import __wbg_init from './ffi/ecash_lib_wasm.js';

/** Load and initialize the WASM module */
export async function initWasm() {
    if (typeof window === 'undefined') {
        // On Node, read the file off the disk
        const fs = await import('node:fs/promises');
        const wasmUrl = new URL('ffi/ecash_lib_wasm_bg.wasm', import.meta.url);
        return await __wbg_init(fs.readFile(wasmUrl));
    } else {
        // Browser, use default, will use fetch internally
        return await __wbg_init();
    }
}
