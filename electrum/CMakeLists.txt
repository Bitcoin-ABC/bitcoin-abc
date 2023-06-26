include(MakeLink)
make_link(test_runner.py)

add_custom_target(check-electrum
	COMMENT "Run Electrum ABC unit tests..."
	COMMAND	"${Python_EXECUTABLE}" ./test_runner.py
	DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/test_runner.py
)

add_dependencies(check-all check-electrum)
add_dependencies(check-extended check-electrum)
