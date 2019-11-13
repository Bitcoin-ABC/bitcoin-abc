Gitian building
===============

*Setup instructions for a Gitian build of Bitcoin ABC using a VM or physical system.*

Gitian is the deterministic build process that is used to build the Bitcoin
ABC executables. It provides a way to be reasonably sure that the
executables are really built from the source on GitHub. It also makes sure that
the same, tested dependencies are used and statically built into the executable.

Multiple developers build the source code by following a specific descriptor
("recipe"), cryptographically sign the result, and upload the resulting signature.
These results are compared and only if they match, the build is accepted and
uploaded to bitcoinabc.org.

More independent Gitian builders are needed, which is why this guide exists.
It is preferred you follow these steps yourself instead of using someone else's
VM image to avoid 'contaminating' the build.

Table of Contents
-----------------

- [Preparing the Gitian builder host](#preparing-the-gitian-builder-host)
- [Getting and building the inputs](#getting-and-building-the-inputs)
- [Building Bitcoin Core](#building-bitcoin-core)
- [Building an alternative repository](#building-an-alternative-repository)
- [Signing externally](#signing-externally)
- [Uploading signatures](#uploading-signatures)


Preparing the Gitian builder host
---------------------------------

The first step is to prepare the host environment that will be used to perform the Gitian builds.
This guide explains how to set up the environment, and how to start the builds.

Gitian builds are known to be working on recent versions of Debian, Ubuntu and Fedora.
If your machine is already running one of those operating systems, you can perform Gitian builds on the actual hardware.
Alternatively, you can install one of the supported operating systems in a virtual machine.

You can create the virtual machine using [vagrant](./gitian-building/gitian-building-vagrant.md) or chose to setup the VM manually.

Any kind of virtualization can be used, for example:
- [VirtualBox](https://www.virtualbox.org/) (covered by this guide)
- [KVM](http://www.linux-kvm.org/page/Main_Page)
- [LXC](https://linuxcontainers.org/)

Please refer to the following documents to set up the operating systems and Gitian.

|                                   | Debian                                                                             | Fedora                                                                             |
|-----------------------------------|------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| Setup virtual machine (optional)  | [Create Debian VirtualBox](./gitian-building/gitian-building-create-vm-debian.md) | [Create Fedora VirtualBox](./gitian-building/gitian-building-create-vm-fedora.md) |
| Setup Gitian                      | [Setup Gitian on Debian](./gitian-building/gitian-building-setup-gitian-debian.md) | [Setup Gitian on Fedora](./gitian-building/gitian-building-setup-gitian-fedora.md) |

Note that a version of `lxc-execute` higher or equal to 2.1.1 is required.
You can check the version with `lxc-execute --version`.

Non-Debian / Ubuntu, Manual and Offline Building
------------------------------------------------
The instructions below use the automated script [gitian-build.py](https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/contrib/gitian-build.py) which only works in Debian/Ubuntu. For manual steps and instructions for fully offline signing, see [this guide](./gitian-building/gitian-building-manual.md).

MacOS code signing
------------------
In order to sign builds for MacOS, you need to download the free SDK and extract a file. The steps are described [here](./gitian-building/gitian-building-mac-os-sdk.md).

It is possible to download the resulting archive directly for users that desire to do so:

```bash
cd ~/gitian-builder
curl -LO https://storage.googleapis.com/f4936e83b2dcbca742be51fb9692b153/MacOSX10.11.sdk.tar.gz
echo "4732b52b5ebe300c8c91cbeed6d19d59c1ff9c56c7a1dd6cfa518b9c2c72abde MacOSX10.11.sdk.tar.gz" | sha256sum -c
mkdir -p inputs
mv MacOSX10.11.sdk.tar.gz inputs
```

Alternatively, you can skip the macOS build by adding `--os=lw` below.

Initial Gitian Setup
--------------------
The `gitian-build.py` script will checkout different release tags, so it's best to copy it:

```bash
cp bitcoin-abc/contrib/gitian-build.py .
```

You only need to do this once:

```bash
./gitian-build.py --setup satoshi 0.18.5
```

Where `satoshi` is your Github name and `0.18.5` is the most recent tag (without `v`). 

Build binaries
--------------
Windows and macOS have code signed binaries, but those won't be available until a few developers have gitian signed the non-codesigned binaries.

To build the most recent tag:

```bash
./gitian-build.py --detach-sign --no-commit -b satoshi 0.18.5
```

To speed up the build, use `-j 5 -m 5000` as the first arguments, where `5` is the number of CPU's you allocated to the VM plus one, and 5000 is a little bit less than then the MB's of RAM you allocated.

If all went well, this produces a number of (uncommited) `.assert` files in the gitian.sigs repository.

You need to copy these uncommited changes to your host machine, where you can sign them:

```bash
export NAME=satoshi
gpg --output $VERSION-linux/$NAME/bitcoin-abc-linux-0.18.5-build.assert.sig --detach-sign 0.18.5-linux/$NAME/bitcoin-abc-linux-0.18.5-build.assert 
gpg --output $VERSION-osx-unsigned/$NAME/bitcoin-abc-osx-0.18.5-build.assert.sig --detach-sign 0.18.5-osx-unsigned/$NAME/bitcoin-abc-osx-0.18.5-build.assert 
gpg --output $VERSION-win-unsigned/$NAME/bitcoin-abc-win-0.18.5-build.assert.sig --detach-sign 0.18.5-win-unsigned/$NAME/bitcoin-abc-win-0.18.5-build.assert 
```
