// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

fn main() -> std::io::Result<()> {
    prost_build::compile_protos(&["proto/chronik.proto"], &["proto"])?;
    println!("cargo:rerun-if-changed=proto/chronik.proto");
    Ok(())
}
