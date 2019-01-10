Getting and building the inputs
-------------------------------

At this point you have two options, you can either use the automated script (found in [https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/contrib/gitian-build.py](https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/contrib/gitian-build.py), only works in Debian/Ubuntu) or you could manually do everything by following this guide.
If you are using the automated script, then run it with the `--setup` command. Afterwards, run it with the `--build` command (example: `contrib/gitian-build.py -b signer 0.15.0`). Otherwise ignore this.

Follow the instructions in [https://github.com/bitcoin/bitcoin/blob/master/doc/release-process.md](https://github.com/bitcoin/bitcoin/blob/master/doc/release-process.md#fetch-and-create-inputs-first-time-or-when-dependency-versions-change)
in the bitcoin repository under 'Fetch and create inputs' to install sources which require
manual intervention. Also optionally follow the next step: 'Seed the Gitian sources cache
and offline git repositories' which will fetch the remaining files required for building
offline.

Building Bitcoin ABC
--------------------

To build Bitcoin ABC (for Linux, OS X and Windows) just follow the steps under 'perform
Gitian builds' in [https://github.com/bitcoin/bitcoin/blob/master/doc/release-process.md](https://github.com/bitcoin/bitcoin/blob/master/doc/release-process.md#setup-and-perform-gitian-builds) in the bitcoin repository.

This may take some time as it will build all the dependencies needed for each descriptor.
These dependencies will be cached after a successful build to avoid rebuilding them when possible.

At any time you can check the package installation and build progress with

```bash
tail -f var/install.log
tail -f var/build.log
```

Output from `gbuild` will look something like

    Initialized empty Git repository in /home/gitianuser/gitian-builder/inputs/bitcoin/.git/
    remote: Counting objects: 57959, done.
    remote: Total 57959 (delta 0), reused 0 (delta 0), pack-reused 57958
    Receiving objects: 100% (57959/57959), 53.76 MiB | 484.00 KiB/s, done.
    Resolving deltas: 100% (41590/41590), done.
    From https://github.com/Bitcoin-ABC/bitcoin-abc.git
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

Building an alternative repository
----------------------------------

If you want to do a test build of a pull on GitHub it can be useful to point
the Gitian builder at an alternative repository, using the same descriptors
and inputs.

For example:
```bash
URL=https://github.com/Bitcoin-ABC/bitcoin-abc.git
COMMIT=v0.18.5
./bin/gbuild --commit bitcoin=${COMMIT} --url bitcoin=${URL} ../bitcoin-abc/contrib/gitian-descriptors/gitian-linux.yml
./bin/gbuild --commit bitcoin=${COMMIT} --url bitcoin=${URL} ../bitcoin-abc/contrib/gitian-descriptors/gitian-win.yml
./bin/gbuild --commit bitcoin=${COMMIT} --url bitcoin=${URL} ../bitcoin-abc/contrib/gitian-descriptors/gitian-osx.yml
```

Building fully offline
----------------------

For building fully offline including attaching signatures to unsigned builds, the detached-sigs repository
and the bitcoin git repository with the desired tag must both be available locally, and then gbuild must be
told where to find them. It also requires an apt-cacher-ng which is fully-populated but set to offline mode, or
manually disabling gitian-builder's use of apt-get to update the VM build environment.

To configure apt-cacher-ng as an offline cacher, you will need to first populate its cache with the relevant
files. You must additionally patch target-bin/bootstrap-fixup to set its apt sources to something other than
plain archive.ubuntu.com: us.archive.ubuntu.com works.

So, if you use LXC:

```bash
export PATH="$PATH":${HOME}/gitian-builder/libexec
export USE_LXC=1
cd ~/gitian-builder
./libexec/make-clean-vm --suite stretch --arch amd64

LXC_ARCH=amd64 LXC_SUITE=stretch on-target -u root dpkg --add-architecture i386
LXC_ARCH=amd64 LXC_SUITE=stretch on-target -u root apt-get update
LXC_ARCH=amd64 LXC_SUITE=stretch on-target -u root \
  -e DEBIAN_FRONTEND=noninteractive apt-get --no-install-recommends -y install \
  $( sed -ne '/^packages:/,/^[^-]/ {/^- .*/{s/"//g;s/- //;p}}' ../bitcoin-abc/contrib/gitian-descriptors/*|sort|uniq )
LXC_ARCH=amd64 LXC_SUITE=stretch on-target -u root apt-get -q -y purge grub
LXC_ARCH=amd64 LXC_SUITE=stretch on-target -u root -e DEBIAN_FRONTEND=noninteractive apt-get -y dist-upgrade
```

And then set offline mode for apt-cacher-ng:

```
/etc/apt-cacher-ng/acng.conf
[...]
Offlinemode: 1
[...]

sudo service apt-cacher-ng restart
```

Then when building, override the remote URLs that gbuild would otherwise pull from the Gitian descriptors::
```bash
cd ~
BTCPATH=${HOME}/bitcoin-abc
COMMIT=<commmit hash or tag>

./bin/gbuild --commit bitcoin=${COMMIT} --url bitcoin=${BTCPATH} ${BTCPATH}/contrib/gitian-descriptors/gitian-win-signer.yml
```
