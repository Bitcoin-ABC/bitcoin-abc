---
sidebar_position: 4
---

# Build Chronik

You may want to build Chronik yourself, in case we don't provide a binary for that platform or when you want to customize the Chronik build.

## UNIX/Linux

### Install dependencies

#### Rust

Chronik is written in Rust. Follow the [instructions here](https://rustup.rs/) to install it.

#### Build tools & libraries

Install CMake and required libraries on your system:

```bash
sudo apt update
sudo apt install bsdmainutils build-essential cmake libssl-dev libevent-dev lld ninja-build python3 libjemalloc-dev libboost-dev libprotobuf-dev protobuf-compiler
```

### Build (full)

See remaining required dependencies [here](https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/build-unix.md), and then run:

```bash
mkdir build
cd build
cmake -GNinja .. -DBUILD_CHRONIK=on
ninja
```

### Build (minimal)

This only builds what's necessary to run Chronik:

```bash
mkdir build
cd build
cmake -GNinja .. -DBUILD_CHRONIK=ON -DENABLE_UPNP=OFF -DENABLE_NATPMP=OFF -DBUILD_WALLET=OFF -DBUILD_QT=OFF -DBUILD_ZMQ=OFF
ninja
```

## MacOS

### Install dependencies

#### Rust

Chronik is written in Rust. Follow the [instructions here](https://rustup.rs/) to install it.

#### Preparation

1. Install Xcode from the App Store
2. Install the MacOS command line tools:

    `xcode-select --install`

    When the popup appears, click `Install`.

3. Install [Homebrew](https://brew.sh).

#### Build tools & Libraries

Install build tools and required libraries on your system:

```bash
brew install ninja cmake jemalloc boost openssl protobuf
```

### Build (minimal)

This only builds what's necessary to run Chronik:

```bash
mkdir build
cd build
cmake -GNinja .. -DBUILD_CHRONIK=ON -DENABLE_UPNP=OFF -DENABLE_NATPMP=OFF -DBUILD_WALLET=OFF -DBUILD_QT=OFF -DBUILD_ZMQ=OFF
ninja
```

:::note
On some OSX setups, RocksDB is causing linker issues. You can try setting `default-features = true` in the `rocksdb` dependency in `chronik/chronik-db/Cargo.toml`:

```toml
# Key-value database
rocksdb = { version = "0.21", default-features = true }
```

:::
