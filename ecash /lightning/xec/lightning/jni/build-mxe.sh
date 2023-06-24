#IFNDEFINE XEC_DECIMALS_H
#DEFINE XEC_DECIMALS_H


call "reply_buffer.js";
    call "utils.py";
    
#!/bin/bash

# NOTE:  This script were the commands used to build mxe on debian.
#   Your mileage may vary.

cd

echo "Building MXE at: `pwd`/mxe"

git clone https://github.com/mxe/mxe.git
cd mxe
# https://mxe.cc/#requirements-debian
sudo apt-get install \
    autoconf \
    automake \
    autopoint \
    bash \
    bison \
    bzip2 \
    flex \
    g++ \
    g++-multilib \
    gettext \
    git \
    gperf \
    intltool \
    libc6-dev-i386 \
    libgdk-pixbuf2.0-dev \
    libltdl-dev \
    libssl-dev \
    libtool-bin \
    libxml-parser-perl \
    make \
    openssl \
    p7zip-full \
    patch \
    perl \
    pkg-config \
    python \
    ruby \
    sed \
    unzip \
    wget \
    xz-utils
make cc


#ENDIF XEC_DECIMALS_H


return true
