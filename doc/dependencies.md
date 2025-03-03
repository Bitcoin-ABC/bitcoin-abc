Dependencies
============

These are the dependencies currently used by Bitcoin ABC. You can find instructions for installing them in the [`build-*.md`](../INSTALL.md) file for your platform.

| Dependency | Version used | Minimum required | CVEs | Shared | [Bundled Qt library](https://doc.qt.io/qt-5/configure-options.html) |
| --- | --- | --- | --- | --- | --- |
| Berkeley DB | [5.3.28](http://www.oracle.com/technetwork/database/database-technologies/berkeleydb/downloads/index.html) | 5.3 | No |  |  |
| Boost | [1.81.0](https://www.boost.org/users/download/) | 1.64.0 | No |  |  |
| Clang |  | [5](https://releases.llvm.org/download.html) (C++17 support) |  |  |  |
| CMake |  | [3.16](https://cmake.org/download/) |  |  |  |
| fontconfig | [2.12.6](https://www.freedesktop.org/software/fontconfig/release/) |  | No | Yes |  |
| FreeType | [2.11.0](http://download.savannah.gnu.org/releases/freetype) |  | No |  |  |
| GCC |  | [8.3](https://gcc.gnu.org/) |  |  |  |
| glibc | | [2.31](https://www.gnu.org/software/libc/) |  |  |  |  |
| HarfBuzz-NG |  |  |  |  |  |
| jemalloc | [5.2.1](https://github.com/jemalloc/jemalloc/releases) | 3.6.0 |  |  |  |
| libevent | [2.1.12-stable](https://github.com/libevent/libevent/releases) | 2.1.8 | No |  |  |
| libnatpmp | commit [07004b9...](https://github.com/miniupnp/libnatpmp/commit/07004b97cf691774efebe70404cf22201e4d330d) |  | No |  |  |
| libpng |  |  |  |  | Yes |
| librsvg | |  |  |  |  |
| MiniUPnPc | [2.2.7](https://miniupnp.tuxfamily.org/files) | 1.9 | No |  |  |
| Ninja |  | [1.5.1](https://github.com/ninja-build/ninja/releases) |  |  |  |
| OpenSSL | [1.0.1k](https://www.openssl.org/source) |  | Yes |  |  |
| PCRE |  |  |  |  | Yes |
| protobuf | [21.12](https://github.com/protocolbuffers/protobuf/releases/tag/v21.12) |  | No |  |  |
| Python (tests) |  | [3.9](https://www.python.org/downloads) |  |  |  |
| qrencode | [3.4.4](https://fukuchi.org/works/qrencode) |  | No |  |  |
| Qt | [5.15.14](https://download.qt.io/official_releases/qt/) | 5.9.5 | No |  |  |
| SQLite | [3.32.1](https://sqlite.org/download.html) | 3.7.17 |  |  |  |
| systemtap ([tracing](tracing.md))| | | | | |
| XCB |  |  |  |  | Yes (Linux only) |
| xkbcommon |  |  |  |  | Yes (Linux only) |
| ZeroMQ | [4.3.1](https://github.com/zeromq/libzmq/releases) | 4.1.5 | No |  |  |
| zlib | [1.2.11](http://zlib.net/) |  |  |  | No |

Controlling dependencies
------------------------
Some dependencies are not needed in all configurations. The following are some
factors that affect the dependency list.

#### Options passed to `cmake`
* MiniUPnPc is not needed with  `-DENABLE_UPNP=OFF`.
* MiniUPnPc is not needed with  `-DENABLE_NATPMP=OFF`.
* Berkeley DB and SQLite are not needed with `-DBUILD_BITCOIN_WALLET=OFF`.
* OpenSSL is not needed with `-DENABLE_BIP70=OFF`.
* protobuf is not needed with `-DENABLE_BIP70=OFF`.
* Qt is not needed with `-DBUILD_BITCOIN_QT=OFF`.
* qrencode is not needed with `-DENABLE_QRCODE=OFF`.
* systemtap is not needed with `-DENABLE_TRACING=OFF`.
* ZeroMQ is not needed with the `-DBUILD_BITCOIN_ZMQ=OFF`.
