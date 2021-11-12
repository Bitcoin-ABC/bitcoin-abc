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

    sudo apt-get install imagemagick libbz2-dev libcap-dev librsvg2-bin libtiff-tools libtinfo5 python3-setuptools

#### For Win64 cross compilation

- see [build-windows.md](../doc/build-windows.md#cross-compilation-for-ubuntu-and-windows-subsystem-for-linux)

#### For linux cross compilation

Common linux dependencies:

    sudo apt-get install gperf

For linux 32 bits cross compilation:

First add the i386 architecture to `dpkg`:

    sudo dpkg --add-architecture i386
    sudo apt-get update

Then install the dependencies:

    sudo apt-get install lib32stdc++-8-dev libc6-dev:i386

For linux ARM cross compilation:

    sudo apt-get install g++-arm-linux-gnueabihf

For linux AARCH64 cross compilation:

    sudo apt-get install g++-aarch64-linux-gnu


### Dependency Options

The following can be set when running make: `make FOO=bar`

<dl>
<dt>SOURCES_PATH</dt>
<dd>downloaded sources will be placed here</dd>
<dt>BASE_CACHE</dt>
<dd>built packages will be placed here</dd>
<dt>SDK_PATH</dt>
<dd>Path where sdk's can be found (used by macOS)</dd>
<dt>FALLBACK_DOWNLOAD_PATH</dt>
<dd>If a source file can't be fetched, try here before giving up</dd>
<dt>NO_QT</dt>
<dd>Don't download/build/cache qt and its dependencies</dd>
<dt>NO_QR</dt>
<dd>Don't download/build/cache packages needed for enabling qrencode</dd>
<dt>NO_ZMQ</dt>
<dd>Don't download/build/cache packages needed for enabling zeromq</dd>
<dt>NO_WALLET</dt>
<dd>Don't download/build/cache libs needed to enable the wallet</dd>
<dt>NO_BDB</dt>
<dd>Don't download/build/cache BerkeleyDB</dd>
<dt>NO_SQLITE</dt>
<dd>Don't download/build/cache SQLite</dd>
<dt>NO_UPNP</dt>
<dd>Don't download/build/cache packages needed for enabling upnp</dd>
<dt>NO_JEMALLOC</dt>
<dd>Don't download/build/cache jemalloc</dd>
<dt>DEBUG</dt>
<dd>disable some optimizations and enable more runtime checking</dd>
<dt>NO_PROTOBUF</dt>
<dd>Don't download/build/cache protobuf (used for BIP70 support)</dd>
<dt>HOST_ID_SALT</dt>
<dd>Optional salt to use when generating host package ids</dd>
<dt>BUILD_ID_SALT</dt>
<dd>Optional salt to use when generating build package ids</dd>
<dt>JOBS</dt>
<dd>Number of jobs to use for each package build</dd>
<dt>FORCE_USE_SYSTEM_CLANG</dt>
<dd>(EXPERTS ONLY) When cross-compiling for macOS, use Clang found in the
 system's <code>$PATH</code> rather than the default prebuilt release of Clang
 from llvm.org. Clang 8 or later is required.</dd>
</dl>

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

