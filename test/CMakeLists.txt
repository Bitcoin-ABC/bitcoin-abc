###
# Create config.ini file for tests
###
set(abs_top_srcdir ${CMAKE_SOURCE_DIR})
set(abs_top_builddir ${CMAKE_BINARY_DIR})
if(CMAKE_SYSTEM_NAME MATCHES "Windows")
	set(EXEEXT ".exe")
endif()

if(NOT BUILD_BITCOIN_WALLET)
	set(ENABLE_WALLET_TRUE "#")
endif()

if(NOT BUILD_BITCOIN_TX OR NOT BUILD_BITCOIN_TX)
	set(BUILD_BITCOIN_UTILS_TRUE "#")
endif()
if(NOT BUILD_BITCOIN_ZMQ)
	set(ENABLE_ZMQ_TRUE "#")
endif()

# Create build ini file
configure_file(config.ini.in config.ini @ONLY)


###
# Setup symlinks for testing
### 
macro(make_link src dest)
  add_custom_command(
    OUTPUT "${dest}"
    COMMAND ${CMAKE_COMMAND} -E create_symlink "${src}" "${dest}"
    COMMENT "make_link ${src} -> ${dest}"
    MAIN_DEPENDENCY "${src}"
  )
endmacro()

file(MAKE_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/functional/)
file(MAKE_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/util/)

make_link(
	${CMAKE_CURRENT_SOURCE_DIR}/functional/test_runner.py
	${CMAKE_CURRENT_BINARY_DIR}/functional/test_runner.py
)
make_link(
	${CMAKE_CURRENT_SOURCE_DIR}/functional/create_cache.py
	${CMAKE_CURRENT_BINARY_DIR}/functional/create_cache.py
)
make_link(
	${CMAKE_CURRENT_SOURCE_DIR}/util/bitcoin-util-test.py
	${CMAKE_CURRENT_BINARY_DIR}/util/bitcoin-util-test.py
)

add_custom_target(check-functional
	COMMAND
		./functional/test_runner.py
	DEPENDS
		../src/bitcoind
		../src/bitcoin-cli
		${CMAKE_CURRENT_BINARY_DIR}/functional/test_runner.py
		${CMAKE_CURRENT_BINARY_DIR}/functional/create_cache.py
)

add_dependencies(check-all check-functional)

if(BUILD_BITCOIN_TX)
	add_custom_target(check-bitcoin-util
		COMMAND
			${CMAKE_COMMAND} -E echo "Running test/util/bitcoin-util-test.py..."
		COMMAND
			./util/bitcoin-util-test.py
		DEPENDS
			../src/bitcoin-tx
			${CMAKE_CURRENT_BINARY_DIR}/util/bitcoin-util-test.py
	)

	add_dependencies(check check-bitcoin-util)
endif()