# Facilities to run tests on the executable binaries.

macro(add_to_symbols_check BINARY)
	set(CUSTOM_TARGET_NAME "check-symbols-${BINARY}")
	add_custom_target("${CUSTOM_TARGET_NAME}"
		COMMAND
			${CMAKE_COMMAND} -E echo "Running symbol-check.py on ${BINARY}..."
		COMMAND
			"${PYTHON_EXECUTABLE}"
			"${CMAKE_SOURCE_DIR}/contrib/devtools/symbol-check.py"
			"$<TARGET_FILE:${BINARY}>"
		DEPENDS
			"${BINARY}"
	)

	if(TARGET check-symbols)
		add_dependencies(check-symbols "${CUSTOM_TARGET_NAME}")
	endif()
endmacro()

macro(add_to_security_check BINARY)
	set(CUSTOM_TARGET_NAME "check-security-${BINARY}")
	add_custom_target("${CUSTOM_TARGET_NAME}"
		COMMAND
			${CMAKE_COMMAND} -E echo "Running security-check.py on ${BINARY}..."
		COMMAND
			"${PYTHON_EXECUTABLE}"
			"${CMAKE_SOURCE_DIR}/contrib/devtools/security-check.py"
			"$<TARGET_FILE:${BINARY}>"
		DEPENDS
			"${BINARY}"
	)

	if(TARGET check-security)
		add_dependencies(check-security "${CUSTOM_TARGET_NAME}")
	endif()
endmacro()
