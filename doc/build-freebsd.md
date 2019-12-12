FreeBSD build guide
======================
(updated for FreeBSD 12.0)

This guide describes how to build bitcoind and command-line utilities on FreeBSD.

This guide does not contain instructions for building the GUI.

## Preparation

You will need the following dependencies, which can be installed as root via pkg:

```shell
pkg install cmake libevent ninja openssl
```

### Optional libraries

To enable UPnP:
```shell
pkg install miniupnpc
```
If not installed, UPnP support should be disabled by passing `-DENABLE_UPNP=OFF` to `cmake`.

To enable ZeroMQ:
```shell
pkg install libzmq4
```
If not installed, ZeroMQ support should be disabled by passing `-BUILD_BITCOIN_ZMQ=OFF` to `cmake`.

In order to run the test suite (recommended), you will need to have Python 3 installed:

```shell
pkg install python3
```

To run the ZeroMQ tests:
```shell
pkg install py36-pyzmq
```

For the wallet (optional):

```shell
pkg install db5
```

Download the source code:
refer to [CONTRIBUTING](../CONTRIBUTING.md) for instructions on how to clone the Bitcoin ABC repository

## Building Bitcoin ABC

With wallet:

```shell
mkdir build
cd build
cmake -GNinja -DBUILD_BITCOIN_QT=OFF ..
ninja
```

Without wallet:

```shell
mkdir build
cd build
cmake -GNinja -DBUILD_BITCOIN_QT=OFF -DBUILD_BITCOIN_WALLET=OFF ..
ninja
```
