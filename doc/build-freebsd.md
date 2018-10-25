FreeBSD build guide
======================
(updated for FreeBSD 12.0)

This guide describes how to build bitcoind and command-line utilities on FreeBSD.

This guide does not contain instructions for building the GUI.

## Preparation

You will need the following dependencies, which can be installed as root via pkg:

```shell
pkg install autoconf automake boost-libs gmake libevent libtool openssl pkgconf
```

In order to run the test suite (recommended), you will need to have Python 3 installed:

```shell
pkg install python3
```

For the wallet (optional):

```shell
pkg install db5
```

Download the source code:
refer to [CONTRIBUTING](../CONTRIBUTING.md) for instructions on how to clone the Bitcoin ABC repository

## Building Bitcoin ABC

**Important**: Use `gmake` (the non-GNU `make` will exit with an error):

With wallet:

```shell
./autogen.sh
./configure --with-gui=no \
    CXXFLAGS="-I/usr/local/include" \
    BDB_CFLAGS="-I/usr/local/include/db5" \
    BDB_LIBS="-L/usr/local/lib -ldb_cxx-5"
```

Without wallet:

```shell
./autogen.sh
./configure --with-gui=no --disable-wallet
```

followed by:

```shell
gmake # use -jX here for parallelism
gmake check # Run tests if Python 3 is available
```
