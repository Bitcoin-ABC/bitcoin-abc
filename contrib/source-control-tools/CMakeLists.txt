# Copyright (c) 2019 The Bitcoin developers

add_custom_target(check-source-control-tools)

include(DoOrFail)
find_program_or_fail(BASH_EXECUTABLE bash)

set(SOURCE_CONTROL_TOOLS_TESTS
  test/test-autopatch.sh
)

foreach(TEST ${SOURCE_CONTROL_TOOLS_TESTS})
  get_filename_component(FILENAME ${TEST} NAME)
  set(TESTNAME "check-source-control-tools-${FILENAME}")
  add_custom_target(${TESTNAME}
    COMMAND
      "${BASH_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/${TEST}"
    )
  add_dependencies(check-source-control-tools ${TESTNAME})
endforeach()

