# Gitian

Read about the project goals at the [project home page](https://gitian.org/).

This package can do a deterministic build of a package inside a VM.

## Deterministic build inside a VM

This performs a build inside a VM, with deterministic inputs and outputs.  If the build script takes care of all sources of non-determinism (mostly caused by timestamps), the result will always be the same.  This allows multiple independent verifiers to sign a binary with the assurance that it really came from the source they reviewed.

## Prerequisites:

### Arch:

    sudo pacman -S python2-cheetah qemu rsync
    sudo pacman -S lxc libvirt bridge-utils # for lxc mode

From AUR:

* [apt-cacher-ng](https://aur.archlinux.org/packages/apt-cacher-ng/) (you may have to play with permissions (chown to apt-cacher-ng) on files to get apt-cacher-ng to start)
* [debootstrap](https://aur.archlinux.org/packages/debootstrap-git/)
* [dpkg](https://aur.archlinux.org/packages/dpkg/)
* [gnupg1](https://aur.archlinux.org/packages/gnupg1/)
* [multipath-tools](https://aur.archlinux.org/packages/multipath-tools/) (for kpartx)

Non-AUR packages:

* [debian-archive-keyring](https://packages.debian.org/jessie/debian-archive-keyring) (for making Debian guests)
* [ubuntu-keyring](https://packages.ubuntu.com/search?keywords=ubuntu-keyring) (for making Ubuntu guests)

From newroco on GitHub:

* [vmbuilder](https://github.com/newroco/vmbuilder)

Also, I had to modify the default /etc/sudoers file to uncomment the `secure_path` line, because vmbuilder isn't found otherwise when the `env -i ... sudo vmbuilder ...` line is executed (because the i flag resets the environment variables including the PATH).

### Gentoo:

    layman -a luke-jr  # needed for vmbuilder
    sudo emerge dev-vcs/git net-misc/apt-cacher-ng app-emulation/vmbuilder dev-lang/ruby
    sudo emerge app-emulation/qemu
    export KVM=qemu-system-x86_64

### Ubuntu:

This pulls in all pre-requisites for KVM building on Ubuntu:

    sudo apt-get install git apache2 apt-cacher-ng python-vm-builder ruby qemu-utils

If you'd like to use LXC mode instead, install it as follows:

    sudo apt-get install lxc

If you'd like to use docker mode instead, install it as follows:

    sudo apt-get install docker-ce

### Debian:

See Ubuntu, and also run the following on Debian Jessie or newer:

    sudo apt-get install ubuntu-archive-keyring

On Debian Wheezy you run the same command, but you must first add backports to your system, because the package is only available in wheezy-backports.

### OSX with MacPorts:

    sudo port install ruby coreutils
    export PATH=$PATH:/opt/local/libexec/gnubin  # Needed for sha256sum
    
### OSX with Homebrew:

    brew install ruby coreutils
    export PATH=$PATH:/opt/local/libexec/gnubin    

#### VirtualBox:

Install virtualbox from http://www.virtualbox.org, and make sure `VBoxManage` is in your `$PATH`.

## Debian Guests

Gitian supports Debian guests in addition to Ubuntu guests. Note that this doesn't mean you can allow the builders to choose to use either Debian or Ubuntu guests. The person creating the Gitian descriptor will need to choose a particular distro and suite for the guest and all builders must use that particular distro and suite, otherwise the software won't reproduce for everyone.

To create a Debian guest:

    bin/make-base-vm --distro debian --suite jessie

There is currently no support for LXC Debian guests. There is just KVM support. LXC support for Debian guests is planned to be added soon.

Only Debian Jessie guests have been tested with Gitian. If you have success (or trouble) with other versions of Debian, please let us know.

If you are creating a Gitian descriptor, you can now specify a distro. If no distro is provided, the default is to assume Ubuntu. Since Ubuntu is assumed, older Gitian descriptors that don't specify a distro will still work as they always have.

## Create the base VM for use in further builds
**NOTE:** requires `sudo`, please review the script

### KVM

    bin/make-base-vm
    bin/make-base-vm --arch i386

### LXC

    bin/make-base-vm --lxc
    bin/make-base-vm --lxc --arch i386

Set the `USE_LXC` environment variable to use `LXC` instead of `KVM`:

    export USE_LXC=1

### Docker

    bin/make-base-vm --docker
    bin/make-base-vm --docker --arch i386

Set the `USE_DOCKER` environment variable to use `DOCKER` instead of `KVM`:

    export USE_DOCKER=1

### VirtualBox

Command-line `VBoxManage` must be in your `$PATH`.

#### Setup:

`make-base-vm` cannot yet make VirtualBox virtual machines ( _patches welcome_, it should be possible to use `VBoxManage`, boot-from-network Linux images and PXE booting to do it). So you must either get or manually create VirtualBox machines that:

1. Are named `Gitian-<suite>-<arch>` -- e.g. Gitian-xenial-i386 for a 32-bit, Ubuntu 16 machine.
2. Have a booted-up snapshot named `Gitian-Clean` .  The build script resets the VM to that snapshot to get reproducible builds.
3. Has the VM's NAT networking setup to forward port `localhost:2223` on the host machine to port `22` of the VM; e.g.:

```
    VBoxManage modifyvm Gitian-xenial-i386 --natpf1 "guestssh,tcp,,2223,,22"
```

The final setup needed is to create an `ssh` key that will be used to login to the virtual machine:

    ssh-keygen -t rsa -f var/id_rsa -N ""
    ssh -p 2223 ubuntu@localhost 'mkdir -p .ssh && chmod 700 .ssh && cat >> .ssh/authorized_keys' < var/id_rsa.pub

Then log into the vm and copy the `ssh` keys to root's `authorized_keys` file.

    ssh -p 2223 ubuntu@localhost
    # Now in the vm
    sudo bash
    mkdir -p .ssh && chmod 700 .ssh && cat ~ubuntu/.ssh/authorized_keys >> .ssh/authorized_keys

Set the `USE_VBOX` environment variable to use `VBOX` instead of `KVM`:

    export USE_VBOX=1

## Sanity-testing

If you have everything set-up properly, you should be able to:

    PATH=$PATH:$(pwd)/libexec
    make-clean-vm --suite xenial --arch i386

    # on-target needs $DISTRO to be set to debian if using a Debian guest
    # (when running gbuild, $DISTRO is set based on the descriptor, so this line isn't needed)
    DISTRO=debian

    # For LXC:
    LXC_ARCH=i386 LXC_SUITE=xenial on-target ls -la

    # For KVM:
    start-target 32 xenial-i386 &
    # wait a few seconds for VM to start
    on-target ls -la
    stop-target

## Building

Copy any additional build inputs into a directory named _inputs_.

Then execute the build using a `YAML` description file (can be run as non-root):

    export USE_LXC=1 # LXC only
    bin/gbuild <package>.yml

or if you need to specify a commit for one of the git remotes:

    bin/gbuild --commit <dir>=<hash> <package>.yml

The resulting report will appear in `result/<package>-res.yml`

To sign the result, perform:

    bin/gsign --signer <signer> --release <release-name> <package>.yml

Where `<signer>` is your signing PGP key ID and `<release-name>` is the name for the current release.  This will put the result and signature in the `sigs/<package>/<release-name>`.  The `sigs/<package>` directory can be managed through git to coordinate multiple signers.

After you've merged everybody's signatures, verify them:

    bin/gverify --release <release-name> <package>.yml


## Poking around

* Log files are captured to the _var_ directory
* You can run the utilities in libexec by running `PATH="libexec:$PATH"`
* To start the target VM run `start-target 32 xenial-i386` or `start-target 64 xenial-amd64`
* To ssh into the target run `on-target` (after setting $DISTRO to debian if using a Debian guest) or `on-target -u root`
* On the target, the _build_ directory contains the code as it is compiled and _install_ contains intermediate libraries
* By convention, the script in `<package>.yml` starts with any environment setup you would need to manually compile things on the target

TODO:
- disable sudo in target, just in case of a hypervisor exploit
- tar and other archive timestamp setter

## LXC tips

`bin/gbuild` runs `lxc-execute` or `lxc-start`, which may require root.  If you are in the admin group, you can add the following sudoers line to prevent asking for the password every time:

    %admin ALL=NOPASSWD: /usr/bin/lxc-execute
    %admin ALL=NOPASSWD: /usr/bin/lxc-start

Right now `lxc-start` is the default, but you can force `lxc-execute` (useful for Ubuntu 14.04) with:

    export LXC_EXECUTE=lxc-execute

Recent distributions allow lxc-execute / lxc-start to be run by non-privileged users, so you might be able to rip-out the `sudo` calls in `libexec/*`.

If you have a runaway `lxc-start` command, just use `kill -9` on it.

The machine configuration requires access to br0 and assumes that the host address is `10.0.2.2`:

    sudo brctl addbr br0
    sudo ifconfig br0 10.0.2.2/24 up

## Tests

Not very extensive, currently.

`python -m unittest discover test`
