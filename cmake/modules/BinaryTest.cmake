# Facilities to run tests on the executable binaries.

macro(add_to_symbols_check BINARY)
	if(NOT TARGET symbol-check)
		add_custom_target(symbol-check)
	endif()

	set(CUSTOM_TARGET_NAME "symbol-check-${BINARY}")
	add_custom_target("${CUSTOM_TARGET_NAME}"
		COMMENT "Running symbol-check.py on ${BINARY}..."
		COMMAND
			"${Python_EXECUTABLE}"
			"${CMAKE_SOURCE_DIR}/contrib/devtools/symbol-check.py"
			"$<TARGET_FILE:${BINARY}>"
		DEPENDS
			"${BINARY}"
	)

	add_dependencies(symbol-check "${CUSTOM_TARGET_NAME}")
endmacro()

macro(add_to_security_check BINARY)
	if(NOT TARGET security-check)
		add_custom_target(security-check)
	endif()

	set(CUSTOM_TARGET_NAME "security-check-${BINARY}")
	add_custom_target("${CUSTOM_TARGET_NAME}"
		COMMENT "Running security-check.py on ${BINARY}..."
		COMMAND
			"${Python_EXECUTABLE}"
			"${CMAKE_SOURCE_DIR}/contrib/devtools/security-check.py"
			"$<TARGET_FILE:${BINARY}>"
		DEPENDS
			"${BINARY}"
	)

	add_dependencies(security-check "${CUSTOM_TARGET_NAME}")
endmacro()
