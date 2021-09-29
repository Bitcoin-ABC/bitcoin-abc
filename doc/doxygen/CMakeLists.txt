# Copyright (c) 2020 The Bitcoin developers

configure_file(
	Doxyfile.cmake.in
	Doxyfile
	ESCAPE_QUOTES
)

add_custom_target(doc-doxygen
	COMMENT "Generating API documentation"
	COMMAND
		"${CMAKE_SOURCE_DIR}/cmake/utils/log-and-print-on-failure.sh"
		"${CMAKE_CURRENT_BINARY_DIR}/gen-doxygen.log"
		"${CMAKE_CURRENT_SOURCE_DIR}/gen-doxygen.sh" Doxyfile
	DEPENDS "${CMAKE_CURRENT_BINARY_DIR}/Doxyfile"
)
