FROM debian:buster

RUN dpkg --add-architecture s390x
RUN echo "deb http://deb.debian.org/debian buster-backports main" | tee -a /etc/apt/sources.list
RUN apt-get update
RUN apt-get install --no-install-recommends --no-upgrade -y automake libtool make ninja-build python3
RUN apt-get install --no-install-recommends --no-upgrade -y gcc-s390x-linux-gnu libc6-dev-s390x-cross libc6:s390x qemu-user
RUN apt-get install -t buster-backports --no-install-recommends --no-upgrade -y cmake
