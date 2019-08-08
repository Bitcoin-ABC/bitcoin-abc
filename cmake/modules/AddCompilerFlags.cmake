# Allow to easily add flags for C and C++
include(CheckCXXCompilerFlag)
include(CheckCCompilerFlag)
include(SanitizeHelper)

function(check_compiler_flag RESULT LANGUAGE FLAG)
	sanitize_c_cxx_definition("have_${LANGUAGE}_" ${FLAG} TEST_NAME)

	if("${LANGUAGE}" STREQUAL "C")
		CHECK_C_COMPILER_FLAG(${FLAG} ${TEST_NAME})
	elseif("${LANGUAGE}" STREQUAL "CXX")
		CHECK_CXX_COMPILER_FLAG(${FLAG} ${TEST_NAME})
	else()
		message(FATAL_ERROR "check_compiler_flag LANGUAGE should be C or CXX")
	endif()
	set(${RESULT} ${${TEST_NAME}} PARENT_SCOPE)
endfunction()

function(add_compiler_flags_to_var TARGET LANGUAGE)
	foreach(f ${ARGN})
		# If the flag is already set, avoid duplicating it
		string(FIND "${${TARGET}}" "${f}" FLAG_POSITION)
		if(${FLAG_POSITION} LESS 0)
			check_compiler_flag(FLAG_IS_SUPPORTED ${LANGUAGE} ${f})
			if(${FLAG_IS_SUPPORTED})
				string(APPEND ${TARGET} " ${f}")
			endif()
		endif()
	endforeach()
	set(${TARGET} ${${TARGET}} PARENT_SCOPE)
endfunction()

macro(add_c_compiler_flags)
	add_compiler_flags_to_var(CMAKE_C_FLAGS C ${ARGN})
endmacro()

macro(add_cxx_compiler_flags)
	add_compiler_flags_to_var(CMAKE_CXX_FLAGS CXX ${ARGN})
endmacro()

macro(add_compiler_flags)
	add_c_compiler_flags(${ARGN})
	add_cxx_compiler_flags(${ARGN})
endmacro()

macro(remove_compiler_flags_from_var TARGET)
	foreach(f ${ARGN})
		string(REGEX REPLACE "${f}( |$)" "" ${TARGET} "${${TARGET}}")
	endforeach()
endmacro()

function(remove_c_compiler_flags)
	remove_compiler_flags_from_var(CMAKE_C_FLAGS ${ARGN})
	if(NOT "${CMAKE_BUILD_TYPE}" STREQUAL "")
		string(TOUPPER "CMAKE_C_FLAGS_${CMAKE_BUILD_TYPE}" BUILD_TYPE_FLAGS)
		remove_compiler_flags_from_var(${BUILD_TYPE_FLAGS} ${ARGN})
	endif()
	set(${BUILD_TYPE_FLAGS} ${${BUILD_TYPE_FLAGS}} PARENT_SCOPE)
endfunction()

function(remove_cxx_compiler_flags)
	remove_compiler_flags_from_var(CMAKE_CXX_FLAGS ${ARGN})
	if(NOT "${CMAKE_BUILD_TYPE}" STREQUAL "")
		string(TOUPPER "CMAKE_CXX_FLAGS_${CMAKE_BUILD_TYPE}" BUILD_TYPE_FLAGS)
		remove_compiler_flags_from_var(${BUILD_TYPE_FLAGS} ${ARGN})
	endif()
	set(${BUILD_TYPE_FLAGS} ${${BUILD_TYPE_FLAGS}} PARENT_SCOPE)
endfunction()

macro(remove_compiler_flags)
	remove_c_compiler_flags(${ARGN})
	remove_cxx_compiler_flags(${ARGN})
endmacro()

function(add_cxx_compiler_flag_with_fallback TARGET_VAR FLAG FALLBACK)
	# Remove the fallback flag if it exists, so that the main flag will override
	# it if it was previously added.
	remove_cxx_compiler_flags(${FALLBACK})

	set(FLAG_CANDIDATE ${FLAG})
	check_compiler_flag(FLAG_IS_SUPPORTED CXX ${FLAG_CANDIDATE})
	if(NOT ${FLAG_IS_SUPPORTED})
		set(FLAG_CANDIDATE ${FALLBACK})
	endif()

	add_compiler_flags_to_var(${TARGET_VAR} CXX ${FLAG_CANDIDATE})
	set(${TARGET_VAR} ${${TARGET_VAR}} PARENT_SCOPE)
endfunction()

# Note that CMake does not provide any facility to check that a linker flag is
# supported by the compiler.
# However since CMake 3.2 introduced the CMP0056 policy, the
# CMAKE_EXE_LINKER_FLAGS variable is used by the try_compile function, so there
# is a workaround that allow for testing the linker flags.
function(add_linker_flags)
	foreach(f ${ARGN})
		sanitize_c_cxx_definition("have_linker_" ${f} FLAG_IS_SUPPORTED)

		# Some linkers (e.g.: Clang) will issue a -Wunused-command-line-argument
		# warning when an unknown linker flag is set.
		# Using -Werror will promote these warnings to errors so
		# CHECK_CXX_COMPILER_FLAG() will return false, preventing the flag from
		# being set.
		add_compiler_flags_to_var(
			CMAKE_REQUIRED_FLAGS
			CXX
			"-Werror=unused-command-line-argument"
		)

		# Save the current linker flags
		set(SAVE_CMAKE_EXE_LINKERFLAGS ${CMAKE_EXE_LINKER_FLAGS})

		# If the flag is already set, avoid duplicating it
		string(FIND "${CMAKE_EXE_LINKER_FLAGS}" "${f}" FLAG_POSITION)
		if(${FLAG_POSITION} LESS 0)
			string(APPEND CMAKE_EXE_LINKER_FLAGS " ${f}")
		endif()

		# CHECK_CXX_COMPILER_FLAG calls CHECK_CXX_SOURCE_COMPILES which in turn
		# calls try_compile, so it will check our flag
		CHECK_CXX_COMPILER_FLAG("" ${FLAG_IS_SUPPORTED})

		# Unset the -Werror=unused-command-line-argument flag if it is set.
		remove_compiler_flags_from_var(
			CMAKE_REQUIRED_FLAGS
			"-Werror=unused-command-line-argument"
		)

		# If the flag is not supported restore CMAKE_EXE_LINKER_FLAGS
		if(NOT ${FLAG_IS_SUPPORTED})
			set(CMAKE_EXE_LINKER_FLAGS ${SAVE_CMAKE_EXE_LINKERFLAGS})
		endif()
	endforeach()
	set(CMAKE_EXE_LINKER_FLAGS ${CMAKE_EXE_LINKER_FLAGS} PARENT_SCOPE)
endfunction()
