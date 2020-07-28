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

set(_TEST_TARGET_DEPENDS "")
if(BUILD_BITCOIN_CLI)
	list(APPEND _TEST_TARGET_DEPENDS bitcoin-cli)
endif()
if(BUILD_BITCOIN_WALLET)
	list(APPEND _TEST_TARGET_DEPENDS bitcoin-wallet)
endif()

function(add_functional_test_check TARGET DESCRIPTION)
	if(ENABLE_JUNIT_REPORT)
		string(REGEX REPLACE " " "_" JUNIT_FILE "${DESCRIPTION}.xml")
		set(JUNIT_OUTPUT "--junitoutput=${JUNIT_REPORT_DIRECTORY}/${JUNIT_FILE}")
	endif()

	add_test_custom_target(${TARGET}
		TEST_COMMAND
			"${Python_EXECUTABLE}"
			./functional/test_runner.py
			"--testsuitename=Bitcoin ABC ${DESCRIPTION}"
			${JUNIT_OUTPUT}
			${ARGN}
		CUSTOM_TARGET_ARGS
			COMMENT "Running ${DESCRIPTION}"
			DEPENDS
				bitcoind
				${_TEST_TARGET_DEPENDS}
				${CMAKE_CURRENT_BINARY_DIR}/functional/test_runner.py
			USES_TERMINAL
			VERBATIM
	)

	add_custom_target_coverage(${TARGET})
endfunction()

add_functional_test_check(check-functional
	"functional tests"
)
add_dependencies(check-all check-functional)

add_functional_test_check(check-functional-extended
	"extended functional tests"
	--extended
)
add_dependencies(check-extended check-functional-extended)

add_functional_test_check(check-functional-upgrade-activated
	"functional tests with the next upgrade activated"
	--with-axionactivation
)
add_dependencies(check-upgrade-activated check-functional-upgrade-activated)

add_functional_test_check(check-functional-upgrade-activated-extended
	"extended functional tests with the next upgrade activated"
	--extended
	--with-axionactivation
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


set_property(DIRECTORY "${CMAKE_SOURCE_DIR}" APPEND PROPERTY ADDITIONAL_CLEAN_FILES "${CMAKE_CURRENT_BINARY_DIR}/cache")
