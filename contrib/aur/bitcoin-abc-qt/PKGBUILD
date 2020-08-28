# Maintainer: Josh Ellithorpe <quest@mac.com>

pkgname=bitcoin-abc-qt
pkgver=0.22.0
pkgrel=0
pkgdesc="Bitcoin ABC with bitcoind, bitcoin-cli, bitcoin-tx, bitcoin-seeder and bitcoin-qt"
arch=('i686' 'x86_64')
url="https://bitcoinabc.org"
depends=('boost-libs' 'libevent' 'desktop-file-utils' 'qt5-base' 'protobuf' 'openssl' 'miniupnpc' 'zeromq' 'qrencode' 'jemalloc')
makedepends=('cmake' 'ninja' 'boost' 'qt5-tools')
license=('MIT')
source=(https://github.com/Bitcoin-ABC/bitcoin-abc/archive/v$pkgver.tar.gz
        bitcoin.conf
        bitcoin.logrotate
        bitcoin.service
        bitcoin-reindex.service
        bitcoin.install)
sha256sums=('feaffb2129f49813692ec17ba5675a3ac44e6d0560af55bb4d1d2f160c5b4a0b'
            'c30e5c7e0e97b001fdeac5f4510d5ebc0e0499ec086325e845db609a24f2e22f'
            '8f05207b586916d489b7d25a68eaacf6e678d7cbb5bfbac551903506b32f904f'
            'f2fd9d8331238727333cf2412ba3759cb194a65b2060eff36808b24c06382104'
            '497dbeefb9cd9792757a9b6e1fbfd92710d19990ee2959add6c30533ae40b6f6'
            '45429013dae87a58bc79ca7b7a037665bf8592cae0199bcf4aef088fb950e78a')
backup=('etc/bitcoin/bitcoin.conf'
        'etc/logrotate.d/bitcoin')
provides=('bitcoin-cli' 'bitcoin-daemon' 'bitcoin-tx' 'bitcoin-qt' 'bitcoin-seeder')
conflicts=('bitcoin-cli' 'bitcoin-daemon' 'bitcoin-tx' 'bitcoin-qt' 'bitcoin-seeder')
install=bitcoin.install

build() {
  cd "$srcdir/bitcoin-abc-$pkgver"

  msg2 'Building...'
  mkdir -p build
  pushd build

  cmake -GNinja .. \
    -DENABLE_CLANG_TIDY=OFF \
    -DCLIENT_VERSION_IS_RELEASE=ON \
    -DENABLE_REDUCE_EXPORTS=ON \
    -DENABLE_STATIC_LIBSTDCXX=ON \
    -DCMAKE_INSTALL_PREFIX=$pkgdir/usr

  ninja
  popd
}

check() {
  cd "$srcdir/bitcoin-abc-$pkgver/build"

  msg2 'Testing...'
  #ninja check
}

package() {
  cd "$srcdir/bitcoin-abc-$pkgver"

  msg2 'Installing desktop shortcut...'
  install -Dm644 contrib/debian/bitcoin-qt.desktop \
    "$pkgdir"/usr/share/applications/bitcoin.desktop
  install -Dm644 share/pixmaps/bitcoin-abc128.png \
    "$pkgdir"/usr/share/pixmaps/bitcoin-abc128.png

  msg2 'Installing license...'
  install -Dm 644 COPYING -t "$pkgdir/usr/share/licenses/${pkgname}"

  msg2 'Installing examples...'
  install -Dm644 "contrib/debian/examples/bitcoin.conf" \
    -t "$pkgdir/usr/share/doc/bitcoin/examples"

  msg2 'Installing documentation...'
  install -dm 755 "$pkgdir/usr/share/doc/bitcoin"
  for _doc in \
    $(find doc -maxdepth 1 -type f -name "*.md" -printf '%f\n') \
    release-notes; do
      cp -dpr --no-preserve=ownership "doc/$_doc" \
        "$pkgdir/usr/share/doc/bitcoin/$_doc"
  done

  msg2 'Installing essential directories'
  install -dm 700 "$pkgdir/etc/bitcoin"
  install -dm 755 "$pkgdir/srv/bitcoin"
  install -dm 755 "$pkgdir/run/bitcoin"

  pushd build
  msg2 'Installing executables and man pages...'
  cmake -DCOMPONENT=bitcoind -P cmake_install.cmake
  cmake -DCOMPONENT=bitcoin-qt -P cmake_install.cmake
  cmake -DCOMPONENT=bitcoin-seeder -P cmake_install.cmake
  popd

  msg2 'Installing bitcoin.conf...'
  install -Dm 600 "$srcdir/bitcoin.conf" -t "$pkgdir/etc/bitcoin"

  msg2 'Installing bitcoin.service...'
  install -Dm 644 "$srcdir/bitcoin.service" -t "$pkgdir/usr/lib/systemd/system"
  install -Dm 644 "$srcdir/bitcoin-reindex.service" \
    -t "$pkgdir/usr/lib/systemd/system"

  msg2 'Installing bitcoin.logrotate...'
  install -Dm 644 "$srcdir/bitcoin.logrotate" "$pkgdir/etc/logrotate.d/bitcoin"

  msg2 'Installing bash completion...'
  for _compl in bitcoin-cli bitcoin-tx bitcoind; do
    install -Dm 644 "contrib/${_compl}.bash-completion" \
      "$pkgdir/usr/share/bash-completion/completions/$_compl"
  done
}
