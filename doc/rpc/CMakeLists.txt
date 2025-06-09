# Copyright (c) 2020 The Bitcoin developers

if(BUILD_CLI)
	add_custom_target(doc-rpc
		COMMENT "Generating RPC documentation"
		COMMAND
			"${CMAKE_CURRENT_SOURCE_DIR}/gen-rpc-docs.sh"
			"${CMAKE_CURRENT_SOURCE_DIR}/generate.go"
			"$<TARGET_FILE:bitcoind>"
			"$<TARGET_FILE:bitcoin-cli>"
		WORKING_DIRECTORY "${CMAKE_BINARY_DIR}"
		DEPENDS
			bitcoind
			bitcoin-cli
	)
endif()

# Add the doc/rpc directory to the list of file to cleanup.
set_property(DIRECTORY "${CMAKE_SOURCE_DIR}" APPEND PROPERTY ADDITIONAL_CLEAN_FILES "${CMAKE_BINARY_DIR}/doc/rpc")
