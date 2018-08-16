Gitian building
================
Setup instructions for a Gitian build of Wormhole using a Ubuntu VM. 

Gitian is the deterministic build process that is used to build the Wormhole executables. It provides a way to be reasonably sure that the executables are really built from the source on GitHub. It also makes sure that the same, tested dependencies are used and statically built into the executable.

Multiple developers build the source code by following a specific descriptor ("recipe"), cryptographically sign the result, and upload the resulting signature. These results are compared and only if they match, the build is accepted and uploaded to bitcoinabc.org.

More independent Gitian builders are needed, which is why this guide exists. It is preferred you follow these steps yourself instead of using someone else's VM image to avoid 'contaminating' the build.

Preparing the Gitian builder host
---------------------------------
The first step is to prepare the host environment that will be used to perform the Gitian builds. This guide explains how to set up the environment, and how to start the builds.

The gitian build is easiest performed under Ubuntu Xenial. This guide will focus on creating and using a KVM. 

Requirements:

 - [Gitian-builder](https://github.com/devrandom/gitian-builder)

After you have installed tools, you will need to add a environment variable ```GITTIAN_HOST_IP```, the variable can't be set as  ```127.0.0.1```.

You will need to add the scirpt at the end of  ```target-bin/bootstrap-fixup.in```

```
cat  > /etc/network/interfaces  <<EOF
auto lo
iface lo inet loopback

auto ens3
iface  ens3 inet dhcp
EOF

sudo systemctl restart networking
```

The script is used to config the virtual machine network, the machine can't get ip automatic if you don't add this. 

Setting up the Gitian image
-----------------------------
Gitian needs a virtual image of the operating system to build in. Currently this is Ubuntu Xenial x86_64. This image will be copied and used every time that a build is started to make sure that the build is deterministic. Creating the image will take a while, but only has to be done once. We use kvm to build Wormhole.

Execute the following :

```
bin/make-base-vm --arch amd64 --suite xenial
```
There will be a lot of warnings printed during the build of the image. These can be ignored.

testing
--------

```
PATH=$PATH:$(pwd)/libexec
make-clean-vm --suite xenial --arch amd64

on-target ls -la
stop-target
```



Building Wormhole
-------------------
To build Womrhole run the following commands:

```
URL=https://github.com/copernet/wormhole.git
COMMIT=Earth-0.0.6-pre-release # or whatever release tag you wish
WHPATH # wormhole path

./bin/gbuild --commit wormhole=${COMMIT} ${WHPATH}/contrib/gitian-descriptors/gitian-linux.yml
./bin/gbuild --commit wormhole=${COMMIT} ${WHPATH}/contrib/gitian-descriptors/gitian-win.yml
./bin/gbuild --commit wormhole=${COMMIT} ${WHPATH}/contrib/gitian-descriptors/gitian-osx.yml
```

This may take some time as it will build all the dependencies needed for each descriptor. These dependencies will be cached after a successful build to avoid rebuilding them when possible.

Note:
If you build with ```gitian-osx.yml```, you will need put [MacOSX10.11.sdk.tar.gz](https://github.com/phracker/MacOSX-SDKs/releases) in directory```gitian-build/inputs```, because build in osx need depend it. You can follow this step to build it.

```
cd gitian-builder

wget https://github.com/phracker/MacOSX-SDKs/releases/download/10.13/MacOSX10.11.sdk.tar.xz
xz -d MacOSX10.11.sdk.tar.xz
tar -xvf MacOSX10.11.sdk.tar
tar zcvf MacOSX10.11.sdk.tar.gz MacOSX10.11.sdk

mv MacOSX10.11.sdk.tar.gz inputs
```

At any time you can check the package installation and build progress with

```
tail -f var/install.log
tail -f var/build.log
```
