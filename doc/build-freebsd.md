FreeBSD build guide
======================
(updated for FreeBSD 11.1)

This guide describes how to build bitcoind and command-line utilities on FreeBSD.

This guide does not contain instructions for building the GUI.

## Preparation

You will need the following dependencies, which can be installed as root via pkg:

```
pkg install autoconf automake boost-libs gmake libevent libtool openssl pkgconf
```

In order to run the test suite (recommended), you will need to have Python 3 installed:

```
pkg install python3
```

For the wallet (optional):

```
pkg install db5
```

Download the source code:
refer to [CONTRIBUTING](../CONTRIBUTING.md) for instructions on how to clone the Bitcoin ABC repository

## Building Bitcoin ABC

**Important**: Use `gmake` (the non-GNU `make` will exit with an error).

```
./autogen.sh
```

With wallet support:

```
./configure CXXFLAGS="-I/usr/local/include" BDB_CFLAGS="-I/usr/local/include/db5" BDB_LIBS="-L/usr/local/lib -ldb_cxx-5"
```

Without wallet support:

```
./configure --disable-wallet CXXFLAGS="-I/usr/local/include"
```

followed by either:

```
gmake
```

to build without testing, or

```
gmake check
```

to also run the test suite (recommended, if Python 3 is installed).

*Note on debugging*: The version of `gdb` installed by default is [ancient and considered harmful](https://wiki.freebsd.org/GdbRetirement).
It is not suitable for debugging a multi-threaded C++ program, not even for getting backtraces. Please install the package `gdb` and
use the versioned gdb command (e.g. `gdb7111`).
