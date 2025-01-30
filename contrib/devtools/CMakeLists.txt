# Copyright (c) 2019 The Bitcoin developers

set(SPLIT_DEBUG_SCRIPT_TMP "tmp/split-debug.sh")
configure_file(
	"split-debug.sh.cmake.in"
	"split-debug.sh"
)

add_custom_target(check-devtools)

set(DEVTOOLS_TESTS_PYTHON
  ./chainparams/test_make_chainparams.py
)

foreach(TEST ${DEVTOOLS_TESTS_PYTHON})
  get_filename_component(TESTNAME ${TEST} NAME)
  get_filename_component(TESTPATH ${TEST} ABSOLUTE ${CMAKE_CURRENT_SOURCE_DIR})
  get_filename_component(WORKDIR ${TESTPATH} DIRECTORY)
  add_custom_target("check-devtools-${TESTNAME}"
    WORKING_DIRECTORY
      ${WORKDIR}
    COMMAND
      "${Python_EXECUTABLE}"
      "./${TESTNAME}"
  )
  add_dependencies(check-devtools "check-devtools-${TESTNAME}")
endforeach()

add_dependencies(check check-devtools)
add_dependencies(check-all check-devtools)

include(PackageHelper)
exclude_from_source_package(
	# Files
	"bitcoind-exit-on-log.sh"
	"circular-dependencies.py"
	"copyright_header.py"
	"extract_strings_qt.py"
	"optimize-pngs.py"
	"README.md"
	"update-translations.py"
)
