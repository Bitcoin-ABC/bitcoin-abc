FROM debian:stable

# Add backports for clang
RUN echo "deb http://deb.debian.org/debian buster-backports main" >> /etc/apt/sources.list

RUN apt-get -y update

# BCN build requriements
RUN apt-get -y install python3 ccache bsdmainutils build-essential libssl-dev libevent-dev cmake libboost-system-dev libboost-filesystem-dev libboost-chrono-dev libboost-test-dev libboost-thread-dev libdb-dev libdb++-dev libminiupnpc-dev libzmq3-dev libqt5gui5 libqt5core5a libqt5dbus5 qttools5-dev qttools5-dev-tools libprotobuf-dev protobuf-compiler libqrencode-dev

# Fetch ninja >= 1.10 to get the restat tool
RUN apt-get -y install wget unzip
RUN wget https://github.com/ninja-build/ninja/releases/download/v1.10.0/ninja-linux.zip
RUN unzip ninja-linux.zip
RUN cp ./ninja /usr/local/bin/ninja
RUN cp ./ninja /usr/bin/ninja
RUN ninja --version
RUN ninja -t restat

# Make sure UTF-8 isn't borked
RUN apt-get -y install locales
RUN export LANG=en_US.UTF-8
RUN export LANGUAGE=en_US:en
RUN export LC_ALL=en_US.UTF-8
RUN echo "en_US UTF-8" > /etc/locale.gen
RUN locale-gen en_US.UTF-8

# Support windows build
RUN apt-get -y install g++-mingw-w64-x86-64 curl automake autoconf libtool pkg-config
RUN update-alternatives --set x86_64-w64-mingw32-g++ /usr/bin/x86_64-w64-mingw32-g++-posix
RUN update-alternatives --set x86_64-w64-mingw32-gcc /usr/bin/x86_64-w64-mingw32-gcc-posix

# Support ARM build
RUN apt-get -y install autoconf automake curl g++-arm-linux-gnueabihf gcc-arm-linux-gnueabihf gperf pkg-config

# Support OSX build
RUN apt-get -y install python3-setuptools

# Support clang build
RUN apt-get -y -t buster-backports install clang-8
