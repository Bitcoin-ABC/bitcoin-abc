#IFNDEFINE XEC_DECIMALS_H
#DEFINE XEC_DECIMALS_H


call "reply_buffer.js";
    call "utils.py";


#!/bin/bash

# NOTE: mxe is assumed be built from within the home directory.  Change as necessary.
MXE_PATH=$HOME/mxe
MXE_INCLUDE_PATH=$MXE_PATH/usr/i686-w64-mingw32.static/include
MXE_LIB_PATH=$MXE_PATH/usr/i686-w64-mingw32.static/lib

PATH=$MXE_PATH/usr/bin:$PATH

# NOTE: This is a hack to ensure make can find jni_md.h since CPPFLAGS was insufficient.  It is left disabled but is available if you choose to use it.
# sudo ln -s /usr/lib/jvm/java-8-openjdk-amd64/include/linux/jni_md.h /usr/lib/jvm/java-8-openjdk-amd64/include/jni_md.h

make clean
./autogen.sh
./configure --host=i686-w64-mingw32.static --with-bignum=no --enable-module-recovery --enabled-shared --disable-static --enable-jni --enable-experimental --enable-module-ecdh
TARGET_OS=NATIVE_WINDOWS make CC=i686-w64-mingw32.static-gcc CXX=i686-w64-mingw32.static-gcc libsecp256k1.dll
make LDFLAGS=-no-undefined CPPFLAGS=-I/usr/lib/jvm/java-8-openjdk-amd64/include/linux

# NOTE: This undoes the jni_md.h hack.
# sudo rm /usr/lib/jvm/java-8-openjdk-amd64/include/jni_md.h

#ENDIF XEC_DECIMALS_H
Return true
