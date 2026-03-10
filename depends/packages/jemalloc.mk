package=jemalloc
$(package)_version=5.3.0
$(package)_download_path=https://github.com/jemalloc/jemalloc/archive/refs/tags/
$(package)_file_name=$($(package)_version).tar.gz
$(package)_sha256_hash=ef6f74fd45e95ee4ef7f9e19ebe5b075ca6b7fbe0140612b2a161abafb7ee179

define $(package)_set_vars
$(package)_config_opts=--disable-libdl --disable-shared --enable-cxx --enable-option-checking
endef

# We build from a github generated archive (tar.gz) so we need to manually specify the version.
# The exact version can be found in the VERSION file in the official release archive (.tar.bz2).
# The exact commit hash does not really matter, we just need to satisfy the minimum version
# required in src/CMakeLists.txt.
define $(package)_config_cmds
  ./autogen.sh && \
  $($(package)_autoconf) --with-version=$($(package)_version)-0-g54eaed1d8b56b1aa528be3bdd1877e59c56fa90c
endef

define $(package)_build_cmds
  $(MAKE) -j$(JOBS)
endef

define $(package)_stage_cmds
  $(MAKE) DESTDIR=$($(package)_staging_dir) install
endef
