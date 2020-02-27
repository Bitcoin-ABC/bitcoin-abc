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
include(SanitizeHelper)
function(make_link file)
	set(src "${CMAKE_CURRENT_SOURCE_DIR}/${file}")
	set(dest "${CMAKE_CURRENT_BINARY_DIR}/${file}")
	add_custom_command(
		OUTPUT "${dest}"
		COMMAND ${CMAKE_COMMAND} -E create_symlink "${src}" "${dest}"
		COMMENT "link ${file}"
		MAIN_DEPENDENCY "${src}"
	)
	# Add a phony target to make sure the files are linked by default.
	sanitize_target_name("link-" "${file}" NAME)
	add_custom_target(${NAME} ALL DEPENDS "${dest}")
endfunction()

file(MAKE_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/functional/)
file(MAKE_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/util/)

make_link(functional/test_runner.py)
make_link(util/bitcoin-util-test.py)
make_link(util/rpcauth-test.py)

macro(add_functional_test_check TARGET COMMENT)
	add_custom_target(${TARGET}
		COMMENT "${COMMENT}"
		COMMAND
			"${Python_EXECUTABLE}"
			./functional/test_runner.py
			${ARGN}
		DEPENDS
			bitcoind
			bitcoin-cli
			${CMAKE_CURRENT_BINARY_DIR}/functional/test_runner.py
		USES_TERMINAL
		VERBATIM
	)
endmacro()

add_functional_test_check(check-functional
	"Run the functional tests"
)
add_dependencies(check-all check-functional)

add_functional_test_check(check-functional-extended
	"Run the extended functional tests"
	--extended
)
add_dependencies(check-extended check-functional-extended)

set(TEST_SUITE_NAME_UPGRADE_ACTIVATED "Bitcoin ABC functional tests with the next upgrade activated")

add_functional_test_check(check-functional-upgrade-activated
	"Run the functional tests with the upgrade activated"
	--with-phononactivation
	-n "${TEST_SUITE_NAME_UPGRADE_ACTIVATED}"
)
add_dependencies(check-upgrade-activated check-functional-upgrade-activated)

add_functional_test_check(check-functional-upgrade-activated-extended
	"Run the extended functional tests with the upgrade activated"
	--extended
	--with-phononactivation
	-n "${TEST_SUITE_NAME_UPGRADE_ACTIVATED}"
)
add_dependencies(check-upgrade-activated-extended check-functional-upgrade-activated-extended)

if(BUILD_BITCOIN_TX)
	add_custom_target(check-bitcoin-util
		COMMENT "Test Bitcoin utilities..."
		COMMAND
			"${Python_EXECUTABLE}"
			./util/bitcoin-util-test.py
		DEPENDS
			bitcoin-tx
			${CMAKE_CURRENT_BINARY_DIR}/util/bitcoin-util-test.py
	)

	add_dependencies(check check-bitcoin-util)
endif()

add_custom_target(check-rpcauth
	COMMENT "Test Bitcoin RPC authentication..."
	COMMAND
		"${Python_EXECUTABLE}"
		./util/rpcauth-test.py
	DEPENDS
		${CMAKE_CURRENT_BINARY_DIR}/util/rpcauth-test.py
)

add_dependencies(check check-rpcauth)

include(PackageHelper)
exclude_from_source_package(
	# Subdirectories
	"cache/"
	"lint/"
	"sanitizer_suppressions/"
)
