# Allow to easily build native executable.
# Useful for cross compilation.

# Check if we are in a native build or not.
set(__IS_NATIVE_BUILD 0 CACHE INTERNAL "Indicate if this is a native build")
if(__IS_NATIVE_BUILD AND CMAKE_CROSSCOMPILING)
	message(FATAL_ERROR "A native build cannot be cross compiled")
endif()

# If we are cross compiling, create a directory for native build.
set(NATIVE_BUILD_DIR "${CMAKE_BINARY_DIR}/native")
set(NATIVE_BINARY_DIR "${NATIVE_BUILD_DIR}/bin")
set(NATIVE_BUILD_TARGET "${NATIVE_BUILD_DIR}/CMakeCache.txt")

if(NOT __IS_NATIVE_BUILD AND NOT TARGET native-cmake-build)
	file(MAKE_DIRECTORY ${NATIVE_BUILD_DIR})
	add_custom_command(
		OUTPUT ${NATIVE_BUILD_TARGET}
		COMMAND ${CMAKE_COMMAND}
			-G "${CMAKE_GENERATOR}"
			"${CMAKE_SOURCE_DIR}"
			"-D__IS_NATIVE_BUILD=1"
			"-DCMAKE_MAKE_PROGRAM=${CMAKE_MAKE_PROGRAM}"
			"-DCMAKE_RUNTIME_OUTPUT_DIRECTORY:PATH=${NATIVE_BINARY_DIR}"
			# Don't require native third party dependencies we don't need.
			"-DBUILD_BITCOIN_WALLET=OFF"
			"-DBUILD_BITCOIN_QT=OFF"
			"-DBUILD_BITCOIN_ZMQ=OFF"
			"-DENABLE_QRCODE=OFF"
			"-DENABLE_UPNP=OFF"
		WORKING_DIRECTORY ${NATIVE_BUILD_DIR}
		VERBATIM USES_TERMINAL
	)

	add_custom_target(native-cmake-build DEPENDS ${NATIVE_BUILD_TARGET})
endif()

macro(add_native_executable NAME)
	if(NOT __IS_NATIVE_BUILD)
		set(NATIVE_BINARY "${NATIVE_BINARY_DIR}/${NAME}")
		add_custom_target("build-native-${NAME}"
			COMMAND ${CMAKE_COMMAND}
				--build "${NATIVE_BUILD_DIR}"
				--target "${NAME}"
			DEPENDS ${NATIVE_BUILD_TARGET}
			BYPRODUCTS ${NATIVE_BINARY}
			WORKING_DIRECTORY ${NATIVE_BUILD_DIR}
			VERBATIM USES_TERMINAL
		)

		add_executable(${NAME} IMPORTED)
		add_dependencies(${NAME} "build-native-${NAME}")
		set_property(TARGET ${NAME} PROPERTY IMPORTED_LOCATION ${NATIVE_BINARY})
	else()
		add_executable(${NAME} EXCLUDE_FROM_ALL ${ARGN})
	endif()
endmacro(add_native_executable)

function(native_target_include_directories)
	if(__IS_NATIVE_BUILD)
		target_include_directories(${ARGN})
	endif()
endfunction(native_target_include_directories)
