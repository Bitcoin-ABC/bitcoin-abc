# Allow to easily build native executable.
# Useful for cross compilation.

if(NOT DEFINED __IS_NATIVE_BUILD)
	# Check if we are in a native build or not.
	set(__IS_NATIVE_BUILD 0 CACHE INTERNAL "Indicate if this is a native build")
endif()

if(__IS_NATIVE_BUILD AND CMAKE_CROSSCOMPILING)
	message(FATAL_ERROR "A native build cannot be cross compiled")
endif()

# It is imperative that NATIVE_BUILD_DIR be in the cache.
set(NATIVE_BUILD_DIR "${CMAKE_BINARY_DIR}/native" CACHE PATH "The path of the native build directory")

function(add_native_executable NAME)
	if(__IS_NATIVE_BUILD)
		add_executable(${NAME} EXCLUDE_FROM_ALL ${ARGN})
		# Multi-configuration generators (VS, Xcode) append a per-configuration
		# subdirectory to the specified directory unless the 
		# `RUNTIME_OUTPUT_DIRECTORY` property is defined using a generator
		# expression.
		# Since we don't care about the build configuration for native
		# executables, we can simply drop this subdirectory.
		# Doing so ensure that the path to the binary can always be retrieved.
		set_target_properties(${NAME} PROPERTIES
			RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/$<0:>"
		)
	else()
		set(NATIVE_TARGET "${NAME}")
		file(RELATIVE_PATH RELATIVE_PATH "${CMAKE_BINARY_DIR}" "${CMAKE_CURRENT_BINARY_DIR}")
		if(RELATIVE_PATH)
			string(PREPEND NATIVE_TARGET "${RELATIVE_PATH}/")
		endif()
		set(NATIVE_BINARY "${NATIVE_BUILD_DIR}/${NATIVE_TARGET}")

		# We create a symlink because cmake craps itself if the imported
		# executable has the same name as the executable itself.
		# https://cmake.org/pipermail/cmake/2019-May/069480.html
		add_custom_command(
			OUTPUT "native-${NAME}"
			COMMENT "Building native ${NATIVE_TARGET}"
			COMMAND ${CMAKE_COMMAND} --build "${NATIVE_BUILD_DIR}" --target "${NAME}"
			COMMAND ${CMAKE_COMMAND} -E create_symlink "${NATIVE_BINARY}" "native-${NAME}"
			DEPENDS native-cmake-build ${ARGN}
			VERBATIM USES_TERMINAL
		)

		add_executable(${NAME} IMPORTED GLOBAL)
		set_target_properties(${NAME} PROPERTIES IMPORTED_LOCATION "${NATIVE_BINARY}")

		# This obviously cannot depend on a file for some mysterious reasons only
		# the cmake gods are aware of, so we need a phony custom target.
		add_custom_target("build-native-${NAME}" DEPENDS "native-${NAME}")
		add_dependencies(${NAME} "build-native-${NAME}")
	endif()
endfunction(add_native_executable)

function(native_target_include_directories)
	if(__IS_NATIVE_BUILD)
		target_include_directories(${ARGN})
	endif()
endfunction(native_target_include_directories)

function(native_add_cmake_flags)
	set_property(GLOBAL APPEND PROPERTY _NATIVE_BUILD_CMAKE_FLAGS ${ARGN})
endfunction(native_add_cmake_flags)

# Internal machinery
function(_gen_native_cmake_target)
	message(STATUS "Configuring native build in ${NATIVE_BUILD_DIR}")

	get_property(ARGSLIST GLOBAL PROPERTY _NATIVE_BUILD_CMAKE_FLAGS)

	list(SORT ARGSLIST)
	list(REMOVE_DUPLICATES ARGSLIST)
	list(JOIN ARGSLIST " " ARGS)

	file(MAKE_DIRECTORY "${CMAKE_BINARY_DIR}/config")
	configure_file(
		"${CMAKE_SOURCE_DIR}/cmake/templates/NativeCmakeRunner.cmake.in"
		"${CMAKE_BINARY_DIR}/config/run_native_cmake.sh"
	)
endfunction(_gen_native_cmake_target)

function(_gen_native_cmake_hook VAR ACCESS)
	# When CMAKE_CURRENT_LIST_DIR is set to empty, we execute everything.
	if("${VAR}" STREQUAL "CMAKE_CURRENT_LIST_DIR" AND
	   "${CMAKE_CURRENT_LIST_DIR}" STREQUAL "" AND
	   "${ACCESS}" STREQUAL "MODIFIED_ACCESS")
		_gen_native_cmake_target()
	endif()
endfunction(_gen_native_cmake_hook)

if(NOT __IS_NATIVE_BUILD AND NOT TARGET native-cmake-build)
	# Set a hook to execute when everything is set.
	variable_watch(CMAKE_CURRENT_LIST_DIR _gen_native_cmake_hook)

	add_custom_command(
		OUTPUT "${NATIVE_BUILD_DIR}/CMakeCache.txt"
		COMMAND "${CMAKE_BINARY_DIR}/config/run_native_cmake.sh"
		DEPENDS "${CMAKE_BINARY_DIR}/config/run_native_cmake.sh"
		WORKING_DIRECTORY "${CMAKE_BINARY_DIR}"
		VERBATIM USES_TERMINAL
	)

	add_custom_target(native-cmake-build DEPENDS "${NATIVE_BUILD_DIR}/CMakeCache.txt")
endif()
