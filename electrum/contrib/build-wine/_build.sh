#!/usr/bin/env bash

export LC_ALL=C.UTF-8

here=$(dirname "$0")
test -n "$here" -a -d "$here" || (echo "Cannot determine build dir. FIXME!" && exit 1)
pushd "$here"
here=`pwd`  # get an absolute path
popd

if [ "$WIN_ARCH" = "win32" ] ; then
    export GCC_TRIPLET_HOST="i686-w64-mingw32"
elif [ "$WIN_ARCH" = "win64" ] ; then
    export GCC_TRIPLET_HOST="x86_64-w64-mingw32"
else
    echo "unexpected WIN_ARCH: $WIN_ARCH"
    exit 1
fi

export BUILD_TYPE="wine"
export GCC_TRIPLET_BUILD="x86_64-pc-linux-gnu"
export GCC_STRIP_BINARIES="1"

. "$here"/../base.sh # functions we use below (fail, et al)

set -e

info "Clearing $here/build and $here/dist..."
rm "$here"/build/* -fr
rm "$here"/dist/* -fr

rm -fr /tmp/electrum-build
mkdir -p /tmp/electrum-build

(
    cd "$ELECTRUM_ROOT"
    for pkg in secp zbar ; do
        "$here"/../make_$pkg || fail "Could not build $pkg"
    done
)

prepare_wine() {
    info "Preparing Wine..."
    (
        set -e
        pushd "$here"
        here=`pwd`
        # Please update these carefully, some versions won't work under Wine

        NSIS_URL='https://prdownloads.sourceforge.net/nsis/nsis-3.06.1-setup.exe'
        NSIS_SHA256=f60488a676308079bfdf6845dc7114cfd4bbff47b66be4db827b89bb8d7fdc52

        # libusb 1.0.24
        LIBUSB_REPO='https://github.com/libusb/libusb.git'
        LIBUSB_COMMIT="c6a35c56016ea2ab2f19115d2ea1e85e0edae155"

        PYINSTALLER_REPO='https://github.com/pyinstaller/pyinstaller.git'
        PYINSTALLER_COMMIT=90256f93ed943daf6de53c7dd39710a415f705cb # Version 6.4.0

        ## These settings probably don't need change
        PYHOME=c:/python$PYTHON_VERSION
        PYTHON="wine $PYHOME/python.exe -OO -B"

        info "Cleaning tmp"
        rm -rf $HOME/tmp
        mkdir -p $HOME/tmp
        info "done"

        pushd $HOME/tmp

        # note: you might need "sudo apt-get install dirmngr" for the following
        # if the verification fails you might need to get more keys from python.org
        # keys from https://www.python.org/downloads/#pubkeys
        info "Importing Python dev keyring (may take a few minutes)..."
        # FIXME
        KEYRING_PYTHON_DEV=keyring-electroncash-build-python-dev.gpg
        gpg -v --no-default-keyring --keyring $KEYRING_PYTHON_DEV --import \
            "$here"/pgp/7ed10b6531d7c8e1bc296021fc624643487034e5.asc \
            || fail "Failed to import Python release signing keys"

        info "Installing Python ..."
        if [ "$WIN_ARCH" = "win32" ] ; then
            PYARCH="win32"
        elif [ "$WIN_ARCH" = "win64" ] ; then
            PYARCH="amd64"
        else
            fail "unexpected WIN_ARCH: $WIN_ARCH"
        fi
        # Install Python
        for msifile in core dev exe lib pip tools; do
            info "Installing $msifile..."
            wget "https://www.python.org/ftp/python/$PYTHON_VERSION/$PYARCH/${msifile}.msi"
            wget "https://www.python.org/ftp/python/$PYTHON_VERSION/$PYARCH/${msifile}.msi.asc"
            verify_signature "${msifile}.msi.asc" $KEYRING_PYTHON_DEV
            wine msiexec /i "${msifile}.msi" /qn TARGETDIR=$PYHOME || fail "Failed to install Python component: ${msifile}"
        done

        # The below requirement files use hashed packages that we
        # need for pyinstaller and other parts of the build.  Using a hashed
        # requirements file hardens the build against dependency attacks.
        info "Installing pip from requirements-pip.txt ..."
        $PYTHON -m pip install --no-deps --no-warn-script-location -r $here/../deterministic-build/requirements-pip.txt || fail "Failed to install pip"
        info "Installing build requirements from requirements-build-wine.txt ..."
        $PYTHON -m pip install --no-deps --no-warn-script-location -r $here/../deterministic-build/requirements-build-wine.txt || fail "Failed to install build requirements"

        info "Compiling PyInstaller bootloader with AntiVirus False-Positive Protection™ ..."
        mkdir pyinstaller
        (
            cd pyinstaller
            # Shallow clone
            git init
            git remote add origin $PYINSTALLER_REPO
            git fetch --depth 1 origin $PYINSTALLER_COMMIT
            git checkout -b pinned "${PYINSTALLER_COMMIT}^{commit}"
            rm -fv PyInstaller/bootloader/Windows-*/run*.exe || true  # Make sure EXEs that came with repo are deleted -- we rebuild them and need to detect if build failed
            if [ ${PYI_SKIP_TAG:-0} -eq 0 ] ; then
                echo "const char *ec_tag = \"tagged by $PACKAGE@$GIT_COMMIT_HASH\";" >> ./bootloader/src/pyi_main.c
            else
                warn "Skipping PyInstaller tag"
            fi
            pushd bootloader
            python3 ./waf all CC="${GCC_TRIPLET_HOST}-gcc" \
                              CFLAGS="-static"
            # Note: it's possible for the EXE to not be there if the build
            # failed but didn't return exit status != 0 to the shell (waf bug?);
            # So we need to do this to make sure the EXE is actually there.
            # If we switch to 64-bit, edit this path below.
            popd
            if [ "$WIN_ARCH" = "win32" ] ; then
                [[ -e PyInstaller/bootloader/Windows-32bit-intel/runw.exe ]] || fail "Could not find runw.exe in target dir! (32bit)"
            elif [ "$WIN_ARCH" = "win64" ] ; then
                [[ -e PyInstaller/bootloader/Windows-64bit-intel/runw.exe ]] || fail "Could not find runw.exe in target dir! (64bit)"
            else
                fail "unexpected GCC_TRIPLET_HOST: $GCC_TRIPLET_HOST"
            fi
            rm -fv pyinstaller.py # workaround for https://github.com/pyinstaller/pyinstaller/pull/6701
        ) || fail "PyInstaller bootloader build failed"
        info "Installing PyInstaller ..."
        $PYTHON -m pip install --no-deps --no-warn-script-location ./pyinstaller || fail "PyInstaller install failed"

        wine "C:/python$PYTHON_VERSION/scripts/pyinstaller.exe" -v || fail "Pyinstaller installed but cannot be run."

        info "Installing Packages from requirements-binaries ..."
        $PYTHON -m pip install --no-deps --no-warn-script-location -r $here/../deterministic-build/requirements-binaries.txt || fail "Failed to install requirements-binaries"

        info "Installing NSIS ..."
        # Install NSIS installer
        wget -O nsis.exe "$NSIS_URL"
        verify_hash nsis.exe $NSIS_SHA256
        wine nsis.exe /S || fail "Could not run nsis"

        info "Compiling libusb ..."
        mkdir libusb
        (
            cd libusb
            # Shallow clone
            git init
            git remote add origin $LIBUSB_REPO
            git fetch --depth 1 origin $LIBUSB_COMMIT
            git checkout -b pinned "${LIBUSB_COMMIT}^{commit}"
            echo "libusb_1_0_la_LDFLAGS += -Wc,-static" >> libusb/Makefile.am
            ./bootstrap.sh || fail "Could not bootstrap libusb"
            host="$GCC_TRIPLET_HOST"
            LDFLAGS="-Wl,--no-insert-timestamp" ./configure \
                --host=$host \
                --build=$GCC_TRIPLET_BUILD || fail "Could not run ./configure for libusb"
            make -j4 || fail "Could not build libusb"
            ${host}-strip libusb/.libs/libusb-1.0.dll
        ) || fail "libusb build failed"

        # libsecp256k1, libzbar & libusb
        mkdir -p "$WINEPREFIX"/drive_c/tmp
        cp "$here"/../../electrumabc/*.dll "$WINEPREFIX"/drive_c/tmp/ || fail "Could not copy libraries to their destination"
        cp libusb/libusb/.libs/libusb-1.0.dll "$WINEPREFIX"/drive_c/tmp/ || fail "Could not copy libusb to its destination"

        popd  # out of homedir/tmp
        popd  # out of $here

    ) || fail "Could not prepare Wine"
    info "Wine is configured."
}
prepare_wine

build_the_app() {
    info "Building $PACKAGE ..."
    (
        set -e

        pushd "$here"
        here=`pwd`

        NAME_ROOT=$PACKAGE  # PACKAGE comes from ../base.sh
        # These settings probably don't need any change

        # don't create __pycache__/ folders with .pyc files
        export PYTHONDONTWRITEBYTECODE=1

        PYHOME=c:/python$PYTHON_VERSION
        PYTHON="wine $PYHOME/python.exe -OO -B"

        setup_pkg "electrum-locale" ${ELECTRUM_LOCALE_REPO} ${ELECTRUM_LOCALE_COMMIT} "$here/.."
        for i in ./locale/*; do
            dir=$i/LC_MESSAGES
            mkdir -p $dir
            msgfmt --output-file=$dir/electron-cash.mo $i/electron-cash.po || true
        done
        popd_pkg

        pushd "$here"/../..  # go to top level

        ELECTRUM_VERSION=$($PYTHON ${ELECTRUM_ROOT}/setup.py --version | tr -d '\r')
        info "Version to release: ${ELECTRUM_VERSION}"
        info "Fudging timestamps on all files for determinism ..."
        find -exec touch -d '2000-11-11T11:11:11+00:00' {} +
        popd  # go back to $here

        cp -rv "$here"/../build/electrum-locale/locale "$WINEPREFIX"/drive_c/electrumabc/electrumabc/

        # Install frozen dependencies
        info "Installing frozen dependencies ..."
        $PYTHON -m pip install --no-deps --no-warn-script-location -r "$here"/../deterministic-build/requirements.txt || fail "Failed to install requirements"
        $PYTHON -m pip install --no-deps --no-warn-script-location -r "$here"/../deterministic-build/requirements-hw.txt || fail "Failed to install requirements-hw"

        pushd "$WINEPREFIX"/drive_c/electrumabc
        $PYTHON setup.py install || fail "Failed setup.py install"
        popd

        rm -rf dist/

        info "Resetting modification time in C:\Python..."
        # (Because we just installed a bunch of stuff)
        pushd "$WINEPREFIX"/drive_c/python$PYTHON_VERSION
        find -exec touch -d '2000-11-11T11:11:11+00:00' {} +
        ls -l
        popd

        # build standalone and portable versions
        info "Running Pyinstaller to build standalone and portable .exe versions ..."
        ELECTRUM_CMDLINE_NAME="$NAME_ROOT" wine "C:/python$PYTHON_VERSION/scripts/pyinstaller.exe" --noconfirm deterministic.spec || fail "Pyinstaller failed"

        # rename the output files
        pushd dist
        mv $NAME_ROOT.exe $NAME_ROOT-${ELECTRUM_VERSION}.exe
        mv $NAME_ROOT-portable.exe $NAME_ROOT-${ELECTRUM_VERSION}-portable.exe
        popd

        # set timestamps in dist, in order to make the installer reproducible
        pushd dist
        find -exec touch -d '2000-11-11T11:11:11+00:00' {} +
        popd


        # build NSIS installer
        info "Running makensis to build setup .exe version ..."
        # $VERSION could be passed to the electrum-abc.nsi script, but this would require some rewriting in the script iself.
        wine "$WINEPREFIX/drive_c/Program Files/NSIS/makensis.exe" /DPRODUCT_VERSION=${ELECTRUM_VERSION} electrum-abc.nsi || fail "makensis failed"

        cd dist
        mv $NAME_ROOT-setup.exe $NAME_ROOT-${ELECTRUM_VERSION}-setup.exe  || fail "Failed to move $NAME_ROOT-${ELECTRUM_VERSION}-setup.exe to the output dist/ directory"

        ls -la *.exe
        sha256sum *.exe

        popd

    ) || fail "Failed to build $PACKAGE"
    info "Done building."
}
build_the_app
