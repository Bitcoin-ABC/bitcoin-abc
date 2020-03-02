### Compiling/running unit tests

Unit tests are not part of the default build but can be built on demand.

All the unit tests can be built and run with a single command: `ninja check`.

#### bitcoind unit tests

The `bitcoind` unit tests can be built with `ninja test_bitcoin`.
They can also be built and run in a single command with `ninja check-bitcoin`.

To run the `bitcoind` tests manually, launch `src/test/test_bitcoin`.

To add more `bitcoind` tests, add `BOOST_AUTO_TEST_CASE` functions to the
existing .cpp files in the `src/test/` directory or add new .cpp files that
implement new `BOOST_AUTO_TEST_SUITE` sections.

#### bitcoin-qt unit tests

The `bitcoin-qt` tests can be built with `ninja test_bitcoin-qt` or
built and run in a single command with `ninja check-bitcoin-qt`.

To run the `bitcoin-qt` tests manually, launch `src/qt/test/test_bitcoin-qt`.

To add more `bitcoin-qt` tests, add them to the `src/qt/test/` directory and
the `src/qt/test/test_main.cpp` file.

#### bitcoin-seeder unit tests

The `bitcoin-seeder` unit tests can be built with `ninja test_bitcoin-seeder` or
built and run in a single command with `ninja check-bitcoin-seeder`.

To run the `bitcoin-seeder` tests manually, launch
`src/seeder/test/test_bitcoin-seeder`.

To add more `bitcoin-seeder` tests, add `BOOST_AUTO_TEST_CASE` functions to the
existing .cpp files in the `src/seeder/test/` directory or add new .cpp files
that implement new `BOOST_AUTO_TEST_SUITE` sections.

### Running individual tests

`test_bitcoin` has some built-in command-line arguments; for
example, to run just the `getarg_tests` verbosely:

    test_bitcoin --log_level=all --run_test=getarg_tests

... or to run just the doubledash test:

    test_bitcoin --run_test=getarg_tests/doubledash

Run `test_bitcoin --help` for the full list.

### Note on adding test cases

The build system is setup to compile an executable called `test_bitcoin`
that runs all of the unit tests.  The main source file is called
test_bitcoin.cpp. To add a new unit test file to our test suite you need
to add the file to `src/test/CMakeLists.txt`. The pattern is to create
one test file for each class or source file for which you want to create
unit tests.  The file naming convention is `<source_filename>_tests.cpp`
and such files should wrap their tests in a test suite
called `<source_filename>_tests`. For an example of this pattern,
examine `uint256_tests.cpp`.

For further reading, I found the following website to be helpful in
explaining how the boost unit test framework works:
[https://legalizeadulthood.wordpress.com/2009/07/04/c-unit-tests-with-boost-test-part-1/](https://legalizeadulthood.wordpress.com/2009/07/04/c-unit-tests-with-boost-test-part-1/)

### Debugging unit tests

Simple example of debugging unit tests with GDB on Linux:
```
cd /build/src/test
gdb test_bitcoin
break interpreter.cpp:295  # No path is necessary, just the file name and line number
run
# GDB hits the breakpoint
p/x opcode  # print the value of the variable (in this case, opcode) in hex
c           # continue
```

Simple example of debugging unit tests with LLDB (OSX or Linux):
```
cd /build/src/test
lldb -- test_bitcoin
break set --file interpreter.cpp --line 295
run
```
