Dependencies
============

These are the dependencies currently used by Bitcoin ABC. You can find instructions for installing them in the [`build-*.md`](../INSTALL.md) file for your platform.

| Dependency | Version used | Minimum required | CVEs | Shared | [Bundled Qt library](https://doc.qt.io/qt-5/configure-options.html) |
| --- | --- | --- | --- | --- | --- |
| Berkeley DB | [5.3.28](http://www.oracle.com/technetwork/database/database-technologies/berkeleydb/downloads/index.html) | 5.3 | No |  |  |
| Boost | [1.70.0](https://www.boost.org/users/download/) | 1.59.0 | No |  |  |
| Clang |  | [5](https://releases.llvm.org/download.html) (C++17 support) |  |  |  |
| CMake |  | [3.16](https://cmake.org/download/) |  |  |  |
| Expat | [2.2.7](https://libexpat.github.io/) |  | No | Yes |  |
| fontconfig | [2.12.6](https://www.freedesktop.org/software/fontconfig/release/) |  | No | Yes |  |
| FreeType | [2.7.1](http://download.savannah.gnu.org/releases/freetype) |  | No |  |  |
| GCC |  | [7](https://gcc.gnu.org/) (C++17 support) |  |  |  |
| HarfBuzz-NG |  |  |  |  |  |
| jemalloc | [5.2.1](https://github.com/jemalloc/jemalloc/releases) | 3.6.0 |  |  |  |
| libevent | [2.1.11-stable](https://github.com/libevent/libevent/releases) | 2.0.22 | No |  |  |
| libpng |  |  |  |  | Yes |
| librsvg | |  |  |  |  |
| MiniUPnPc | [2.0.20180203](https://miniupnp.tuxfamily.org/files) | 1.9 | No |  |  |
| Ninja |  | [1.5.1](https://github.com/ninja-build/ninja/releases) |  |  |  |
| OpenSSL | [1.0.1k](https://www.openssl.org/source) |  | Yes |  |  |
| PCRE |  |  |  |  | Yes |
| protobuf | [2.6.1](https://github.com/google/protobuf/releases) |  | No |  |  |
| Python (tests) |  | [3.6](https://www.python.org/downloads) |  |  |  |
| qrencode | [3.4.4](https://fukuchi.org/works/qrencode) |  | No |  |  |
| Qt | [5.9.7](https://download.qt.io/official_releases/qt/) | 5.9.5 | No |  |  |
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
* Berkeley DB is not needed with `-DBUILD_BITCOIN_WALLET=OFF`.
* protobuf is not needed with `-DENABLE_BIP70=OFF`.
* Qt is not needed with `-DBUILD_BITCOIN_QT=OFF`.
* qrencode is not needed with `-DENABLE_QRCODE=OFF`.
* ZeroMQ is not needed with the `-DBUILD_BITCOIN_ZMQ=OFF`.

#### Other
* librsvg is only needed if you need to run `ninja osx-dmg` on
  (cross-compilation to) macOS.
