# Copyright (c) 2024 The Bitcoin developers

project(iguana
	DESCRIPTION "Iguana is a Script debugger for eCash"
)

add_executable(iguana
	iguana.cpp
	iguana_formatter.cpp
	iguana_interpreter.cpp
)
generate_windows_version_info(iguana
	DESCRIPTION "eCash script debugger"
)
target_include_directories(iguana
	PUBLIC
		"${CMAKE_CURRENT_SOURCE_DIR}"
)
target_link_libraries(iguana bitcoinconsensus)

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

install_target(iguana)
install_manpages(iguana)

include(TestSuite)
add_test_custom_target(check-iguana
	TEST_COMMAND
		"${CMAKE_COMMAND}"
		-E env
			EMULATOR="${CMAKE_CROSSCOMPILING_EMULATOR}"
			IGUANA_BIN="$<TARGET_FILE:iguana>"
			CMAKE_PROJECT_VERSION="${CMAKE_PROJECT_VERSION}"
			PYTHONPATH="${CMAKE_SOURCE_DIR}/test/functional"
		"${Python_EXECUTABLE}"
		-m pytest
		-q
	CUSTOM_TARGET_ARGS
		COMMENT "Running iguana test suite..."
		WORKING_DIRECTORY
			"${CMAKE_CURRENT_SOURCE_DIR}"
		DEPENDS
			iguana
)

add_dependencies(check check-iguana)
