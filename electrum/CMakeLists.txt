include(MakeLink)
make_link(test_runner.py)

add_custom_target(make-secp256k1-for-electrum
  COMMENT "Build the shared libsecp256k1 for electrum..."
  COMMAND ${CMAKE_CURRENT_SOURCE_DIR}/contrib/make_secp
)

add_custom_target(check-electrum
	COMMENT "Run Electrum ABC unit tests..."
	COMMAND	"${Python_EXECUTABLE}" ./test_runner.py unit
	DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/test_runner.py
)

add_dependencies(check-electrum make-secp256k1-for-electrum)

if(BUILD_CHRONIK)
	add_custom_target(check-electrum-functional
		COMMENT "Run Electrum ABC functional tests..."
		COMMAND
			"BITCOIND=${CMAKE_BINARY_DIR}/src/bitcoind"
			"${Python_EXECUTABLE}" ./test_runner.py functional
		DEPENDS
			bitcoind
			${CMAKE_CURRENT_BINARY_DIR}/test_runner.py
	)

	add_dependencies(check-electrum-functional make-secp256k1-for-electrum)
endif()
