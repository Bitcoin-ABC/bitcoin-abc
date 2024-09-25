# Copyright (c) 2024 The Bitcoin developers

project(iguana
	DESCRIPTION "Iguana is a Script debugger for eCash"
)

add_executable(iguana iguana.cpp)
generate_windows_version_info(iguana
	DESCRIPTION "eCash script debugger"
)

target_link_libraries(iguana script)

# This is a workaround for an annoying cmake behavior.
# CMake always generate an import library even for executables (this could be
# useful for some rare cases) via an --out-implib linker flag. This causes the
# linker to crash if there is no exported symbol, e.g. when the executable is
# simple like iguana is at the moment.
# We need to force exporting symbols that are not needed in order to prevent the
# linker from crashing.
if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	target_link_options(iguana PRIVATE "-Wl,--export-all-symbols")
endif()

add_to_symbols_check(iguana)
add_to_security_check(iguana)

install_target(iguana EXCLUDE_FROM_ALL)

find_package(Python COMPONENTS Interpreter)
add_custom_target(check-iguana
COMMAND
	"${CMAKE_COMMAND}"
	-E env
		IGUANA_BIN="${CMAKE_CURRENT_BINARY_DIR}/iguana"
		CMAKE_PROJECT_VERSION="${CMAKE_PROJECT_VERSION}"
	"${Python_EXECUTABLE}"
	-m pytest
	-v
WORKING_DIRECTORY
	"${CMAKE_CURRENT_SOURCE_DIR}"
DEPENDS
	iguana
)
