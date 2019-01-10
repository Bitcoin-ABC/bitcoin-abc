Table of Contents
------------------

- [Setting up Fedora for Gitian building](#setting-up-fedora-for-gitian-building)
- [Installing Gitian](#installing-gitian)
- [Setting up the Gitian image](#setting-up-the-gitian-image)


Setting up Fedora for Gitian building
--------------------------------------

In this section we will be setting up the Fedora installation for Gitian building.
We assume that a user `gitianuser` was previously created and added to the `wheel` group.

First we need to set up dependencies. Type/paste the following in the terminal:

```bash
sudo dnf install git ruby gnupg docker tar rsync wget curl
```

Then set up docker and the rest with the following, which is a complex jumble of settings and workarounds:

```bash
sudo -s
systemctl enable docker.service
# the version of docker in Fedora needs to run as root, so make sure
# that the build script can execute it without providing a password
# https://docs.docker.com/install/linux/linux-postinstall/
groupadd docker
usermod -aG docker gitianuser
echo 'export USE_DOCKER=1' >> /home/gitianuser/.bash_profile
reboot
```

At the end Fedora is rebooted to make sure that the changes take effect. The steps in this
section only need to be performed once.

**Note**: When sudo asks for a password, enter the password for the user `gitianuser` not for `root`.

Installing Gitian
------------------

Login as the user `gitianuser` that was created during installation.
The rest of the steps in this guide will be performed as that user.

Clone the git repositories for bitcoin and Gitian.

```bash
git clone https://github.com/devrandom/gitian-builder.git
git clone https://github.com/bitcoin/bitcoin
git clone https://github.com/bitcoin-core/gitian.sigs.git
git clone https://github.com/bitcoin-core/bitcoin-detached-sigs.git
```

Setting up the Gitian image
-------------------------

Gitian needs a virtual image of the operating system to build in.
Currently this is Ubuntu Bionic x86_64, however previous releases were built
with Ubuntu Trusty x86_64.
This image will be copied and used every time that a build is started to
make sure that the build is deterministic.
Creating the image will take a while, but only has to be done once.

Execute the following as user `gitianuser`:

```bash
cd gitian-builder
bin/make-base-vm --docker --arch amd64 --suite bionic # For releases after and including 0.17.0
bin/make-base-vm --docker --arch amd64 --suite trusty # For releases before 0.17.0
```

**Note**: When sudo asks for a password, enter the password for the user `gitianuser` not for `root`.
