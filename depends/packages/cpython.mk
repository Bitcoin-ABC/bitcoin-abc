package=cpython
$(package)_version=$(native_$(package)_version)
$(package)_download_path=$(native_$(package)_download_path)
$(package)_file_name=$(native_$(package)_file_name)
$(package)_sha256_hash=$(native_$(package)_sha256_hash)
$(package)_dependencies=native_$(package) openssl
# Only build a subset of modules
$(package)_patches=Setup.local
$(package)_patches+=cpython_config.site
$(package)_patches+=0001-Fix-OpenSSL-pthread-linkage.patch

define $(package)_preprocess_cmds
  patch -p1 -i $($(package)_patch_dir)/0001-Fix-OpenSSL-pthread-linkage.patch
endef

define $(package)_set_vars
  $(package)_config_env+=CONFIG_SITE=$($(package)_patch_dir)/cpython_config.site
  $(package)_config_opts=--with-build-python=$(build_prefix)/bin/python3
  $(package)_config_opts+=--disable-test-modules --with-ensurepip=no --disable-ipv6
  $(package)_config_opts+=--with-system-libmpdec=no --with-openssl=$(host_prefix) --with-ssl-default-suites=openssl
endef

define $(package)_config_cmds
  $($(package)_autoconf)
endef

define $(package)_build_cmds
  cp -f $($(package)_patch_dir)/Setup.local Modules/Setup.local && \
  $(MAKE) -j$(JOBS)
endef

define $(package)_stage_cmds
  $(MAKE) DESTDIR=$($(package)_staging_dir) install && \
  mkdir -p $($(package)_staging_prefix_dir)/lib && \
  cp Modules/_hacl/libHacl_Hash_SHA2.a $($(package)_staging_prefix_dir)/lib/libHacl_Hash_SHA2.a
endef
