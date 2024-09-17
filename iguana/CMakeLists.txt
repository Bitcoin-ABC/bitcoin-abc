# Copyright (c) 2024 The Bitcoin developers

project(iguana
	DESCRIPTION "Iguana is a Script debugger for eCash"
)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(iguana iguana.cpp)
generate_windows_version_info(iguana
	DESCRIPTION "CLI Bitcoin transaction editor utility"
)

target_link_libraries(iguana script)

add_to_symbols_check(iguana)
add_to_security_check(iguana)

install_target(iguana)

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
