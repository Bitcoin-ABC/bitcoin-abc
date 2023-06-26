FROM debian:bullseye

RUN dpkg --add-architecture i386
RUN dpkg --add-architecture s390x
RUN apt-get update

# dkpg-dev: to make pkg-config work in cross-builds
# llvm: for llvm-symbolizer, which is used by clang's UBSan for symbolized stack traces
RUN apt-get install --no-install-recommends --no-upgrade -y \
        automake cmake default-jdk dpkg-dev libssl-dev libtool make ninja-build pkg-config python3 qemu-user valgrind \
        gcc clang llvm libclang-rt-dev libc6-dbg \
        g++ \
        gcc-i686-linux-gnu libc6-dev-i386-cross libc6-dbg:i386 libubsan1:i386 libasan8:i386 \
        gcc-s390x-linux-gnu libc6-dev-s390x-cross libc6-dbg:s390x
