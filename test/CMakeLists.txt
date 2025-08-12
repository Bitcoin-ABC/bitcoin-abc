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
include(MakeLink)
make_link(functional/test_runner.py)
make_link(util/bitcoin-util-test.py)
make_link(util/rpcauth-test.py)

get_property(FUZZ_TARGETS GLOBAL PROPERTY FUZZ_TARGETS)
make_link(fuzz/test_runner.py ${FUZZ_TARGETS})

include(Coverage)
include(TestSuite)

set(_TEST_TARGET_DEPENDS "")
if(BUILD_CLI)
	list(APPEND _TEST_TARGET_DEPENDS bitcoin-cli)
endif()
if(BUILD_WALLET)
	list(APPEND _TEST_TARGET_DEPENDS bitcoin-wallet)
endif()
if(BUILD_CHRONIK)
	find_package(Protobuf 3.0.0 REQUIRED)
	protobuf_generate_python(
		PROTOBUF_PY
		../chronik/chronik-proto/proto/chronik.proto
	)
	list(APPEND _TEST_TARGET_DEPENDS "${PROTOBUF_PY}")
	add_custom_target(protobuf-chronik ALL DEPENDS "${PROTOBUF_PY}")
endif()

function(add_functional_test_check TARGET DESCRIPTION)
	if(ENABLE_JUNIT_REPORT)
		string(REGEX REPLACE " " "_" JUNIT_FILE "${DESCRIPTION}.xml")
		set(JUNIT_OUTPUT "--junitoutput=${JUNIT_REPORT_DIRECTORY}/${JUNIT_FILE}")
	endif()

	# Sanitizers, coverage and quemu introduce a lot of overhead, so double the
	# timeout to prevent false positives.
	if(ENABLE_SANITIZERS OR ENABLE_COVERAGE OR CMAKE_CROSSCOMPILING_EMULATOR OR CMAKE_BUILD_TYPE STREQUAL "Debug")
		message(
			STATUS
			"Slow build detected, doubling timeout for ${DESCRIPTION} (target '${TARGET}')"
		)
		set(EXTENDED_TIMEOUT "--timeout-factor=2")
	endif()

	if (FUNCTIONAL_TESTS_TMPDIRPREFIX)
		set(TMPDIRPREFIX "--tmpdirprefix=${FUNCTIONAL_TESTS_TMPDIRPREFIX}")
	endif()

	add_test_custom_target(${TARGET}
		TEST_COMMAND
			"${Python_EXECUTABLE}"
			./functional/test_runner.py
			"--testsuitename=Bitcoin ABC ${DESCRIPTION}"
			${JUNIT_OUTPUT}
			${EXTENDED_TIMEOUT}
			${TMPDIRPREFIX}
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
	--with-shibusawaactivation
)
add_dependencies(check-upgrade-activated check-functional-upgrade-activated)

add_functional_test_check(check-functional-upgrade-activated-extended
	"extended functional tests with the next upgrade activated"
	--extended
	--with-shibusawaactivation
)
add_dependencies(check-upgrade-activated-extended check-functional-upgrade-activated-extended)

if(BUILD_TX)
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
