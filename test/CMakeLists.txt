###
# Create config.ini file for tests
###
if("fuzzer" IN_LIST ENABLE_SANITIZERS)
	set(ENABLE_FUZZ ON)
else()
	set(ENABLE_FUZZ OFF)
endif()

# Create build ini file
configure_file(config.ini.cmake.in config.ini)

###
# Setup symlinks for testing
###
include(SanitizeHelper)
function(make_link file)
	set(src "${CMAKE_CURRENT_SOURCE_DIR}/${file}")
	set(dest "${CMAKE_CURRENT_BINARY_DIR}/${file}")

	# Create the target directory and parents if needed.
	get_filename_component(dest_dir "${dest}" DIRECTORY)
	file(MAKE_DIRECTORY "${dest_dir}")

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

make_link(functional/test_runner.py)
make_link(util/bitcoin-util-test.py)
make_link(util/rpcauth-test.py)
make_link(fuzz/test_runner.py)

include(Coverage)
include(TestSuite)
macro(add_functional_test_check TARGET COMMENT)
	add_test_custom_target(${TARGET}
		TEST_COMMAND
			"${Python_EXECUTABLE}"
			./functional/test_runner.py
			${ARGN}
		CUSTOM_TARGET_ARGS
			COMMENT "${COMMENT}"
			DEPENDS
				bitcoind
				bitcoin-cli
				${CMAKE_CURRENT_BINARY_DIR}/functional/test_runner.py
			USES_TERMINAL
			VERBATIM
	)

	add_custom_target_coverage(${TARGET})
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
	add_test_custom_target(check-bitcoin-util
		TEST_COMMAND
			"${Python_EXECUTABLE}"
			./util/bitcoin-util-test.py
		CUSTOM_TARGET_ARGS
			COMMENT "Test Bitcoin utilities..."
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


set_property(DIRECTORY "${CMAKE_SOURCE_DIR}" APPEND PROPERTY ADDITIONAL_CLEAN_FILES "${CMAKE_CURRENT_BINARY_DIR}/tmp" "${CMAKE_CURRENT_BINARY_DIR}/cache")
