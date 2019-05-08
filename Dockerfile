FROM ubuntu:16.04

RUN apt update \
    && apt install -y  build-essential libtool autotools-dev \
    automake pkg-config libssl-dev libevent-dev bsdmainutils

RUN apt install -y libboost-all-dev libdb-dev libdb++-dev

RUN apt install -y libminiupnpc-dev libzmq3-dev

RUN apt install -y libqt5gui5 libqt5core5a libqt5dbus5 qttools5-dev qttools5-dev-tools libprotobuf-dev protobuf-compiler

RUN apt install -y libqt4-dev libprotobuf-dev protobuf-compiler libqrencode-dev

WORKDIR wormhole

COPY  . .

RUN ./autogen.sh && ./configure && make -j2

RUN make install