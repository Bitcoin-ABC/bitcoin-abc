### Usage

To build dependencies for the current arch+OS:

    make

To build for another arch/OS:

    make build-<platform>

Where `<platform>` is one of the following:
 - linux64
 - linux32
 - linux-arm
 - linux-aarch64
 - osx
 - win64

For example, building the dependencies for macOS:

    make build-osx

Note that it will use all the CPU cores available on the machine by default.
This behavior can be changed by setting the `JOBS` environment variable (see
below).

To use the dependencies for building Bitcoin ABC, you need to set the platform
file to be used by `cmake`.
The platform files are located under `cmake/platforms/`.
For example, cross-building for macOS (run from the project root):

    mkdir build_osx
    cd build_osx
    cmake -GNinja .. -DCMAKE_TOOLCHAIN_FILE=../cmake/platforms/OSX.cmake
    ninja

No other options are needed, the paths are automatically configured.

### Install the required dependencies: Ubuntu & Debian

#### Common to all arch/OS

    sudo apt-get install build-essential autoconf automake cmake curl git libtool ninja-build patch pkg-config python3

#### For macOS cross compilation

    sudo apt-get install libbz2-dev libcap-dev python3-setuptools zip

#### For Win64 cross compilation

- see [build-windows.md](../doc/build-windows.md#cross-compilation-for-ubuntu-and-windows-subsystem-for-linux)

#### For linux cross compilation

Common linux dependencies:

    sudo apt-get install bison gperf

For linux 32 bits cross compilation:

First add the i386 architecture to `dpkg`:

    sudo dpkg --add-architecture i386
    sudo apt-get update

Then install the dependencies:

    sudo apt-get install lib32stdc++-10-dev libc6-dev:i386

For linux ARM cross compilation:

    sudo apt-get install g++-arm-linux-gnueabihf

For linux AARCH64 cross compilation:

    sudo apt-get install g++-aarch64-linux-gnu


### Dependency Options

The following can be set when running make: `make FOO=bar`

- `SOURCES_PATH`: Downloaded sources will be placed here
- `BASE_CACHE`: Built packages will be placed here
- `SDK_PATH`: Path where SDKs can be found (used by macOS)
- `FALLBACK_DOWNLOAD_PATH`: If a source file can't be fetched, try here before giving up
- `C_STANDARD`: Set the C standard version used. Defaults to `gnu11`.
- `CXX_STANDARD`: Set the C++ standard version used. Defaults to `c++17`.
- `NO_QT`: Don't download/build/cache Qt and its dependencies
- `NO_QR`: Don't download/build/cache packages needed for enabling qrencode
- `NO_ZMQ`: Don't download/build/cache packages needed for enabling ZeroMQ
- `NO_WALLET`: Don't download/build/cache libs needed to enable the wallet
- `NO_BDB`: Don't download/build/cache BerkeleyDB
- `NO_SQLITE`: Don't download/build/cache SQLite
- `NO_UPNP`: Don't download/build/cache packages needed for enabling UPnP
- `NO_NATPMP`: Don't download/build/cache packages needed for enabling NAT-PMP
- `NO_JEMALLOC`: Don't download/build/cache jemalloc
- `NO_CPYTHON`: Don't download/build/cache cpython
- `DEBUG`: Disable some optimizations and enable more runtime checking
- `NO_PROTOBUF`: Don't download/build/cache protobuf (used for BIP70 support)
- `NO_OPENSSL`: Don't download/build/cache OpenSSL (used for BIP70 support)
- `HOST_ID_SALT`: Optional salt to use when generating host package ids
- `BUILD_ID_SALT`: Optional salt to use when generating build package ids
- `JOBS`: Number of jobs to use for each package build
- `FORCE_USE_SYSTEM_CLANG`: (EXPERTS ONLY) When cross-compiling for macOS, use Clang found in the
  system's `$PATH` rather than the default prebuilt release of Clang
  from llvm.org. Clang 8 or later is required
- `LOG`: Use file-based logging for individual packages. During a package build its log file
  resides in the `depends` directory, and the log file is printed out automatically in case
  of build error. After successful build log files are moved along with package archives

If some packages are not built, for example by building the depends with
`make NO_WALLET=1`, the appropriate options should be set when building Bitcoin
ABC using these dependencies.
In this example, `-DBUILD_BITCOIN_WALLET=OFF` should be passed to the `cmake`
command line to ensure that the build will not fail due to missing dependencies.

Additional targets:

    download: run 'make download' to fetch all sources without building them
    download-osx: run 'make download-osx' to fetch all sources needed for macOS builds
    download-win: run 'make download-win' to fetch all sources needed for win builds
    download-linux: run 'make download-linux' to fetch all sources needed for linux builds
    build-all: build the dependencies for all the arch/OS

### Other documentation

- [description.md](description.md): General description of the depends system
- [packages.md](packages.md): Steps for adding packages

