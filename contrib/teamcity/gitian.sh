#!/bin/bash -e

wget http://archive.ubuntu.com/ubuntu/pool/universe/v/vm-builder/vm-builder_0.12.4+bzr494.orig.tar.gz
echo "76cbf8c52c391160b2641e7120dbade5afded713afaa6032f733a261f13e6a8e  vm-builder_0.12.4+bzr494.orig.tar.gz" | sha256sum -c
# (verification -- must return OK)
tar -zxvf vm-builder_0.12.4+bzr494.orig.tar.gz
cd vm-builder-0.12.4+bzr494
sudo python setup.py install
cd ..

## Install Gitian
git clone https://github.com/devrandom/gitian-builder.git

export COMMIT=HEAD
export URL=`pwd`
export USE_LXC=1
export LXC_BRIDGE=lxcbr0
export GITIAN_HOST_IP=10.0.3.1
export LXC_GUEST_IP=10.0.3.5

cd gitian-builder

if [[ "${OS_NAME}" == "osx" ]]; then
  wget https://storage.googleapis.com/f4936e83b2dcbca742be51fb9692b153/MacOSX10.11.sdk.tar.gz
  echo "4732b52b5ebe300c8c91cbeed6d19d59c1ff9c56c7a1dd6cfa518b9c2c72abde  MacOSX10.11.sdk.tar.gz" | sha256sum -c
  mkdir -p inputs
  echo "Downloaded"
  mv MacOSX10.11.sdk.tar.gz inputs
fi

## Determine the number of build threads
THREADS=$(nproc || sysctl -n hw.ncpu)

./bin/make-base-vm --lxc --distro debian --suite stretch --arch amd64
./bin/gbuild -j${THREADS} -m3500 --commit bitcoin=${COMMIT} --url bitcoin=${URL} ../contrib/gitian-descriptors/gitian-${OS_NAME}.yml

cd ..
mkdir ${OS_NAME}
cp gitian-builder/result/*.yml ${OS_NAME}/
mv gitian-builder/build/out/* ${OS_NAME}/
rm -r ${OS_NAME}/src
