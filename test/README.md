The [functional](/test/functional/) folder contains a script test_runner
 to call multiple functional tests from its folder.

Every pull request to the bitcoin repository is built and run through
the regression test suite. You can also run all or only individual
tests locally.

Test dependencies
=================
Before running the tests, the following must be installed.

Unix
----
The python3-zmq library is required. On Ubuntu or Debian it can be installed via:
```
sudo apt-get install python3-zmq
```

OS X
------
```
pip3 install pyzmq
```

Running tests
=============

You can run any single test by calling

    test/functional/test_runner.py <testname>

Or you can run any combination of tests by calling

    test/functional/test_runner.py <testname1> <testname2> <testname3> ...

Run the regression test suite with

    test/functional/test_runner.py

Run all possible tests with

    test/functional/test_runner.py --extended

By default, tests will be run in parallel. To specify how many jobs to run,
append `-parallel=n` (default n=4).

If you want to create a basic coverage report for the rpc test suite, append `--coverage`.

Possible options, which apply to each individual test run:

```
  -h, --help            show this help message and exit
  --nocleanup           Leave bitcoinds and test.* datadir on exit or error
  --noshutdown          Don't stop bitcoinds after the test execution
  --srcdir=SRCDIR       Source directory containing bitcoind/bitcoin-cli
                        (default: /Users/shammah/repos/bitcoin-abc/src)
  --cachedir=CACHEDIR   Directory for caching pregenerated datadirs
  --tmpdir=TMPDIR       Root directory for datadirs
  -l LOGLEVEL, --loglevel=LOGLEVEL
                        log events at this level and higher to the console.
                        Can be set to DEBUG, INFO, WARNING, ERROR or CRITICAL.
                        Passing --loglevel DEBUG will output all logs to
                        console. Note that logs at all levels are always
                        written to the test_framework.log file in the
                        temporary test directory.
  --tracerpc            Print out all RPC calls as they are made
  --portseed=PORT_SEED  The seed to use for assigning port numbers (default:
                        current process id)
  --coveragedir=COVERAGEDIR
                        Write tested RPC commands into this directory
```

If you set the environment variable `PYTHON_DEBUG=1` you will get some debug
output (example: `PYTHON_DEBUG=1 test/functional/test_runner.py wallet`).

A 200-block `--regtest` blockchain and wallets for four nodes
is created the first time a regression test is run and
is stored in the cache/ directory. Each node has 25 mature
blocks (25*50=1250 BTC) in its wallet.

After the first run, the cache/ blockchain and wallets are
copied into a temporary directory and used as the initial
test state.

If you get into a bad state, you should be able
to recover with:

```bash
rm -rf cache
killall bitcoind
```

Writing tests
=============
You are encouraged to write tests for new or existing features.

Further information about the test framework and individual functional
tests is found in [test/functional](/test/functional).
