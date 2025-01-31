// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { __setEcc } from './ecc.js';
import __wbg_init, * as ffi from './ffi/ecash_lib_wasm_browser.js';
import { __setHashes } from './hash.js';

/**
 * Load and initialize the WASM module for Web.
 *
 * Some bundlers can't handle WebAssembly yet (at the time of writing, vite).
 * If you run into "CompileError: expected magic word 00 61 73 6d", you can
 * provide a custom WASM URL or module:
 * import ecashLibWasmUrl from 'ecash-lib/dist/ffi/ecash_lib_wasm_bg_browser.wasm?url';
 * await initWasm(ecashLibWasmUrl);
 **/
export async function initWasm(
    module_or_path?: ffi.InitInput | Promise<ffi.InitInput>,
) {
    await __wbg_init(module_or_path);
    __setEcc(ffi.Ecc);
    __setHashes({
        sha256: ffi.sha256,
        sha256d: ffi.sha256d,
        shaRmd160: ffi.shaRmd160,
        sha512: ffi.sha512,
        Sha256H: ffi.Sha256H,
        Sha512H: ffi.Sha512H,
    });
}
