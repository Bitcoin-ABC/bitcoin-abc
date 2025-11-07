WINDOWS BUILD NOTES
====================

Below are some notes on how to build Bitcoin ABC for Windows.

The options known to work for building Bitcoin ABC on Windows are:

* On Linux, using the [Mingw-w64](https://mingw-w64.org/doku.php) cross compiler tool chain. Debian Bookworm is recommended
and is the platform used to build the Bitcoin ABC Windows release binaries.
* On Windows, using [Windows
Subsystem for Linux (WSL)](https://msdn.microsoft.com/commandline/wsl/about) and the Mingw-w64 cross compiler tool chain.

Other options which may work, but which have not been extensively tested are (please contribute instructions):

* On Windows, using a POSIX compatibility layer application such as [cygwin](http://www.cygwin.com/) or [msys2](http://www.msys2.org/).
* On Windows, using a native compiler tool chain such as [Visual Studio](https://www.visualstudio.com).

In any case please make sure that the compiler supports C++20.

Installing Windows Subsystem for Linux
---------------------------------------

With Windows 10, Microsoft has released a new feature named the [Windows
Subsystem for Linux (WSL)](https://msdn.microsoft.com/commandline/wsl/about). This
feature allows you to run a bash shell directly on Windows in an Ubuntu-based
environment. Within this environment you can cross compile for Windows without
the need for a separate Linux VM or server. Note that while WSL can be installed with
other Linux variants, such as OpenSUSE, the following instructions have only been
tested with Ubuntu Bionic.

This feature is not supported in versions of Windows prior to Windows 10 or on
Windows Server SKUs. In addition, it is available [only for 64-bit versions of
Windows](https://msdn.microsoft.com/en-us/commandline/wsl/install_guide).

Full instructions to install WSL are available on the above link.
To install WSL on Windows 10 with Fall Creators Update installed (version >= 16215.0) do the following:

1. Enable the Windows Subsystem for Linux feature
  * Open the Windows Features dialog (`OptionalFeatures.exe`)
  * Enable 'Windows Subsystem for Linux'
  * Click 'OK' and restart if necessary
2. Install Ubuntu
  * Open Microsoft Store and search for Ubuntu or use [this link](https://www.microsoft.com/store/productId/9NBLGGH4MSV6)
  * Click Install
3. Complete Installation
  * Open a cmd prompt and type "Ubuntu"
  * Create a new UNIX user account (this is a separate account from your Windows account)

After the bash shell is active, you can follow the instructions below, starting
with the "Cross-compilation" section. Compiling the 64-bit version is
recommended, but it is possible to compile the 32-bit version.

Cross-compilation for Ubuntu and Windows Subsystem for Linux
------------------------------------------------------------

At the time of writing the Windows Subsystem for Linux installs Ubuntu Bionic 18.04.
The steps below can be performed on Ubuntu (including in a VM) or WSL. The depends system
will also work on other Linux distributions, however the commands for
installing the toolchain will be different.

First, install the general dependencies:

    sudo apt update
    sudo apt upgrade
    sudo apt install autoconf automake build-essential bsdmainutils curl git libboost-dev libevent-dev libssl-dev libtool ninja-build pkg-config python3 python-pytest

The cmake version packaged with Ubuntu Bionic is too old for building Building Bitcoin ABC.
To install the latest version:

    sudo apt-get install apt-transport-https ca-certificates gnupg software-properties-common wget
    wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc 2>/dev/null | sudo apt-key add -
    sudo apt-add-repository 'deb https://apt.kitware.com/ubuntu/ bionic main'
    sudo apt update
    sudo apt install cmake

A host toolchain (`build-essential`) is necessary because some dependency
packages (such as `protobuf`) need to build host utilities that are used in the
build process.

See also: [dependencies.md](dependencies.md).

## Building for 64-bit Windows

The first step is to install the mingw-w64 cross-compilation tool chain. Due to different Ubuntu
packages for each distribution and problems with the Xenial packages the steps for each are different.

Common steps to install mingw32 cross compiler tool chain:

    sudo apt install g++-mingw-w64-x86-64

Ubuntu Xenial 16.04 and Windows Subsystem for Linux <sup>[1](#footnote1),[2](#footnote2)</sup>:

    sudo apt install software-properties-common
    sudo add-apt-repository "deb http://archive.ubuntu.com/ubuntu artful universe"
    sudo apt update
    sudo apt upgrade
    sudo update-alternatives --config x86_64-w64-mingw32-g++ # Set the default mingw32 g++ compiler option to posix.
    sudo update-alternatives --config x86_64-w64-mingw32-gcc # Set the default mingw32 gcc compiler option to posix.

Ubuntu Artful 17.10 <sup>[2](#footnote2)</sup> and later, including Ubuntu Bionic on WSL:

    sudo update-alternatives --config x86_64-w64-mingw32-g++ # Set the default mingw32 g++ compiler option to posix.
    sudo update-alternatives --config x86_64-w64-mingw32-gcc # Set the default mingw32 gcc compiler option to posix.

Once the toolchain is installed the build steps are common:

Note that for WSL the Bitcoin ABC source path MUST be somewhere in the default mount file system, for
example /usr/src/bitcoin-abc, AND not under /mnt/d/.
This means you cannot use a directory that is located directly on the host Windows file system to perform the build.

Acquire the source in the usual way:

    git clone https://github.com/Bitcoin-ABC/bitcoin-abc.git

Once the source code is ready the build steps are below:

    PATH=$(echo "$PATH" | sed -e 's/:\/mnt.*//g') # strip out problematic Windows %PATH% imported var
    cd depends
    make build-win64
    cd ..
    mkdir build
    cd build
    cmake -GNinja .. -DCMAKE_TOOLCHAIN_FILE=../cmake/platforms/Win64.cmake -DBUILD_SEEDER=OFF # seeder not supported in Windows yet
    ninja

## Depends system

For further documentation on the depends system see [README.md](../depends/README.md) in the depends directory.

Installation
-------------

After building using the Windows subsystem it can be useful to copy the compiled
executables to a directory on the Windows drive in the same directory structure
as they appear in the release `.zip` archive. This can be done in the following
way. This will install to `c:\workspace\bitcoin-abc`, for example:

    cmake -GNinja .. -DCMAKE_TOOLCHAIN_FILE=../cmake/platforms/Win64.cmake -DBUILD_SEEDER=OFF -DCMAKE_INSTALL_PREFIX=/mnt/c/workspace/bitcoin-abc
    ninja install

Footnotes
---------

<a name="footnote1">1</a>: There is currently a bug in the 64 bit Mingw-w64 cross compiler packaged for WSL/Ubuntu Xenial 16.04 that
causes two of the bitcoin executables to crash shortly after start up. The bug is related to the
-fstack-protector-all g++ compiler flag which is used to mitigate buffer overflows.
Installing the Mingw-w64 packages from the Ubuntu 17.10 distribution solves the issue, however, this is not
an officially supported approach and it's only recommended if you are prepared to reinstall WSL/Ubuntu should
something break.

<a name="footnote2">2</a>: Starting from Ubuntu Xenial 16.04, the Mingw-w64 packages install two different compiler
options to allow a choice between either posix or win32 threads. The default option is win32 threads which is the more
efficient since it will result in binary code that links directly with the Windows kernel32.lib. Unfortunately, the headers
required to support win32 threads conflict with some of the classes in the C++11 standard library, in particular std::mutex.
It's not possible to build the Bitcoin ABC code using the win32 version of the Mingw-w64 cross compilers (at least not without
modifying headers in the Bitcoin ABC source code).
