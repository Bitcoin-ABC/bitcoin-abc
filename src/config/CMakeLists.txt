# Copyright (c) 2017 The Bitcoin developers

# This generates config.h which provides numerous defines
# about the state of the plateform we are building on.

include(CheckIncludeFiles)
include(CheckSymbolExists)

# Version
set(CLIENT_VERSION_MAJOR 0)
set(CLIENT_VERSION_MINOR 16)
set(CLIENT_VERSION_REVISION 2)
set(CLIENT_VERSION_BUILD 0)

option(CLIENT_VERSION_IS_RELEASE "Build a release version" OFF)

# Copyright
set(COPYRIGHT_YEAR 2017)
set(COPYRIGHT_HOLDERS "The %s developers")
set(COPYRIGHT_HOLDERS_SUBSTITUTION Bitcoin)

# Endianness
check_include_files("endian.h" HAVE_ENDIAN_H)
check_include_files("sys/endian.h" HAVE_SYS_ENDIAN_H)

if(HAVE_ENDIAN_H)
	set(ENDIAN_FILE "endian.h")
elseif(HAVE_SYS_ENDIAN_H)
	set(ENDIAN_FILE "sys/endian.h")
else()
endif()

if(ENDIAN_FILE)
	check_symbol_exists(htole16 ${ENDIAN_FILE} HAVE_DECL_HTOLE16)
	check_symbol_exists(htobe16 ${ENDIAN_FILE} HAVE_DECL_HTOBE16)
	check_symbol_exists(be16toh ${ENDIAN_FILE} HAVE_DECL_BE16TOH)
	check_symbol_exists(le16toh ${ENDIAN_FILE} HAVE_DECL_LE16TOH)
	check_symbol_exists(htobe32 ${ENDIAN_FILE} HAVE_DECL_HTOBE32)
	check_symbol_exists(htole32 ${ENDIAN_FILE} HAVE_DECL_HTOLE32)
	check_symbol_exists(be32toh ${ENDIAN_FILE} HAVE_DECL_BE32TOH)
	check_symbol_exists(le32toh ${ENDIAN_FILE} HAVE_DECL_LE32TOH)
	check_symbol_exists(htobe64 ${ENDIAN_FILE} HAVE_DECL_HTOBE64)
	check_symbol_exists(htole64 ${ENDIAN_FILE} HAVE_DECL_HTOLE64)
	check_symbol_exists(be64toh ${ENDIAN_FILE} HAVE_DECL_BE64TOH)
	check_symbol_exists(le64toh ${ENDIAN_FILE} HAVE_DECL_LE64TOH)
endif()

# Byte swap
check_include_files("byteswap.h" HAVE_BYTESWAP_H)

check_symbol_exists(bswap_16 "byteswap.h" HAVE_DECL_BSWAP_16)
check_symbol_exists(bswap_32 "byteswap.h" HAVE_DECL_BSWAP_32)
check_symbol_exists(bswap_64 "byteswap.h" HAVE_DECL_BSWAP_64)

# Bitmanip intrinsics
check_symbol_exists(__builtin_clz "" HAVE_DECL___BUILTIN_CLZ)
check_symbol_exists(__builtin_clzl "" HAVE_DECL___BUILTIN_CLZL)
check_symbol_exists(__builtin_clzll "" HAVE_DECL___BUILTIN_CLZLL)

# Various system libraries
check_symbol_exists(strnlen "string.h" HAVE_DECL_STRNLEN)

# Generate the config
configure_file(bitcoin-config.h.cmake.in bitcoin-config.h ESCAPE_QUOTES)
