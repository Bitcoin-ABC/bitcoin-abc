Table of Contents
-----------------

- [Preparing the Gitian builder host](#preparing-the-gitian-builder-host)
- [Setting up the Gitian image](#setting-up-the-gitian-image)


Preparing the Gitian builder host
---------------------------------

The first step is to prepare the host environment that will be used to perform
the Gitian builds. This guide explains how to set up the environment, and how
to start the builds.

Requirements:
 - A machine with at least 64b of disk space
 - 16GB of RAM
 - Several installed tools:
   - [Vagrant](https://www.vagrantup.com)
   - [Packer](https://www.packer.io)
   - [Virtualbox](https://www.virtualbox.org)

After you have installed each of these tools, you will need to create an
ubuntu xenial vagrant "box."  This is most easily done using the [box-cutter
project](https://github.com/boxcutter/ubuntu).  (Note: Canonical provides a
vagrant box, however its disk space is insufficient for this guide.)

```bash
pushd
cd /tmp/
git clone https://github.com/boxcutter/ubuntu.git
cd ubuntu
git checkout 7d1820c186d76122445c092bc2b872a8a94166ce
packer build -var-file=ubuntu1604.json -only=virtualbox-iso ubuntu.json
vagrant box add --name abc-xenial box/virtualbox/ubuntu1604-0.1.0.box
popd
```

After completion you should be able to run add the box to vagrant as "abc-xenial"
using `vagrant box add --name abc-xenial <path_to_packer_output.box>`

The final step for running vagrant is:

```bash
cd contrib/gitian/
vagrant up
vagrant ssh
```

This should drop you into a Xenial prompt as the user `vagrant`.

Setting up the Gitian image
---------------------------

Gitian needs a virtual image of the operating system to build in. Currently
this is Debian Buster x86_64. This image will be copied and used every time
that a build is started to make sure that the build is deterministic. Creating
the image will take a while, but only has to be done once.

Execute the following as user `vagrant`:

```bash
cd gitian-builder
./bin/make-base-vm --lxc --distro debian --suite buster --arch amd64
```

There will be a lot of warnings printed during the build of the image. These
can be ignored.
