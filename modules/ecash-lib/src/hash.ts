// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as ffi from './ffi/ecash_lib_wasm.js';

export const sha256 = ffi.sha256;
export const sha256d = ffi.sha256d;
export const shaRmd160 = ffi.shaRmd160;
