package=rocksdb
$(package)_version=5.18.3
$(package)_download_path=https://github.com/facebook/rocksdb/archive/
$(package)_file_name=v$($(package)_version).tar.gz
$(package)_sha256_hash=7fb6738263d3f2b360d7468cf2ebe333f3109f3ba1ff80115abd145d75287254

define $(package)_preprocess_cmds
endef

define $(package)_set_vars
endef

define $(package)_config_cmds
endef

define $(package)_build_cmds
  $(MAKE) shared_lib
endef

define $(package)_stage_cmds
  $(MAKE) DESTDIR=$($(package)_staging_dir) INSTALL_PATH=$(host_prefix) install
endef

define $(package)_postprocess_cmds
endef
