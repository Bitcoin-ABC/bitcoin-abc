FROM debian:bookworm

RUN dpkg --add-architecture i386 && \
    dpkg --add-architecture s390x && \
    dpkg --add-architecture armhf && \
    dpkg --add-architecture arm64

# dkpg-dev: to make pkg-config work in cross-builds
# llvm: for llvm-symbolizer, which is used by clang's UBSan for symbolized stack traces
RUN apt-get update && apt-get install --no-install-recommends --no-upgrade -y \
        git ca-certificates \
        automake cmake default-jdk dpkg-dev libssl-dev libtool make ninja-build pkg-config python3 qemu-user valgrind \
        gcc clang llvm libclang-rt-dev libc6-dbg \
        g++ \
        gcc-i686-linux-gnu libc6-dev-i386-cross libc6-dbg:i386 libubsan1:i386 libasan8:i386 \
        gcc-s390x-linux-gnu libc6-dev-s390x-cross libc6-dbg:s390x \
        gcc-arm-linux-gnueabihf libc6-dev-armhf-cross libc6-dbg:armhf \
        gcc-aarch64-linux-gnu libc6-dev-arm64-cross libc6-dbg:arm64 \
        gcc-mingw-w64-x86-64-win32 wine64 wine \
        gcc-mingw-w64-i686-win32 wine32

# Run a dummy command in wine to make it set up configuration
RUN wine64-stable xcopy || true
