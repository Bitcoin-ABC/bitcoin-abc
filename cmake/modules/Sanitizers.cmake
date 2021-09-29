# Check if the requested sanitizers are supported, and set the appropriated
# flags.
function(enable_sanitizers)
	# Build the -fsanitize= option
	list(JOIN ARGN "," _fsanitize_option_list)
	set(_fsanitize_option -fsanitize=${_fsanitize_option_list})

	include(SanitizeHelper)
	sanitize_c_cxx_definition("supports_" ${_fsanitize_option} _sanitizers_compile)

	# check_cxx_source_compiles() runs the compilation and link phases at the
	# same time, so add the flag under test for both.
	set(CMAKE_REQUIRED_FLAGS ${_fsanitize_option})
	set(_save_linker_flags ${CMAKE_EXE_LINKER_FLAGS})
	string(APPEND CMAKE_EXE_LINKER_FLAGS " ${_fsanitize_option}")

	include(CheckCXXSourceCompiles)
	check_cxx_source_compiles("
		#include <cstdint>
		#include <cstddef>
		extern \"C\" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) { return 0; }
		__attribute__((weak)) int main() { return 0; }
	" ${_sanitizers_compile})

	set(CMAKE_EXE_LINKER_FLAGS ${_save_linker_flags})

	if(NOT ${_sanitizers_compile})
		message(FATAL_ERROR "The sanitizers option is not supported: ${_fsanitize_option}")
	endif()

	# Some sanitizers require some extra options to be efficient
	if("address" IN_LIST ARGN OR "undefined" IN_LIST ARGN)
		include(AddCompilerFlags)
		add_compiler_flags(-fno-omit-frame-pointer -fno-optimize-sibling-calls)
	endif()

	add_compile_options(${_fsanitize_option})
	add_link_options(${_fsanitize_option})

	include(TestSuite)
	set(SAN_SUPP_DIR "${CMAKE_SOURCE_DIR}/test/sanitizer_suppressions")
	if("address" IN_LIST ARGN)
		add_test_environment(ASAN_OPTIONS "malloc_context_size=0:$ENV{ASAN_OPTIONS}")
		add_test_environment(ASAN_OPTIONS "detect_stack_use_after_return=1:$ENV{ASAN_OPTIONS}")
		add_test_environment(ASAN_OPTIONS "check_initialization_order=1:$ENV{ASAN_OPTIONS}")
		add_test_environment(ASAN_OPTIONS "strict_init_order=1:$ENV{ASAN_OPTIONS}")
		add_test_environment(LSAN_OPTIONS "suppressions=${SAN_SUPP_DIR}/lsan:$ENV{LSAN_OPTIONS}")
	endif()
	if("thread" IN_LIST ARGN)
		add_test_environment(TSAN_OPTIONS "second_deadlock_stack=1:$ENV{TSAN_OPTIONS}")
		add_test_environment(TSAN_OPTIONS "suppressions=${SAN_SUPP_DIR}/tsan:$ENV{TSAN_OPTIONS}")
	endif()
	if("undefined" IN_LIST ARGN)
		add_test_environment(UBSAN_OPTIONS "suppressions=${SAN_SUPP_DIR}/ubsan:print_stacktrace=1:halt_on_error=1:$ENV{UBSAN_OPTIONS}")
	endif()
endfunction()
