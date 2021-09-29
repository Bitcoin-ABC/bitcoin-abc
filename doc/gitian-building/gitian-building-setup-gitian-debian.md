Table of Contents
-----------------

- [Setting up Debian for Gitian building](#setting-up-debian-for-gitian-building)
- [Setting up the Gitian image](#setting-up-the-gitian-image)


Setting up Debian for Gitian building
-------------------------------------

In this section we will be setting up the Debian installation for Gitian building.
We assume that a user `gitianuser` was previously added.

There are various options for running the Gitian builds. Building with LXC or
Docker containers are documented below, but other options exist.


**Using a LXC container:**

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


**Using a Docker container:**

First we need to set up dependencies. Type/paste the following in the terminal:

```bash
sudo apt-get install apt-cacher-ng curl docker.io firewalld git make ruby wget
```

Then a few steps are required to complete the configuration:

```bash
# Make sure the apt-cacher-ng, docker and firewalld services are enabled
sudo systemctl enable apt-cacher-ng
sudo systemctl enable docker
sudo systemctl enable firewalld

# Add the gitianuser to the docker group (required to connect to the daemon)
sudo usermod -aG docker gitianuser

# Add a firewall rule to allow docker access to apt-cacher-ng
sudo firewall-cmd --permanent --zone=trusted --add-interface=docker0

# Make sure that USE_DOCKER is always set when logging in as gitianuser
echo 'export USE_DOCKER=1' >> /home/gitianuser/.profile

# Reboot to apply the changes
reboot
```

At the end Debian is rebooted to make sure that the changes take effect. The steps in this
section only need to be performed once.

**Note**: When sudo asks for a password, enter the password for the user `gitianuser` not for `root`.

Setting up the Gitian image
---------------------------

Gitian needs a virtual image of the operating system to build in.
Currently this is Debian 10 Buster x86_64.
This image will be copied and used every time that a build is started to
make sure that the build is deterministic.
Creating the image will take a while, but only has to be done once.

Execute the following as user `gitianuser`:

```bash
git clone https://github.com/Bitcoin-ABC/bitcoin-abc.git
cd bitcoin-abc/contrib/gitian-builder
```


**For LXC:**

```bash
bin/make-base-vm --lxc --arch amd64 --distro debian --suite buster
```

There will be a lot of warnings printed during the build of the image. These can be ignored.

**Note**: When sudo asks for a password, enter the password for the user `gitianuser` not for `root`.


**For Docker:**

```bash
bin/make-base-vm --docker --arch amd64 --distro debian --suite buster
```

Downloading dependencies
------------------------

Gitian may have problems connecting to the internet, which can make the build
flacky. In order to avoid this, it is possible to download dependencies ahead
of time.

Execute the following as user `gitianuser`:

```bash
cd bitcoin-abc/contrib/gitian-builder
make -C ../../depends download SOURCES_PATH=`pwd`/cache/common
```
