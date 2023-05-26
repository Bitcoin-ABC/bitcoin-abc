package=libxcb_util_wm
$(package)_version=0.4.1
$(package)_download_path=https://xcb.freedesktop.org/dist
$(package)_file_name=xcb-util-wm-$($(package)_version).tar.bz2
$(package)_sha256_hash=28bf8179640eaa89276d2b0f1ce4285103d136be6c98262b6151aaee1d3c2a3f
$(package)_dependencies=libxcb

define $(package)_set_vars
$(package)_config_opts=--disable-static --disable-devel-docs --without-doxygen
$(package)_config_opts += --disable-dependency-tracking --enable-option-checking
endef

define $(package)_preprocess_cmds
  cp -f $(BASEDIR)/config.guess $(BASEDIR)/config.sub .
endef

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
  rm -rf share/man share/doc lib/*.la
endef
