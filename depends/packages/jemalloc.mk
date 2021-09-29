package=jemalloc
$(package)_version=5.2.1
$(package)_download_path=https://github.com/jemalloc/jemalloc/releases/download/$($(package)_version)
$(package)_file_name=jemalloc-$($(package)_version).tar.bz2
$(package)_sha256_hash=34330e5ce276099e2e8950d9335db5a875689a4c6a56751ef3b1d8c537f887f6

define $(package)_set_vars
$(package)_config_opts=--disable-libdl --disable-shared --enable-cxx --enable-option-checking
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
