package=native_libdmg-hfsplus
$(package)_version=7ac55ec64c96f7800d9818ce64c79670e7f02b67
$(package)_download_path=https://github.com/planetbeing/libdmg-hfsplus/archive
$(package)_file_name=$($(package)_version).tar.gz
$(package)_sha256_hash=56fbdc48ec110966342f0ecddd6f8f89202f4143ed2a3336e42bbf88f940850c
$(package)_build_subdir=build
$(package)_patches=remove-libcrypto-dependency.patch

define $(package)_preprocess_cmds
  patch -p1 < $($(package)_patch_dir)/remove-libcrypto-dependency.patch && \
  mkdir build
endef

define $(package)_config_cmds
  cmake -GNinja -DCMAKE_INSTALL_PREFIX:PATH=$(build_prefix) -DCMAKE_C_FLAGS="-Wl,--build-id=none" ..
endef

define $(package)_build_cmds
  ninja -j$(JOBS) dmg
endef

# Older versions of cmake do not generate install target properly, but we
# need to support them because that's what is in xenial and we use xenial
# for reproducible builds. So we just fallback on installing everything.
define $(package)_stage_cmds
  DESTDIR=$($(package)_staging_dir) ninja dmg/install || \
      DESTDIR=$($(package)_staging_dir) ninja install
endef
