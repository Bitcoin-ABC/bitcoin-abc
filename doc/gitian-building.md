Gitian building
================

*Setup instructions for a Gitian build of Bitcoin ABC using an Ubuntu VM or physical system.*

Gitian is the deterministic build process that is used to build the Bitcoin
ABC executables. It provides a way to be reasonably sure that the
executables are really built from the source on GitHub. It also makes sure that
the same, tested dependencies are used and statically built into the executable.

Multiple developers build the source code by following a specific descriptor
("recipe"), cryptographically sign the result, and upload the resulting signature.
These results are compared and only if they match, the build is accepted and uploaded
to bitcoinabc.org.

More independent Gitian builders are needed, which is why this guide exists.
It is preferred you follow these steps yourself instead of using someone else's
VM image to avoid 'contaminating' the build.

Table of Contents
------------------

- [Preparing the Gitian builder host](#preparing-the-gitian-builder-host)
- [Setting up the Gitian image](#setting-up-the-gitian-image)
- [Building Bitcoin ABC](#building-bitcoin-abc)


Preparing the Gitian builder host
---------------------------------

The first step is to prepare the host environment that will be used to perform
the Gitian builds. This guide explains how to set up the environment, and how
to start the builds.

The gitian build is easiest performed under Ubuntu Xenial. This guide will
focus on creating and using a vagrant box.  However, you may run the provided
provision script on your favorite clean VM image using any virtualization
option, or a baremetal linux machine.  If you wish to setup machine using
another technology, please see the provided provisioning script for gitian in
`contrib/gitian/provisioner.sh`

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
this is Ubuntu Xenial x86_64. This image will be copied and used every time
that a build is started to make sure that the build is deterministic. Creating
the image will take a while, but only has to be done once.

Execute the following as user `vagrant`:

```bash
cd gitian-builder
./bin/make-base-vm --lxc --distro debian --suite stretch --arch amd64
```

There will be a lot of warnings printed during the build of the image. These
can be ignored.

Building Bitcoin ABC
--------------------

To build Bitcoin ABC (for Linux, OS X and Windows) run the following commands:

```bash
URL=https://github.com/bitcoin-abc/bitcoin-abc.git
COMMIT=v0.16.0 # or whatever release tag you wish

# Note the path to descriptors assumes vagrant was used.  These files are within the ABC repository normally.
./bin/gbuild --commit bitcoin=${COMMIT} --url bitcoin=${URL} /vagrant/contrib/gitian-descriptors/gitian-linux.yml
# Note: If you plan on signing the binaries generated during this process, be
# sure to copy them otherwise they will be overwritten by the next gbuild call.
cp -r ./build/out/* /vagrant/gitian/linux
# Also copy the manifest files in the same manner:
cp ./result/bitcoin-abc-*-linux-res.yml /vagrant/gitian/linux/
./bin/gbuild --commit bitcoin=${COMMIT} --url bitcoin=${URL} /vagrant/contrib/gitian-descriptors/gitian-win.yml
cp -r ./build/out/* /vagrant/gitian/win
cp ./result/bitcoin-abc-*-win-res.yml /vagrant/gitian/win/
./bin/gbuild --commit bitcoin=${COMMIT} --url bitcoin=${URL} /vagrant/contrib/gitian-descriptors/gitian-osx.yml
cp -r ./build/out/* /vagrant/gitian/osx
cp ./result/bitcoin-abc-*-osx-res.yml /vagrant/gitian/osx/
```

Note on the OSX build: If you encounter an error about a missing MacOSX10.11.sdk.tar.gz, then follow these steps:
```
cd ./inputs
curl -LO https://storage.googleapis.com/f4936e83b2dcbca742be51fb9692b153/MacOSX10.11.sdk.tar.gz
```

Note: For executing gitian builds on local changes, change URL and COMMIT:
```bash
URL=/vagrant/
COMMIT=<git-commit-hash> # replace <git-commit-hash> with your latest changes
```

This may take some time as it will build all the dependencies needed for each
descriptor. These dependencies will be cached after a successful build to
avoid rebuilding them when possible.

At any time you can check the package installation and build progress with

```bash
tail -f var/install.log
tail -f var/build.log
```

Output from `gbuild` will look something like

    Initialized empty Git repository in /home/vagrant/gitian-builder/inputs/bitcoin/.git/
    remote: Counting objects: 57959, done.
    remote: Total 57959 (delta 0), reused 0 (delta 0), pack-reused 57958
    Receiving objects: 100% (57959/57959), 53.76 MiB | 484.00 KiB/s, done.
    Resolving deltas: 100% (41590/41590), done.
    From https://github.com/bitcoin/bitcoin
    ... (new tags, new branch etc)
    --- Building for trusty amd64 ---
    Stopping target if it is up
    Making a new image copy
    stdin: is not a tty
    Starting target
    Checking if target is up
    Preparing build environment
    Updating apt-get repository (log in var/install.log)
    Installing additional packages (log in var/install.log)
    Grabbing package manifest
    stdin: is not a tty
    Creating build script (var/build-script)
    lxc-start: Connection refused - inotify event with no name (mask 32768)
    Running build script (log in var/build.log)
