package=fontconfig
$(package)_version=2.12.6
$(package)_download_path=https://www.freedesktop.org/software/fontconfig/release/
$(package)_file_name=$(package)-$($(package)_version).tar.gz
$(package)_sha256_hash=064b9ebf060c9e77011733ac9dc0e2ce92870b574cca2405e11f5353a683c334
$(package)_dependencies=freetype expat

define $(package)_set_vars
  $(package)_config_opts=--disable-docs --disable-static --disable-libxml2 --disable-iconv
  $(package)_config_opts += --disable-dependency-tracking --enable-option-checking
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
  rm -rf bin etc share var lib/*.la
endef
