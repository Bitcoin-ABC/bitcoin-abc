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

function(add_compiler_flags_for_language LANGUAGE)
	foreach(f ${ARGN})
		check_compiler_flag(FLAG_IS_SUPPORTED ${LANGUAGE} ${f})
		if(${FLAG_IS_SUPPORTED})
			add_compile_options($<$<COMPILE_LANGUAGE:${LANGUAGE}>:${f}>)
		endif()
	endforeach()
endfunction()

macro(add_c_compiler_flags)
	add_compiler_flags_for_language(C ${ARGN})
endmacro()

macro(add_cxx_compiler_flags)
	add_compiler_flags_for_language(CXX ${ARGN})
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
	set(CMAKE_C_FLAGS ${CMAKE_C_FLAGS} PARENT_SCOPE)
	if(NOT "${CMAKE_BUILD_TYPE}" STREQUAL "")
		string(TOUPPER "CMAKE_C_FLAGS_${CMAKE_BUILD_TYPE}" BUILD_TYPE_FLAGS)
		remove_compiler_flags_from_var(${BUILD_TYPE_FLAGS} ${ARGN})
		set(${BUILD_TYPE_FLAGS} ${${BUILD_TYPE_FLAGS}} PARENT_SCOPE)
	endif()
endfunction()

function(remove_cxx_compiler_flags)
	remove_compiler_flags_from_var(CMAKE_CXX_FLAGS ${ARGN})
	set(CMAKE_CXX_FLAGS ${CMAKE_CXX_FLAGS} PARENT_SCOPE)
	if(NOT "${CMAKE_BUILD_TYPE}" STREQUAL "")
		string(TOUPPER "CMAKE_CXX_FLAGS_${CMAKE_BUILD_TYPE}" BUILD_TYPE_FLAGS)
		remove_compiler_flags_from_var(${BUILD_TYPE_FLAGS} ${ARGN})
		set(${BUILD_TYPE_FLAGS} ${${BUILD_TYPE_FLAGS}} PARENT_SCOPE)
	endif()
endfunction()

macro(remove_compiler_flags)
	remove_c_compiler_flags(${ARGN})
	remove_cxx_compiler_flags(${ARGN})
endmacro()

function(add_compile_options_to_configuration_for_language CONFIGURATION LANGUAGE)
	foreach(f ${ARGN})
		check_compiler_flag(FLAG_IS_SUPPORTED ${LANGUAGE} ${f})
		if(${FLAG_IS_SUPPORTED})
			add_compile_options($<$<AND:$<CONFIG:${CONFIGURATION}>,$<COMPILE_LANGUAGE:${LANGUAGE}>>:${f}>)
		endif()
	endforeach()
endfunction()

macro(add_c_compile_options_to_configuration CONFIGURATION)
	add_compile_options_to_configuration_for_language(${CONFIGURATION} C ${ARGN})
endmacro()

macro(add_cxx_compile_options_to_configuration CONFIGURATION)
	add_compile_options_to_configuration_for_language(${CONFIGURATION} CXX ${ARGN})
endmacro()

macro(add_compile_options_to_configuration CONFIGURATION)
	add_c_compile_options_to_configuration(${CONFIGURATION} ${ARGN})
	add_cxx_compile_options_to_configuration(${CONFIGURATION} ${ARGN})
endmacro()

function(add_compile_definitions_to_configuration CONFIGURATION)
	foreach(f ${ARGN})
		add_compile_definitions($<$<CONFIG:${CONFIGURATION}>:${f}>)
	endforeach()
endfunction()

# Note that CMake does not provide any facility to check that a linker flag is
# supported by the compiler.
# However since CMake 3.2 introduced the CMP0056 policy, the
# CMAKE_EXE_LINKER_FLAGS variable is used by the try_compile function, so there
# is a workaround that allow for testing the linker flags.
function(check_linker_flag RESULT FLAG)
	# Some linkers (e.g.: Clang) will issue a -Wunused-command-line-argument
	# warning when an unknown linker flag is set.
	# Using -Werror will promote these warnings to errors so
	# CHECK_CXX_COMPILER_FLAG() will return false, preventing the flag from
	# being set.
	set(WERROR_UNUSED_ARG -Werror=unused-command-line-argument)
	check_compiler_flag(IS_WERROR_SUPPORTED CXX ${WERROR_UNUSED_ARG})
	if(${IS_WERROR_SUPPORTED})
		set(CMAKE_REQUIRED_FLAGS ${WERROR_UNUSED_ARG})
	endif()

	# Save the current linker flags
	set(SAVE_CMAKE_EXE_LINKER_FLAGS ${CMAKE_EXE_LINKER_FLAGS})

	# Append the flag under test to the linker flags
	string(APPEND CMAKE_EXE_LINKER_FLAGS " ${FLAG}")

	# CHECK_CXX_COMPILER_FLAG calls CHECK_CXX_SOURCE_COMPILES which in turn
	# calls try_compile, so it will check our flag
	CHECK_CXX_COMPILER_FLAG("" ${RESULT})

	# Restore CMAKE_EXE_LINKER_FLAGS
	set(CMAKE_EXE_LINKER_FLAGS ${SAVE_CMAKE_EXE_LINKER_FLAGS})

	set(${RESULT} ${${RESULT}} PARENT_SCOPE)
endfunction()

function(add_linker_flags)
	foreach(f ${ARGN})
		sanitize_c_cxx_definition("have_linker_" ${f} FLAG_IS_SUPPORTED)

		check_linker_flag(${FLAG_IS_SUPPORTED} ${f})

		if(${FLAG_IS_SUPPORTED})
			add_link_options(${f})
		endif()
	endforeach()
endfunction()
