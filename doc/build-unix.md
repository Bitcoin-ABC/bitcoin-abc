UNIX BUILD NOTES
====================
Some notes on how to build Bitcoin ABC in Unix.

(For FreeBSD specific instructions, see `build-freebsd.md` in this directory.)

To Build
---------------------

Before you start building, please make sure that your compiler supports C++14.

It is recommended to create a build directory to build out-of-tree.

```bash
mkdir build
cd build
cmake -GNinja ..
ninja
ninja install # optional
```

This will build bitcoin-qt as well.

Dependencies
---------------------

These dependencies are required:

 Library     | Purpose          | Description
 ------------|------------------|----------------------
 libssl      | Crypto           | Random Number Generation, Elliptic Curve Cryptography
 libboost    | Utility          | Library for threading, data structures, etc
 libevent    | Networking       | OS independent asynchronous networking

Optional dependencies:

 Library     | Purpose          | Description
 ------------|------------------|----------------------
 miniupnpc   | UPnP Support     | Firewall-jumping support
 libdb       | Berkeley DB      | Wallet storage (only needed when wallet enabled)
 qt          | GUI              | GUI toolkit (only needed when GUI enabled)
 protobuf    | Payments in GUI  | Data interchange format used for payment protocol (only needed when GUI enabled)
 libqrencode | QR codes in GUI  | Optional for generating QR codes (only needed when GUI enabled)
 univalue    | Utility          | JSON parsing and encoding (bundled version will be used unless --with-system-univalue passed to configure)
 libzmq3     | ZMQ notification | Optional, allows generating ZMQ notifications (requires ZMQ version >= 4.x)

For the versions used, see [dependencies.md](dependencies.md)

Memory Requirements
--------------------

C++ compilers are memory-hungry. It is recommended to have at least 1.5 GB of
memory available when compiling Bitcoin ABC. On systems with less, gcc can be
tuned to conserve memory with additional CXXFLAGS:

    cmake -GNinja .. -DCXXFLAGS="--param ggc-min-expand=1 --param ggc-min-heapsize=32768"

Dependency Build Instructions: Ubuntu & Debian
----------------------------------------------
Build requirements:

    sudo apt-get install bsdmainutils build-essential libssl-dev libevent-dev ninja-build python3

On Debian Buster (10) or Ubuntu 19.04 and later:

    sudo apt-get install cmake

On previous Ubuntu versions, the `cmake` package is too old and needs to be installed from the Kitware APT repository:

    sudo apt-get install apt-transport-https ca-certificates gnupg software-properties-common wget
    wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc 2>/dev/null | sudo apt-key add -

Add the repository corresponding to your version (see [instructions from Kitware](https://apt.kitware.com)). For Ubuntu Bionic (18.04):

    sudo apt-add-repository 'deb https://apt.kitware.com/ubuntu/ bionic main'

Then update the package list and install `cmake`:

    sudo apt update
    sudo apt install cmake

Now, you can either build from self-compiled [depends](/depends/README.md) or
install the required dependencies with the following instructions.

Options when installing required Boost library files:

1. On at least Ubuntu 16.04+ and Debian 9+ there are generic names for the
individual boost development packages, so the following can be used to only
install necessary parts of boost:

        sudo apt-get install libboost-system-dev libboost-filesystem-dev libboost-chrono-dev libboost-test-dev libboost-thread-dev

2. If that doesn't work, you can install all boost development packages with:

        sudo apt-get install libboost-all-dev

BerkeleyDB 5.3 or later is required for the wallet. This can be installed with:

        sudo apt-get install libdb-dev libdb++-dev

See the section "Disable-wallet mode" to build Bitcoin ABC without wallet.

Minipupnc dependencies (can be disabled by passing `-DENABLE_UPNP=OFF` on the cmake command line):

    sudo apt-get install libminiupnpc-dev

ZMQ dependencies (provides ZMQ API 4.x, can be disabled by passing `-BUILD_BITCOIN_ZMQ=OFF` on the cmake command line):

    sudo apt-get install libzmq3-dev

Dependencies for the GUI: Ubuntu & Debian
-----------------------------------------

If you want to build bitcoin-qt, make sure that the required packages for Qt development
are installed. Qt 5 is necessary to build the GUI.
To build without GUI pass `-DBUILD_BITCOIN_QT=OFF` on the cmake command line.

To build with Qt 5 you need the following:

    sudo apt-get install libqt5gui5 libqt5core5a libqt5dbus5 qttools5-dev qttools5-dev-tools libprotobuf-dev protobuf-compiler

libqrencode dependencies (can be disabled by passing `-DENABLE_QRCODE=OFF` on the cmake command line):

    sudo apt-get install libqrencode-dev

Dependency Build Instructions: Fedora
-------------------------------------
Build requirements:

    sudo dnf install boost-devel cmake gcc-c++ libdb-cxx-devel libdb-devel libevent-devel ninja-build openssl-devel python3

Minipupnc dependencies (can be disabled by passing `-DENABLE_UPNP=OFF` on the cmake command line):

    sudo dnf install miniupnpc-devel

ZMQ dependencies (can be disabled by passing `-BUILD_BITCOIN_ZMQ=OFF` on the cmake command line):

    sudo dnf install zeromq-devel

To build with Qt 5 you need the following:

    sudo dnf install qt5-qttools-devel qt5-qtbase-devel protobuf-devel

libqrencode dependencies (can be disabled by passing `-DENABLE_QRCODE=OFF`):

    sudo dnf install qrencode-devel

Notes
-----
The release is built with GCC and then "strip bitcoind" to strip the debug
symbols, which reduces the executable size by about 90%.


miniupnpc
---------

[miniupnpc](http://miniupnp.free.fr/) may be used for UPnP port mapping.  It can be downloaded from [here](
http://miniupnp.tuxfamily.org/files/).  UPnP support is compiled in and
turned off by default.  See the cmake options for upnp behavior desired:

    ENABLE_UPNP            Enable UPnP support (miniupnp required, default ON)
    START_WITH_UPNP        UPnP support turned on by default at runtime (default OFF)

Boost
-----
For documentation on building Boost look at their official documentation: http://www.boost.org/build/doc/html/bbv2/installation.html

Security
--------
To help make your Bitcoin ABC installation more secure by making certain attacks impossible to
exploit even if a vulnerability is found, binaries are hardened by default.
This can be disabled by passing `-DENABLE_HARDENING=OFF`.

Hardening enables the following features:
* _Position Independent Executable_: Build position independent code to take advantage of Address Space Layout Randomization
    offered by some kernels. Attackers who can cause execution of code at an arbitrary memory
    location are thwarted if they don't know where anything useful is located.
    The stack and heap are randomly located by default, but this allows the code section to be
    randomly located as well.

    On an AMD64 processor where a library was not compiled with -fPIC, this will cause an error
    such as: "relocation R_X86_64_32 against `......' can not be used when making a shared object;"

    To test that you have built PIE executable, install scanelf, part of paxutils, and use:

      scanelf -e ./bitcoin

    The output should contain:

      TYPE
      ET_DYN

* _Non-executable Stack_: If the stack is executable then trivial stack-based buffer overflow exploits are possible if
    vulnerable buffers are found. By default, Bitcoin ABC should be built with a non-executable stack,
    but if one of the libraries it uses asks for an executable stack or someone makes a mistake
    and uses a compiler extension which requires an executable stack, it will silently build an
    executable without the non-executable stack protection.

    To verify that the stack is non-executable after compiling use:

      scanelf -e ./bitcoin

    The output should contain:

      STK/REL/PTL
      RW- R-- RW-

    The `STK RW-` means that the stack is readable and writeable but not executable.

Disable-wallet mode
--------------------
When the intention is to run only a P2P node without a wallet, Bitcoin ABC may be compiled in
disable-wallet mode by passing `-DBUILD_BITCOIN_WALLET=OFF` on the cmake command line.

Mining is also possible in disable-wallet mode using the `getblocktemplate` RPC call.

Additional cmake options
--------------------------
A list of the cmake options and their current value can be displayed.
From the build subdirectory (see above), run `cmake -LH ..`.

Setup and Build Example: Arch Linux
-----------------------------------
This example lists the steps necessary to setup and build a command line only, non-wallet distribution of the latest changes on Arch Linux:

    pacman -S boost cmake git libevent ninja python
    git clone https://github.com/Bitcoin-ABC/bitcoin-abc.git
    cd bitcoin-abc/
    mkdir build
    cd build
    cmake -GNinja .. -DBUILD_BITCOIN_WALLET=OFF -DBUILD_BITCOIN_QT=OFF -DENABLE_UPNP=OFF -DBUILD_BITCOIN_ZMQ=OFF
    ninja


ARM Cross-compilation
-------------------
These steps can be performed on, for example, a Debian VM. The depends system
will also work on other Linux distributions, however the commands for
installing the toolchain will be different.

Make sure you install all the build requirements mentioned above.
Then, install the toolchain and some additional dependencies:

    sudo apt-get install autoconf automake curl g++-arm-linux-gnueabihf gcc-arm-linux-gnueabihf gperf pkg-config

To build executables for ARM:

    cd depends
    make build-linux-arm
    cd ..
    mkdir build
    cd build
    cmake -GNinja .. -DCMAKE_TOOLCHAIN_FILE=../cmake/platforms/LinuxARM.cmake -DENABLE_GLIBC_BACK_COMPAT=ON -DENABLE_STATIC_LIBSTDCXX=ON
    ninja


For further documentation on the depends system see [README.md](../depends/README.md) in the depends directory.
