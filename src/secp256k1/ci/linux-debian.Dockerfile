FROM debian:buster

RUN dpkg --add-architecture i386
RUN dpkg --add-architecture s390x
RUN echo "deb http://deb.debian.org/debian buster-backports main" | tee -a /etc/apt/sources.list
RUN apt-get update

# dkpg-dev: to make pkg-config work in cross-builds
RUN apt-get install --no-install-recommends --no-upgrade -y \
        automake default-jdk dpkg-dev libssl-dev libtool make ninja-build pkg-config python3 qemu-user valgrind \
        gcc clang libc6-dbg \
        gcc-i686-linux-gnu libc6-dev-i386-cross libc6-dbg:i386 \
        gcc-s390x-linux-gnu libc6-dev-s390x-cross libc6-dbg:s390x
RUN apt-get install -t buster-backports --no-install-recommends --no-upgrade -y cmake
