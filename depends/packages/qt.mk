package=qt
$(package)_version=5.15.5
$(package)_download_path=https://download.qt.io/official_releases/qt/5.15/$($(package)_version)/submodules
$(package)_suffix=everywhere-opensource-src-$($(package)_version).tar.xz
$(package)_file_name=qtbase-$($(package)_suffix)
$(package)_sha256_hash=0c42c799aa7c89e479a07c451bf5a301e291266ba789e81afc18f95049524edc
ifneq ($(openssl_packages_),)
$(package)_dependencies=openssl
endif
$(package)_linux_dependencies=freetype fontconfig libxcb libxkbcommon libxcb_util libxcb_util_render libxcb_util_keysyms libxcb_util_image libxcb_util_wm
$(package)_qt_libs=corelib network widgets gui plugins testlib
$(package)_linguist_tools = lrelease lupdate lconvert
$(package)_patches = qt.pro
$(package)_patches += qttools_src.pro
$(package)_patches += mac-qmake.conf
$(package)_patches += fix_qt_pkgconfig.patch
$(package)_patches += no-xlib.patch
$(package)_patches += dont_hardcode_x86_64.patch
$(package)_patches += fix_montery_include.patch
$(package)_patches += dont_hardcode_pwd.patch
$(package)_patches += qtbase-moc-ignore-gcc-macro.patch
$(package)_patches += rcc_hardcode_timestamp.patch
$(package)_patches += duplicate_lcqpafonts.patch
$(package)_patches += fast_fixed_dtoa_no_optimize.patch
$(package)_patches += guix_cross_lib_path.patch

$(package)_qttranslations_file_name=qttranslations-$($(package)_suffix)
$(package)_qttranslations_sha256_hash=c92af4171397a0ed272330b4fa0669790fcac8d050b07c8b8cc565ebeba6735e

$(package)_qttools_file_name=qttools-$($(package)_suffix)
$(package)_qttools_sha256_hash=6d0778b71b2742cb527561791d1d3d255366163d54a10f78c683a398f09ffc6c

$(package)_extra_sources  = $($(package)_qttranslations_file_name)
$(package)_extra_sources += $($(package)_qttools_file_name)

define $(package)_set_vars
$(package)_config_env = QT_MAC_SDK_NO_VERSION_CHECK=1
$(package)_config_opts_release = -release
$(package)_config_opts_release += -silent
$(package)_config_opts_debug = -debug
$(package)_config_opts_debug += -optimized-tools
$(package)_config_opts += -bindir $(build_prefix)/bin
$(package)_config_opts += -c++std c++17
$(package)_config_opts += -confirm-license
$(package)_config_opts += -hostprefix $(build_prefix)
$(package)_config_opts += -no-compile-examples
$(package)_config_opts += -no-cups
$(package)_config_opts += -no-egl
$(package)_config_opts += -no-eglfs
$(package)_config_opts += -no-evdev
$(package)_config_opts += -no-gif
$(package)_config_opts += -no-glib
$(package)_config_opts += -no-icu
$(package)_config_opts += -no-ico
$(package)_config_opts += -no-iconv
$(package)_config_opts += -no-kms
$(package)_config_opts += -no-linuxfb
$(package)_config_opts += -no-libjpeg
$(package)_config_opts += -no-libproxy
$(package)_config_opts += -no-libudev
$(package)_config_opts += -no-mimetype-database
$(package)_config_opts += -no-mtdev
$(package)_config_opts += -no-opengl
$(package)_config_opts += -no-openvg
$(package)_config_opts += -no-reduce-relocations
$(package)_config_opts += -no-schannel
$(package)_config_opts += -no-sctp
$(package)_config_opts += -no-securetransport
$(package)_config_opts += -no-sql-db2
$(package)_config_opts += -no-sql-ibase
$(package)_config_opts += -no-sql-oci
$(package)_config_opts += -no-sql-tds
$(package)_config_opts += -no-sql-mysql
$(package)_config_opts += -no-sql-odbc
$(package)_config_opts += -no-sql-psql
$(package)_config_opts += -no-sql-sqlite
$(package)_config_opts += -no-sql-sqlite2
$(package)_config_opts += -no-system-proxies
$(package)_config_opts += -no-use-gold-linker
$(package)_config_opts += -no-zstd
$(package)_config_opts += -nomake examples
$(package)_config_opts += -nomake tests
$(package)_config_opts += -nomake tools
$(package)_config_opts += -opensource
ifneq ($(openssl_packages_),)
$(package)_config_opts += -openssl-linked
else
$(package)_config_opts += -no-openssl
endif
$(package)_config_opts += -pkg-config
$(package)_config_opts += -prefix $(host_prefix)
$(package)_config_opts += -qt-libpng
$(package)_config_opts += -qt-pcre
$(package)_config_opts += -qt-harfbuzz
$(package)_config_opts += -qt-zlib
$(package)_config_opts += -static
$(package)_config_opts += -v
$(package)_config_opts += -no-feature-bearermanagement
$(package)_config_opts += -no-feature-colordialog
$(package)_config_opts += -no-feature-commandlineparser
$(package)_config_opts += -no-feature-concurrent
$(package)_config_opts += -no-feature-dial
$(package)_config_opts += -no-feature-fontcombobox
$(package)_config_opts += -no-feature-ftp
$(package)_config_opts += -no-feature-http
$(package)_config_opts += -no-feature-image_heuristic_mask
$(package)_config_opts += -no-feature-keysequenceedit
$(package)_config_opts += -no-feature-lcdnumber
$(package)_config_opts += -no-feature-networkdiskcache
$(package)_config_opts += -no-feature-pdf
$(package)_config_opts += -no-feature-printdialog
$(package)_config_opts += -no-feature-printer
$(package)_config_opts += -no-feature-printpreviewdialog
$(package)_config_opts += -no-feature-printpreviewwidget
$(package)_config_opts += -no-feature-sessionmanager
$(package)_config_opts += -no-feature-socks5
$(package)_config_opts += -no-feature-sql
$(package)_config_opts += -no-feature-sqlmodel
$(package)_config_opts += -no-feature-statemachine
$(package)_config_opts += -no-feature-syntaxhighlighter
$(package)_config_opts += -no-feature-textbrowser
$(package)_config_opts += -no-feature-textmarkdownwriter
$(package)_config_opts += -no-feature-textodfwriter
$(package)_config_opts += -no-feature-topleveldomain
$(package)_config_opts += -no-feature-udpsocket
$(package)_config_opts += -no-feature-undocommand
$(package)_config_opts += -no-feature-undogroup
$(package)_config_opts += -no-feature-undostack
$(package)_config_opts += -no-feature-undoview
$(package)_config_opts += -no-feature-vnc
$(package)_config_opts += -no-feature-wizard
$(package)_config_opts += -no-feature-xml

$(package)_config_opts_darwin = -no-dbus
$(package)_config_opts_darwin += -pch
$(package)_config_opts_darwin += -no-feature-corewlan
$(package)_config_opts_darwin += QMAKE_MACOSX_DEPLOYMENT_TARGET=$(OSX_MIN_VERSION)
$(package)_config_opts_darwin += -no-freetype

ifneq ($(build_os),darwin)
$(package)_config_opts_darwin += -xplatform macx-clang-linux
$(package)_config_opts_darwin += -device-option MAC_SDK_PATH=$(OSX_SDK)
$(package)_config_opts_darwin += -device-option MAC_SDK_VERSION=$(OSX_SDK_VERSION)
$(package)_config_opts_darwin += -device-option CROSS_COMPILE="$(host)-"
$(package)_config_opts_darwin += -device-option MAC_TARGET=$(host)
$(package)_config_opts_darwin += -device-option XCODE_VERSION=$(XCODE_VERSION)
endif

ifneq ($(build_arch),$(host_arch))
$(package)_config_opts_aarch64_darwin += -device-option QMAKE_APPLE_DEVICE_ARCHS=arm64
$(package)_config_opts_x86_64_darwin += -device-option QMAKE_APPLE_DEVICE_ARCHS=x86_64
endif

$(package)_config_opts_linux = -xcb
$(package)_config_opts_linux += -no-xcb-xlib
$(package)_config_opts_linux += -no-feature-xlib
$(package)_config_opts_linux += -system-freetype
$(package)_config_opts_linux += -fontconfig
$(package)_config_opts_linux += -no-feature-vulkan
$(package)_config_opts_linux += -dbus-runtime
$(package)_config_opts_linux += -platform linux-g++ -xplatform bitcoin-linux-g++
$(package)_config_opts_mingw32 = -no-dbus
$(package)_config_opts_mingw32 += -no-freetype
$(package)_config_opts_mingw32 += -xplatform win32-g++
$(package)_config_opts_mingw32 += "QMAKE_CFLAGS = '$($(package)_cflags) $($(package)_cppflags)'"
$(package)_config_opts_mingw32 += "QMAKE_CXXFLAGS = '$($(package)_cflags) $($(package)_cppflags)'"
$(package)_config_opts_mingw32 += "QMAKE_LFLAGS = '$($(package)_ldflags)'"
$(package)_config_opts_mingw32 += -device-option CROSS_COMPILE="$(host)-"
$(package)_config_opts_mingw32 += -pch

ifneq ($(openssl_packages_),)
$(package)_config_opts_linux += OPENSSL_LIBS="-lssl -lcrypto -lpthread"
$(package)_config_opts_mingw32 += OPENSSL_LIBS="-lssl -lcrypto -lws2_32"
endif
endef

define $(package)_fetch_cmds
$(call fetch_file,$(package),$($(package)_download_path),$($(package)_download_file),$($(package)_file_name),$($(package)_sha256_hash)) && \
$(call fetch_file,$(package),$($(package)_download_path),$($(package)_qttranslations_file_name),$($(package)_qttranslations_file_name),$($(package)_qttranslations_sha256_hash)) && \
$(call fetch_file,$(package),$($(package)_download_path),$($(package)_qttools_file_name),$($(package)_qttools_file_name),$($(package)_qttools_sha256_hash))
endef

define $(package)_extract_cmds
  mkdir -p $($(package)_extract_dir) && \
  echo "$($(package)_sha256_hash)  $($(package)_source)" > $($(package)_extract_dir)/.$($(package)_file_name).hash && \
  echo "$($(package)_qttranslations_sha256_hash)  $($(package)_source_dir)/$($(package)_qttranslations_file_name)" >> $($(package)_extract_dir)/.$($(package)_file_name).hash && \
  echo "$($(package)_qttools_sha256_hash)  $($(package)_source_dir)/$($(package)_qttools_file_name)" >> $($(package)_extract_dir)/.$($(package)_file_name).hash && \
  $(build_SHA256SUM) -c $($(package)_extract_dir)/.$($(package)_file_name).hash && \
  mkdir qtbase && \
  tar --no-same-owner --strip-components=1 -xf $($(package)_source) -C qtbase && \
  mkdir qttranslations && \
  tar --no-same-owner --strip-components=1 -xf $($(package)_source_dir)/$($(package)_qttranslations_file_name) -C qttranslations && \
  mkdir qttools && \
  tar --no-same-owner --strip-components=1 -xf $($(package)_source_dir)/$($(package)_qttools_file_name) -C qttools
endef

# Preprocessing steps work as follows:
#
# 1. Apply our patches to the extracted source. See each patch for more info.
#
# 2. Create a macOS-Clang-Linux mkspec using our mac-qmake.conf.
#
# 3. After making a copy of the mkspec for the linux-arm-gnueabi host, named
#    bitcoin-linux-g++, replace tool names with $($($(package)_type)_TOOL).
#
# 4. Put our C, CXX and LD FLAGS into gcc-base.conf. Only used for non-host builds.
#
# 5. In clang.conf, swap out clang & clang++, for our compiler + flags. See #17466.
define $(package)_preprocess_cmds
  cp $($(package)_patch_dir)/qt.pro qt.pro && \
  cp $($(package)_patch_dir)/qttools_src.pro qttools/src/src.pro && \
  patch -p1 -i $($(package)_patch_dir)/dont_hardcode_pwd.patch && \
  patch -p1 -i $($(package)_patch_dir)/fix_qt_pkgconfig.patch && \
  patch -p1 -i $($(package)_patch_dir)/no-xlib.patch && \
  patch -p1 -i $($(package)_patch_dir)/dont_hardcode_x86_64.patch && \
  patch -p1 -i $($(package)_patch_dir)/qtbase-moc-ignore-gcc-macro.patch && \
  patch -p1 -i $($(package)_patch_dir)/fix_montery_include.patch && \
  patch -p1 -i $($(package)_patch_dir)/rcc_hardcode_timestamp.patch && \
  patch -p1 -i $($(package)_patch_dir)/duplicate_lcqpafonts.patch && \
  patch -p1 -i $($(package)_patch_dir)/fast_fixed_dtoa_no_optimize.patch && \
  patch -p1 -i $($(package)_patch_dir)/guix_cross_lib_path.patch && \
  mkdir -p qtbase/mkspecs/macx-clang-linux &&\
  cp -f qtbase/mkspecs/macx-clang/qplatformdefs.h qtbase/mkspecs/macx-clang-linux/ &&\
  cp -f $($(package)_patch_dir)/mac-qmake.conf qtbase/mkspecs/macx-clang-linux/qmake.conf && \
  cp -r qtbase/mkspecs/linux-arm-gnueabi-g++ qtbase/mkspecs/bitcoin-linux-g++ && \
  sed -i.old "s|arm-linux-gnueabi-gcc|$($($(package)_type)_CC)|" qtbase/mkspecs/bitcoin-linux-g++/qmake.conf && \
  sed -i.old "s|arm-linux-gnueabi-g++|$($($(package)_type)_CXX)|" qtbase/mkspecs/bitcoin-linux-g++/qmake.conf && \
  sed -i.old "s|arm-linux-gnueabi-ar|$($($(package)_type)_AR)|" qtbase/mkspecs/bitcoin-linux-g++/qmake.conf && \
  sed -i.old "s|arm-linux-gnueabi-objcopy|$($($(package)_type)_OBJCOPY)|" qtbase/mkspecs/bitcoin-linux-g++/qmake.conf && \
  sed -i.old "s|arm-linux-gnueabi-nm|$($($(package)_type)_NM)|" qtbase/mkspecs/bitcoin-linux-g++/qmake.conf && \
  sed -i.old "s|arm-linux-gnueabi-strip|$($($(package)_type)_STRIP)|" qtbase/mkspecs/bitcoin-linux-g++/qmake.conf && \
  echo "!host_build: QMAKE_CFLAGS     += $($(package)_cflags) $($(package)_cppflags)" >> qtbase/mkspecs/common/gcc-base.conf && \
  echo "!host_build: QMAKE_CXXFLAGS   += $($(package)_cxxflags) $($(package)_cppflags)" >> qtbase/mkspecs/common/gcc-base.conf && \
  echo "!host_build: QMAKE_LFLAGS     += $($(package)_ldflags)" >> qtbase/mkspecs/common/gcc-base.conf && \
  sed -i.old "s|QMAKE_CC                = \$$$$\$$$${CROSS_COMPILE}clang|QMAKE_CC                = $($(package)_cc)|" qtbase/mkspecs/common/clang.conf && \
  sed -i.old "s|QMAKE_CXX               = \$$$$\$$$${CROSS_COMPILE}clang++|QMAKE_CXX               = $($(package)_cxx)|" qtbase/mkspecs/common/clang.conf
endef

define $(package)_config_cmds
  cd qtbase && \
  ./configure -top-level $($(package)_config_opts)
endef

define $(package)_build_cmds
  $(MAKE) -j$(JOBS)
endef

define $(package)_stage_cmds
  $(MAKE) INSTALL_ROOT=$($(package)_staging_dir) install && \
  $(MAKE) -C qttools/src/linguist INSTALL_ROOT=$($(package)_staging_dir) $(addsuffix -install_subtargets,$(addprefix sub-,$($(package)_linguist_tools))) && \
  $(MAKE) -C qttools/src/linguist INSTALL_ROOT=$($(package)_staging_dir) install_cmake_linguist_tools_files && \
  $(MAKE) -C qttranslations INSTALL_ROOT=$($(package)_staging_dir) install_subtargets
endef

define $(package)_postprocess_cmds
  rm -rf native/lib/ lib/lib*.la
endef
