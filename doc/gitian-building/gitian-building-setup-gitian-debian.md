Table of Contents
-----------------

- [Setting up Debian for Gitian building](#setting-up-debian-for-gitian-building)
- [Installing Gitian](#installing-gitian)
- [Setting up the Gitian image](#setting-up-the-gitian-image)


Setting up Debian for Gitian building
-------------------------------------

In this section we will be setting up the Debian installation for Gitian building.
We assume that a user `gitianuser` was previously added.

First we need to set up dependencies. Type/paste the following in the terminal:

```bash
sudo apt-get install git ruby apt-cacher-ng qemu-utils debootstrap lxc python-cheetah parted kpartx bridge-utils make ubuntu-archive-keyring curl firewalld apparmor iptables
```

Find the device name of your network card. You can list your connections with
```bash
ip address
```
Examples: `eth0`, `eno1`, ...
Save it to the NET_DEV variable:
```bash
sudo -s
NET_DEV=<your device name>
```

Then set up LXC and the rest with the following, which is a complex jumble of settings and workarounds:

```bash
# the version of lxc-start in Debian needs to run as root, so make sure
# that the build script can execute it without providing a password
echo "%sudo ALL=NOPASSWD: /usr/bin/lxc-start" > /etc/sudoers.d/gitian-lxc
echo "%sudo ALL=NOPASSWD: /usr/bin/lxc-execute" >> /etc/sudoers.d/gitian-lxc
# make /etc/rc.local script that sets up bridge between guest and host
echo '#!/bin/sh -e' > /etc/rc.local
echo 'brctl addbr br0' >> /etc/rc.local
echo 'ip addr add 10.0.3.1/24 broadcast 10.0.3.255 dev br0' >> /etc/rc.local
echo 'ip link set br0 up' >> /etc/rc.local
echo 'firewall-cmd --zone=trusted --add-interface=br0' >> /etc/rc.local
echo "iptables -t nat -A POSTROUTING -o ${NET_DEV} -j MASQUERADE" >> /etc/rc.local
echo 'echo 1 > /proc/sys/net/ipv4/ip_forward' >> /etc/rc.local
echo 'exit 0' >> /etc/rc.local
chmod +x /etc/rc.local
# make sure that USE_LXC is always set when logging in as gitianuser,
# and configure LXC IP addresses
echo 'export USE_LXC=1' >> /home/gitianuser/.profile
echo 'export GITIAN_HOST_IP=10.0.3.1' >> /home/gitianuser/.profile
echo 'export LXC_GUEST_IP=10.0.3.5' >> /home/gitianuser/.profile
reboot
```

At the end Debian is rebooted to make sure that the changes take effect. The steps in this
section only need to be performed once.

**Note**: When sudo asks for a password, enter the password for the user `gitianuser` not for `root`.

Installing Gitian
-----------------

Re-login as the user `gitianuser` that was created during installation.
The rest of the steps in this guide will be performed as that user.

There is no `python-vm-builder` package in Debian, so we need to install it from source ourselves,

```bash
wget http://archive.ubuntu.com/ubuntu/pool/universe/v/vm-builder/vm-builder_0.12.4+bzr494.orig.tar.gz
echo "76cbf8c52c391160b2641e7120dbade5afded713afaa6032f733a261f13e6a8e  vm-builder_0.12.4+bzr494.orig.tar.gz" | sha256sum -c
# (verification -- must return OK)
tar -zxvf vm-builder_0.12.4+bzr494.orig.tar.gz
cd vm-builder-0.12.4+bzr494
sudo python setup.py install
cd ..
```

**Note**: When sudo asks for a password, enter the password for the user `gitianuser` not for `root`.

Clone the git repositories for bitcoin and Gitian.

```bash
git clone https://github.com/devrandom/gitian-builder.git
git clone https://github.com/Bitcoin-ABC/bitcoin-abc.git
```

Setting up the Gitian image
---------------------------

Gitian needs a virtual image of the operating system to build in.
Currently this is Ubuntu Bionic x86_64, however previous releases were built
with Ubuntu Trusty x86_64.
This image will be copied and used every time that a build is started to
make sure that the build is deterministic.
Creating the image will take a while, but only has to be done once.

Execute the following as user `gitianuser`:

```bash
cd gitian-builder
bin/make-base-vm --lxc --arch amd64 --distro debian --suite stretch
```

There will be a lot of warnings printed during the build of the image. These can be ignored.

**Note**: When sudo asks for a password, enter the password for the user `gitianuser` not for `root`.

Downloading dependencies
------------------------

Gitian may have problems connecting to the internet, which can make the build
flacky. In order to avoid this, it is possible to download dependencies ahead
of time.

Execute the following as user `gitianuser`:

```bash
cd gitian-builder
make -C ../bitcoin-abc/depends download SOURCES_PATH=`pwd`/cache/common
```
