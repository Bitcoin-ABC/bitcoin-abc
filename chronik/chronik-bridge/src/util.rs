// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for bridge utilities

/// Unwrap the given std::unique_ptr as a C++ reference, panicing if it's null.
pub fn expect_unique_ptr<'ptr, T: cxx::memory::UniquePtrTarget>(
    name: &str,
    uptr: &'ptr cxx::UniquePtr<T>,
) -> &'ptr T {
    uptr.as_ref()
        .unwrap_or_else(|| panic!("{name} returned a null std::unique_ptr"))
}
