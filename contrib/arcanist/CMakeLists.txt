# Copyright (c) 2019 The Bitcoin developers

add_custom_target(check-arcanist)

find_program(BASH_EXECUTABLE bash)

set(ARCANIST_TESTS
  ./test/test-autopatch.sh
)

foreach(TEST ${ARCANIST_TESTS})
  get_filename_component(FILENAME ${TEST} NAME)
  set(TESTNAME "check-arcanist-${FILENAME}")
  add_custom_target(${TESTNAME}
    COMMAND
      "${BASH_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/${TEST}"
    )
  add_dependencies(check-arcanist ${TESTNAME})
endforeach()

add_dependencies(check check-arcanist)
add_dependencies(check-all check-arcanist)
