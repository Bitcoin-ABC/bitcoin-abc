#!/bin/bash -e

# User to setup for building.  Vagrant is the default
export BUILDUSER=${BUILDUSER:-vagrant}

apt-get update
apt-get install -y git ruby sudo apt-cacher-ng qemu-utils debootstrap \
	lxc python-cheetah parted kpartx bridge-utils make curl 

# the version of lxc-start in Debian needs to run as root, so make sure
# that the build script can execute it without providing a password
echo "%sudo ALL=NOPASSWD: /usr/bin/lxc-start" > /etc/sudoers.d/gitian-lxc
echo "%sudo ALL=NOPASSWD: /usr/bin/lxc-execute" >> /etc/sudoers.d/gitian-lxc

# make sure that USE_LXC is always set when logging in as vagrant,
# and configure LXC IP addresses
echo 'export USE_LXC=1' >> /home/${BUILDUSER}/.profile
echo 'export LXC_BRIDGE=lxcbr0' >> /home/${BUILDUSER}/.profile
echo 'export GITIAN_HOST_IP=10.0.3.1' >> /home/${BUILDUSER}/.profile
echo 'export LXC_GUEST_IP=10.0.3.5' >> /home/${BUILDUSER}/.profile

# Setup bridge
echo 'USE_LXC_BRIDGE="true"' > /etc/default/lxc-net
echo 'lxc.network.type = veth' > /etc/lxc/default.conf
echo 'lxc.network.link = lxcbr0' >> /etc/lxc/default.conf
echo 'lxc.network.flags = up' >> /etc/lxc/default.conf
echo 'lxc.network.hwaddr = 00:16:3e:xx:xx:xx' >> /etc/lxc/default.conf
service lxc-net restart

# chdir into build user home directory
cd /home/${BUILDUSER}/

## Install vm-builder
wget http://archive.ubuntu.com/ubuntu/pool/universe/v/vm-builder/vm-builder_0.12.4+bzr494.orig.tar.gz
echo "76cbf8c52c391160b2641e7120dbade5afded713afaa6032f733a261f13e6a8e  vm-builder_0.12.4+bzr494.orig.tar.gz" | sha256sum -c
# (verification -- must return OK)
tar -zxvf vm-builder_0.12.4+bzr494.orig.tar.gz
cd vm-builder-0.12.4+bzr494
sudo python setup.py install
cd ..

## Install Gitian
git clone https://github.com/devrandom/gitian-builder.git
cd gitian-builder

git config --global user.email "vagrant@vagrant.com"
git config --global user.name "vagrant"

chown -R ${BUILDUSER}:${BUILDUSER} /home/${BUILDUSER}  

echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo "!!! Provisioning Complete !!!!"
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo 
echo "As the user ${BUILDUSER} run the following commands to produce a linux build:"
echo "export COMMIT=v0.18.3"
echo "export URL=https://github.com/Bitcoin-ABC/bitcoin-abc.git"
echo "cd gitian-builder"
echo './bin/make-base-vm --lxc --distro debian --suite stretch --arch amd64'
echo './bin/gbuild --commit bitcoin=${COMMIT} --url bitcoin=${URL} /vagrant/contrib/gitian-descriptors/gitian-linux.yml'
