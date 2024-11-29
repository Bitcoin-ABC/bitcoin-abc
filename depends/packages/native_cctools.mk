package=native_cctools
$(package)_version=c74fafe86076713cb8e6f937af43b6df6da1f42d
$(package)_download_path=https://github.com/tpoechtrager/cctools-port/archive
$(package)_file_name=$($(package)_version).tar.gz
$(package)_sha256_hash=e2c1588d505a69c32e079f4e616e0f117d5478429040e394f624f43f2796e6bc
$(package)_build_subdir=cctools
$(package)_dependencies=native_libtapi
$(package)_patches=no_fixup_chains.patch

define $(package)_set_vars
  $(package)_config_opts=--target=$(host) --enable-lto-support
  $(package)_config_opts+=--with-llvm-config=$(llvm_config_prog)
  $(package)_ldflags+=-Wl,-rpath=\\$$$$$$$$\$$$$$$$$ORIGIN/../lib
  $(package)_cc=$(clang_prog)
  $(package)_cxx=$(clangxx_prog)
endef

ifneq ($(strip $(FORCE_USE_SYSTEM_CLANG)),)
define $(package)_preprocess_cmds
  mkdir -p $($(package)_staging_prefix_dir)/lib && \
  cp $(llvm_lib_dir)/libLTO.so $($(package)_staging_prefix_dir)/lib/
  cp -f $(BASEDIR)/config.guess $(BASEDIR)/config.sub cctools && \
  patch -p1 < $($(package)_patch_dir)/no_fixup_chains.patch
endef
else
define $(package)_preprocess_cmds
  cp -f $(BASEDIR)/config.guess $(BASEDIR)/config.sub cctools && \
  patch -p1 < $($(package)_patch_dir)/no_fixup_chains.patch
endif

define $(package)_config_cmds
  $($(package)_autoconf)
endef

define $(package)_build_cmds
  $(MAKE) -j$(JOBS)
endef

define $(package)_stage_cmds
  $(MAKE) DESTDIR=$($(package)_staging_dir) install
endef

define $(package)_postprocess_cmds
  rm -rf share
endef
