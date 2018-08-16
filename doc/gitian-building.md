Gitian building
================
Setup instructions for a Gitian build of Wormhole using a Ubuntu VM. 

Gitian is the deterministic build process that is used to build the Wormhole executables. It provides a way to be reasonably sure that the executables are really built from the source on GitHub. It also makes sure that the same, tested dependencies are used and statically built into the executable.

Multiple developers build the source code by following a specific descriptor ("recipe"), cryptographically sign the result, and upload the resulting signature. These results are compared and only if they match, the build is accepted and uploaded to bitcoinabc.org.

More independent Gitian builders are needed, which is why this guide exists. It is preferred you follow these steps yourself instead of using someone else's VM image to avoid 'contaminating' the build.

Preparing the Gitian builder host
---------------------------------
Requirements:

 - Gitian-builder


Setting up the Gitian image
-----------------------------
Gitian needs a virtual image of the operating system to build in. Currently this is Ubuntu Xenial x86_64. This image will be copied and used every time that a build is started to make sure that the build is deterministic. Creating the image will take a while, but only has to be done once. We use kvm to build Wormhole.

Execute the following :

```
cd gitian-builder
bin/make-base-vm --arch amd64 --suite xenial
```
There will be a lot of warnings printed during the build of the image. These can be ignored.



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

At any time you can check the package installation and build progress with

```
tail -f var/install.log
tail -f var/build.log
```
