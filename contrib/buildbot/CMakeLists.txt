add_custom_target(check-buildbot
	COMMENT "Running the buildbot tests"
	COMMAND "${Python_EXECUTABLE}" -m pytest
	WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/test"
)
