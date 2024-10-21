package=cpython
$(package)_version=3.12.7
$(package)_download_path=https://github.com/python/$(package)/archive/refs/tags/
$(package)_file_name=v$($(package)_version).tar.gz
$(package)_sha256_hash=0c4db8f00ab490bfb5a4b0d0e763319d017226b5521f97e851412342ff04d459

define $(package)_set_vars
  $(package)_config_opts=--disable-test-modules --with-ensurepip=no --without-static-libpython
endef

define $(package)_config_cmds
  $($(package)_autoconf)
endef

define $(package)_build_cmds
  $(MAKE) -j$(JOBS) python
endef

define $(package)_stage_cmds
  $(MAKE) DESTDIR=$($(package)_staging_dir) install
endef
