# Allow to easily add flags for C and C++
include(CheckCXXCompilerFlag)
include(CheckCCompilerFlag)
include(SanitizeHelper)

function(check_compiler_flags RESULT LANGUAGE)
	sanitize_c_cxx_definition("have_${LANGUAGE}_" "${ARGN}" TEST_NAME)

	if("${LANGUAGE}" STREQUAL "C")
		CHECK_C_COMPILER_FLAG("${ARGN}" ${TEST_NAME})
	elseif("${LANGUAGE}" STREQUAL "CXX")
		CHECK_CXX_COMPILER_FLAG("${ARGN}" ${TEST_NAME})
	else()
		message(FATAL_ERROR "check_compiler_flags LANGUAGE should be C or CXX")
	endif()
	set(${RESULT} ${${TEST_NAME}} PARENT_SCOPE)
endfunction()

function(add_compiler_flags_for_language LANGUAGE)
	foreach(f ${ARGN})
		check_compiler_flags(FLAG_IS_SUPPORTED ${LANGUAGE} ${f})
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

function(add_compiler_flag_group_for_language LANGUAGE)
	check_compiler_flags(FLAG_GROUP_IS_SUPPORTED ${LANGUAGE} ${ARGN})
	if(${FLAG_GROUP_IS_SUPPORTED})
		add_compile_options("$<$<COMPILE_LANGUAGE:${LANGUAGE}>:${ARGN}>")
	endif()
endfunction()

macro(add_c_compiler_flag_group)
	add_compiler_flag_group_for_language(C ${ARGN})
endmacro()

macro(add_cxx_compiler_flag_group)
	add_compiler_flag_group_for_language(CXX ${ARGN})
endmacro()

macro(add_compiler_flag_group)
	add_c_compiler_flag_group(${ARGN})
	add_cxx_compiler_flag_group(${ARGN})
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
		check_compiler_flags(FLAG_IS_SUPPORTED ${LANGUAGE} ${f})
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
	sanitize_c_cxx_definition("have_linker_" ${FLAG} FLAG_IS_SUPPORTED)

	# Some linkers (e.g.: Clang) will issue a -Wunused-command-line-argument
	# warning when an unknown linker flag is set.
	# Using -Werror will promote these warnings to errors so
	# CHECK_CXX_COMPILER_FLAG() will return false, preventing the flag from
	# being set.
	set(WERROR_UNUSED_ARG -Werror=unused-command-line-argument)
	check_compiler_flags(IS_WERROR_SUPPORTED CXX ${WERROR_UNUSED_ARG})
	if(${IS_WERROR_SUPPORTED})
		set(CMAKE_REQUIRED_FLAGS ${WERROR_UNUSED_ARG})
	endif()

	# Save the current linker flags
	set(SAVE_CMAKE_EXE_LINKER_FLAGS ${CMAKE_EXE_LINKER_FLAGS})

	# Append the flag under test to the linker flags
	string(APPEND CMAKE_EXE_LINKER_FLAGS " ${FLAG}")

	# CHECK_CXX_COMPILER_FLAG calls CHECK_CXX_SOURCE_COMPILES which in turn
	# calls try_compile, so it will check our flag
	CHECK_CXX_COMPILER_FLAG("" ${FLAG_IS_SUPPORTED})

	# Restore CMAKE_EXE_LINKER_FLAGS
	set(CMAKE_EXE_LINKER_FLAGS ${SAVE_CMAKE_EXE_LINKER_FLAGS})

	set(${RESULT} ${${FLAG_IS_SUPPORTED}} PARENT_SCOPE)
endfunction()

function(add_linker_flags)
	foreach(f ${ARGN})
		check_linker_flag(FLAG_IS_SUPPORTED ${f})

		if(${FLAG_IS_SUPPORTED})
			add_link_options(${f})
		endif()
	endforeach()
endfunction()

macro(remove_optimization_level_from_var VAR)
	string(REGEX REPLACE "-O[0-3gs]( |$)" "" ${VAR} "${${VAR}}")
endmacro()

function(set_optimization_level_for_language LANGUAGE LEVEL)
	if(NOT "${CMAKE_BUILD_TYPE}" STREQUAL "")
		string(TOUPPER "CMAKE_${LANGUAGE}_FLAGS_${CMAKE_BUILD_TYPE}" BUILD_TYPE_FLAGS)
		remove_optimization_level_from_var(${BUILD_TYPE_FLAGS})
		set(${BUILD_TYPE_FLAGS} "${${BUILD_TYPE_FLAGS}}" PARENT_SCOPE)
	endif()

	remove_optimization_level_from_var(CMAKE_${LANGUAGE}_FLAGS)
	set(CMAKE_${LANGUAGE}_FLAGS "${CMAKE_${LANGUAGE}_FLAGS} -O${LEVEL}" PARENT_SCOPE)
endfunction()

macro(set_c_optimization_level LEVEL)
	set_optimization_level_for_language(C ${LEVEL})
endmacro()

macro(set_cxx_optimization_level LEVEL)
	set_optimization_level_for_language(CXX ${LEVEL})
endmacro()
