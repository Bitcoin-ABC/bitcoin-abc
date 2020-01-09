package=native_libdmg-hfsplus
$(package)_version=0.1
$(package)_download_path=https://github.com/theuni/libdmg-hfsplus/archive
$(package)_file_name=libdmg-hfsplus-v$($(package)_version).tar.gz
$(package)_sha256_hash=6569a02eb31c2827080d7d59001869ea14484c281efab0ae7f2b86af5c3120b3
$(package)_build_subdir=build

define $(package)_preprocess_cmds
  mkdir build
endef

define $(package)_config_cmds
  cmake -GNinja -DCMAKE_INSTALL_PREFIX:PATH=$(build_prefix)/bin ..
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
