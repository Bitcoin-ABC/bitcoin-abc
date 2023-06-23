#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -e

. ../../base.sh

BUILDDIR="$CONTRIB/build-linux/appimage/build/appimage"
APPDIR="$BUILDDIR/$PACKAGE.AppDir"
CACHEDIR="$CONTRIB/build-linux/appimage/.cache/appimage"
PYDIR="${APPDIR}/usr/lib/python${PY_VER_MAJOR}"

export GCC_STRIP_BINARIES="1"

# pinned versions
PKG2APPIMAGE_COMMIT="eb8f3acdd9f11ab19b78f5cb15daa772367daf15"

APPIMAGE="$DISTDIR/$PACKAGE-${ELECTRUM_VERSION}-x86_64.AppImage"

rm -rf "$BUILDDIR"
mkdir -p "$APPDIR" "$CACHEDIR" "$DISTDIR"

info "downloading some dependencies."
download_if_not_exist "$CACHEDIR/functions.sh" "https://raw.githubusercontent.com/AppImage/pkg2appimage/$PKG2APPIMAGE_COMMIT/functions.sh"
verify_hash "$CACHEDIR/functions.sh" "78b7ee5a04ffb84ee1c93f0cb2900123773bc6709e5d1e43c37519f590f86918"

download_if_not_exist "$CACHEDIR/appimagetool" "https://github.com/AppImage/AppImageKit/releases/download/13/appimagetool-x86_64.AppImage"
verify_hash "$CACHEDIR/appimagetool" "df3baf5ca5facbecfc2f3fa6713c29ab9cefa8fd8c1eac5d283b79cab33e4acb"

download_if_not_exist "$CACHEDIR/Python-$PYTHON_VERSION.tar.xz" "https://www.python.org/ftp/python/$PYTHON_VERSION/Python-$PYTHON_VERSION.tar.xz"
verify_hash "$CACHEDIR/Python-$PYTHON_VERSION.tar.xz" $PYTHON_SRC_TARBALL_HASH

(
    cd "${ELECTRUM_ROOT}"
    for pkg in secp zbar ; do
        "$CONTRIB"/make_$pkg || fail "Could not build $pkg"
    done
)

info "Building Python"
tar xf "$CACHEDIR/Python-$PYTHON_VERSION.tar.xz" -C "$BUILDDIR"
(
    cd "$BUILDDIR/Python-$PYTHON_VERSION"
    LC_ALL=C export BUILD_DATE=$(date -u -d "@$SOURCE_DATE_EPOCH" "+%b %d %Y")
    LC_ALL=C export BUILD_TIME=$(date -u -d "@$SOURCE_DATE_EPOCH" "+%H:%M:%S")
    # Patch taken from Ubuntu Patch taken from Ubuntu http://archive.ubuntu.com/ubuntu/pool/main/p/python3.9/python3.9_3.9.5-3~21.04.debian.tar.xz
    patch -p1 < "$CONTRIB/build-linux/appimage/patches/python-3.9-reproducible-buildinfo.diff" || fail "Could not patch Python build system for reproducibility"
    ./configure \
      --cache-file="$CACHEDIR/python.config.cache" \
      --prefix="$APPDIR/usr" \
      --enable-ipv6 \
      --enable-shared \
      -q || fail "Python configure failed"
    make -j$WORKER_COUNT -s || fail "Could not build Python"
    make -s install > /dev/null || fail "Failed to install Python"
    # When building in docker on macOS, python builds with .exe extension because the
    # case insensitive file system of macOS leaks into docker. This causes the build
    # to result in a different output on macOS compared to Linux. We simply patch
    # sysconfigdata to remove the extension.
    # Some more info: https://bugs.python.org/issue27631
    sed -i -e 's/\.exe//g' "$PYDIR"/_sysconfigdata*
)

appdir_python() {
  env \
    PYTHONNOUSERSITE=1 \
    LD_LIBRARY_PATH="$APPDIR/usr/lib:$APPDIR/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH+:$LD_LIBRARY_PATH}" \
    "$APPDIR/usr/bin/python${PY_VER_MAJOR}" "$@"
}

python='appdir_python'

info "Installing pip"
"$python" -m ensurepip


info "Preparing electrum-locale"
(
    cd "${ELECTRUM_ROOT}"
    setup_pkg "electrum-locale" ${ELECTRUM_LOCALE_REPO} ${ELECTRUM_LOCALE_COMMIT} "$CONTRIB"
    if ! which msgfmt > /dev/null 2>&1; then
        fail "Please install gettext"
    fi
    for i in ./locale/*; do
        dir="${ELECTRUM_ROOT}/electrumabc/$i/LC_MESSAGES"
        mkdir -p $dir
        msgfmt --output-file="$dir/electron-cash.mo" "$i/electron-cash.po" || true
    done
    popd_pkg
)


info "Installing the application and its dependencies"
mkdir -p "$CACHEDIR/pip_cache"
"$python" -m pip install --no-deps --no-warn-script-location --no-binary :all: --cache-dir "$CACHEDIR/pip_cache" -r "$CONTRIB/deterministic-build/requirements-pip.txt"
"$python" -m pip install --no-deps --no-warn-script-location --no-binary :all: --cache-dir "$CACHEDIR/pip_cache" -r "$CONTRIB/deterministic-build/requirements.txt"
"$python" -m pip install --no-deps --no-warn-script-location --no-binary :all: --only-binary pyqt5 --cache-dir "$CACHEDIR/pip_cache" -r "$CONTRIB/deterministic-build/requirements-binaries.txt"
"$python" -m pip install --no-deps --no-warn-script-location --no-binary :all: --cache-dir "$CACHEDIR/pip_cache" -r "$CONTRIB/deterministic-build/requirements-hw.txt"
"$python" -m pip install --no-deps --no-warn-script-location --cache-dir "$CACHEDIR/pip_cache" "${ELECTRUM_ROOT}"
"$python" -m pip uninstall -y -r "$CONTRIB/requirements/requirements-build-uninstall.txt"


info "Copying desktop integration"
cp -fp "${ELECTRUM_ROOT}/$SCRIPTNAME.desktop" "$APPDIR/$SCRIPTNAME.desktop"
cp -fp "${ELECTRUM_ROOT}/icons/electrumABC.png" "$APPDIR/electrumABC.png"


# add launcher
info "Adding launcher"
cp -fp "$CONTRIB/build-linux/appimage/scripts/common.sh" "$APPDIR/common.sh" || fail "Could not copy python script"
cp -fp "$CONTRIB/build-linux/appimage/scripts/apprun.sh" "$APPDIR/AppRun" || fail "Could not copy AppRun script"
cp -fp "$CONTRIB/build-linux/appimage/scripts/python.sh" "$APPDIR/python" || fail "Could not copy python script"

info "Finalizing AppDir"
(
    export PKG2AICOMMIT="$PKG2APPIMAGE_COMMIT"
    . "$CACHEDIR/functions.sh"

    cd "$APPDIR"
    # copy system dependencies
    copy_deps
    move_lib

    # apply global appimage blacklist to exclude stuff
    # move usr/include out of the way to preserve usr/include/python${PY_VER_MAJOR}.
    mv usr/include usr/include.tmp
    delete_blacklisted
    mv usr/include.tmp usr/include
) || fail "Could not finalize AppDir"

# We copy some libraries here that are on the AppImage excludelist
info "Copying additional libraries"

# On some systems it can cause problems to use the system libusb
cp -fp /usr/lib/x86_64-linux-gnu/libusb-1.0.so "$APPDIR"/usr/lib/x86_64-linux-gnu/. || fail "Could not copy libusb"

# some distros lack libxkbcommon-x11
cp -f /usr/lib/x86_64-linux-gnu/libxkbcommon-x11.so.0 "$APPDIR"/usr/lib/x86_64-linux-gnu || fail "Could not copy libxkbcommon-x11"

# some distros lack some libxcb libraries (see #2189, #2196)
cp -f /usr/lib/x86_64-linux-gnu/libxcb* "$APPDIR"/usr/lib/x86_64-linux-gnu || fail "Could not copy libxkcb"

info "Stripping binaries of debug symbols"
# "-R .note.gnu.build-id" also strips the build id
# "-R .comment" also strips the GCC version information
strip_binaries()
{
  chmod u+w -R "$APPDIR"
  {
    printf '%s\0' "$APPDIR/usr/bin/python${PY_VER_MAJOR}"
    find "$APPDIR" -type f -regex '.*\.so\(\.[0-9.]+\)?$' -print0
  } | xargs -0 --no-run-if-empty --verbose strip -R .note.gnu.build-id -R .comment
}
strip_binaries

remove_emptydirs()
{
  find "$APPDIR" -type d -empty -print0 | xargs -0 --no-run-if-empty rmdir -vp --ignore-fail-on-non-empty
}
remove_emptydirs


info "Removing some unneeded files to decrease binary size"
rm -rf "$APPDIR"/usr/{share,include}
rm -rf "$PYDIR"/{test,ensurepip,lib2to3,idlelib,turtledemo}
rm -rf "$PYDIR"/{ctypes,sqlite3,tkinter,unittest}/test
rm -rf "$PYDIR"/distutils/{command,tests}
rm -rf "$PYDIR"/config-3.9m-x86_64-linux-gnu
rm -rf "$PYDIR"/site-packages/Cryptodome/SelfTest
rm -rf "$PYDIR"/site-packages/{psutil,qrcode}/tests
for component in connectivity declarative location multimedia quickcontrols quickcontrols2 serialport webengine websockets xmlpatterns ; do
  rm -rf "$PYDIR"/site-packages/PyQt5/Qt/translations/qt${component}_*
done
rm -rf "$PYDIR"/site-packages/PyQt5/Qt/{qml,libexec,qsci}
rm -rf "$PYDIR"/site-packages/PyQt5/{pyrcc.so,pylupdate.so,uic,bindings}
rm -rf "$PYDIR"/site-packages/PyQt5/Qt/plugins/{assetimporters,bearer,gamepads,geometryloaders,geoservices,playlistformats,position,printsupport,renderplugins,sceneparsers,sensors,sqldrivers,texttospeech,webview}
for component in Bluetooth Concurrent Designer Help Location NetworkAuth Nfc Positioning PositioningQuick PrintSupport Qml Quick RemoteObjects Sensors SerialPort Sql Test TextToSpeech Web Xml ; do

    rm -rf "$PYDIR"/site-packages/PyQt5/Qt/lib/libQt5${component}*
    rm -rf "$PYDIR"/site-packages/PyQt5/Qt${component}*
done
rm -rf "$PYDIR"/site-packages/PyQt5/Qt.*

# these are deleted as they were not deterministic; and are not needed anyway
find "$APPDIR" -path '*/__pycache__*' -delete
rm -rf "$PYDIR"/site-packages/*.dist-info/
rm -rf "$PYDIR"/site-packages/*.egg-info/

# set timestamps in dist, in order to make the installer reproducible
find -exec touch -h -d '2000-11-11T11:11:11+00:00' {} +


info "Creating the AppImage"
(
    cd "$BUILDDIR"
    cp "$CACHEDIR/appimagetool" "$CACHEDIR/appimagetool_copy"
    # zero out "appimage" magic bytes, as on some systems they confuse the linker
    sed -i 's|AI\x02|\x00\x00\x00|' "$CACHEDIR/appimagetool_copy"
    chmod +x "$CACHEDIR/appimagetool_copy"
    "$CACHEDIR/appimagetool_copy" --appimage-extract
    # We build a small wrapper for mksquashfs that removes the -mkfs-fixed-time option
    # as it conflicts with SOURCE_DATE_EPOCH.
    mv "$BUILDDIR/squashfs-root/usr/lib/appimagekit/mksquashfs" "$BUILDDIR/squashfs-root/usr/lib/appimagekit/mksquashfs_orig"
    cat > "$BUILDDIR/squashfs-root/usr/lib/appimagekit/mksquashfs" << EOF
#!/bin/sh
args=\$(echo "\$@" | sed -e 's/-mkfs-time 0//')
"$BUILDDIR/squashfs-root/usr/lib/appimagekit/mksquashfs_orig" \$args
EOF
    chmod +x "$BUILDDIR/squashfs-root/usr/lib/appimagekit/mksquashfs"
    env VERSION="${ELECTRUM_VERSION}" ARCH=x86_64 ./squashfs-root/AppRun --no-appstream --verbose "$APPDIR" "$APPIMAGE" \
                || fail "AppRun failed"
) || fail "Could not create the AppImage"


info "Done"
ls -la "$DISTDIR"
sha256sum "$DISTDIR"/*
