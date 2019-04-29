# Functional tests

The [/ est/](/test/) directory contains integration tests that test bitcoind
and its utilities in their entirety. It does not contain unit tests, which
can be found in [/src/test](/src/test), [/src/wallet/test](/src/wallet/test),
etc.

There are currently two sets of tests in the [/test/](/test/) directory:

- [functional](/test/functional) which test the functionality of
bitcoind and bitcoin-qt by interacting with them through the RPC and P2P
interfaces.
- [util](/test/util) which tests the bitcoin utilities, currently only
bitcoin-tx.

The util tests are run as part of `make check` target. The functional
tests are run by the Teamcity continuous build process whenever a diff is
created or updated on Phabricator. Both sets of tests can also be run locally.

# Running functional tests locally

Build for your system first. Be sure to enable wallet, utils and daemon when
you configure. Tests will not run otherwise.

### Functional tests

#### Dependencies

The ZMQ functional test requires a python ZMQ library. To install it:

- on Unix, run `sudo apt-get install python3-zmq`
- on mac OS, run `pip3 install pyzmq`

#### Running the tests

Individual tests can be run by directly calling the test script, eg:

```
test/functional/example_test.py
```

or can be run through the test_runner harness, eg:

```
test/functional/test_runner.py example_test
```

You can run any combination (incl. duplicates) of tests by calling:

```
test/functional/test_runner.py <testname1> <testname2> <testname3> ...
```

Run the regression test suite with:

```
test/functional/test_runner.py
```

Run all possible tests with
```
test/functional/test_runner.py --extended
```

By default, up to 4 tests will be run in parallel by test_runner. To specify
how many jobs to run, append `--jobs=n`

The individual tests and the test_runner harness have many command-line
options. Run `test_runner.py -h` to see them all.

#### Troubleshooting and debugging test failures

##### Resource contention

The P2P and RPC ports used by the bitcoind nodes-under-test are chosen to make
conflicts with other processes unlikely. However, if there is another bitcoind
process running on the system (perhaps from a previous test which hasn't successfully
killed all its bitcoind nodes), then there may be a port conflict which will
cause the test to fail. It is recommended that you run the tests on a system
where no other bitcoind processes are running.

On linux, the test_framework will warn if there is another
bitcoind process running when the tests are started.

If there are zombie bitcoind processes after test failure, you can kill them
by running the following commands. **Note that these commands will kill all
bitcoind processes running on the system, so should not be used if any non-test
bitcoind processes are being run.**

```bash
killall bitcoind
```

or

```bash
pkill -9 bitcoind
```

##### Data directory cache

A pre-mined blockchain with 200 blocks is generated the first time a
functional test is run and is stored in test/cache. This speeds up
test startup times since new blockchains don't need to be generated for
each test. However, the cache may get into a bad state, in which case
tests will fail. If this happens, remove the cache directory (and make
sure bitcoind processes are stopped as above):

```bash
rm -rf cache
killall bitcoind
```

##### Test logging

The tests contain logging at different levels (debug, info, warning, etc). By
default:

- when run through the test_runner harness, *all* logs are written to
  `test_framework.log` and no logs are output to the console.
- when run directly, *all* logs are written to `test_framework.log` and INFO
  level and above are output to the console.
- when run on Travis, no logs are output to the console. However, if a test
  fails, the `test_framework.log` and bitcoind `debug.log`s will all be dumped
  to the console to help troubleshooting.

To change the level of logs output to the console, use the `-l` command line
argument.

`test_framework.log` and bitcoind `debug.log`s can be combined into a single
aggregate log by running the `combine_logs.py` script. The output can be plain
text, colorized text or html. For example:

```
combine_logs.py -c <test data directory> | less -r
```

will pipe the colorized logs from the test into less.

Use `--tracerpc` to trace out all the RPC calls and responses to the console.
For some tests (eg any that use `submitblock` to submit a full block over RPC),
this can result in a lot of screen output.

By default, the test data directory will be deleted after a successful run.
Use `--nocleanup` to leave the test data directory intact. The test data
directory is never deleted after a failed test.

##### Attaching a debugger

A python debugger can be attached to tests at any point. Just add the line:

```py
import pdb; pdb.set_trace() 
```

anywhere in the test. You will then be able to inspect variables, as well as
call methods that interact with the bitcoind nodes-under-test.

### Util tests

Util tests can be run locally by running `test/util/bitcoin-util-test.py`.
Use the `-v` option for verbose output.

# Writing functional tests

#### Example test

The [example_test.py](example_test.py) is a heavily commented example of a test
case that uses both the RPC and P2P interfaces. If you are writing your first
test, copy that file and modify to fit your needs.

#### Coverage

Running `test_runner.py` with the `--coverage` argument tracks which RPCs are
called by the tests and prints a report of uncovered RPCs in the summary. This
can be used (along with the `--extended` argument) to find out which RPCs we
don't have test cases for.

#### Style guidelines

- Where possible, try to adhere to
  [PEP-8 guidelines]([https://www.python.org/dev/peps/pep-0008/)
- Use a python linter like flake8 before submitting PRs to catch common style
  nits (eg trailing whitespace, unused imports, etc)
- Avoid wildcard imports where possible
- Use a module-level docstring to describe what the test is testing, and how it
  is testing it.
- When subclassing the BitcoinTestFramwork, place overrides for the
  `set_test_params()`, `add_options()` and `setup_xxxx()` methods at the top of
  the subclass, then locally-defined helper methods, then the `run_test()` method.

#### General test-writing advice

- Set `self.num_nodes` to the minimum number of nodes necessary for the test.
  Having additional unrequired nodes adds to the execution time of the test as
  well as memory/CPU/disk requirements (which is important when running tests in
  parallel or on Travis).
- Avoid stop-starting the nodes multiple times during the test if possible. A
  stop-start takes several seconds, so doing it several times blows up the
  runtime of the test.
- Set the `self.setup_clean_chain` variable in `set_test_params()` to control
  whether or not to use the cached data directories. The cached data directories
  contain a 200-block pre-mined blockchain and wallets for four nodes. Each node
  has 25 mature blocks (25x50=1250 BTC) in its wallet.
- When calling RPCs with lots of arguments, consider using named keyword
  arguments instead of positional arguments to make the intent of the call
  clear to readers.

#### RPC and P2P definitions

Test writers may find it helpful to refer to the definitions for the RPC and
P2P messages. These can be found in the following source files:

- `/src/rpc/*` for RPCs
- `/src/wallet/rpc*` for wallet RPCs
- `ProcessMessage()` in `/src/net_processing.cpp` for parsing P2P messages

#### Using the P2P interface

- `mininode.py` contains all the definitions for objects that pass
over the network (`CBlock`, `CTransaction`, etc, along with the network-level
wrappers for them, `msg_block`, `msg_tx`, etc).

- P2P tests have two threads. One thread handles all network communication
with the bitcoind(s) being tested (using python's asyncore package); the other
implements the test logic.

- `P2PConnection` is the class used to connect to a bitcoind.  `P2PInterface`
contains the higher level logic for processing P2P payloads and connecting to
the Bitcoin Core node application logic. For custom behaviour, subclass the
P2PInterface object and override the callback methods.

- Call `network_thread_start()` after all `P2PInterface` objects are created to
start the networking thread.  (Continue with the test logic in your existing
thread.)

- Can be used to write tests where specific P2P protocol behavior is tested.
Examples tests are `p2p_unrequested_blocks.py`, `p2p_compactblocks.py`.

#### Comptool

- Comptool is a Testing framework for writing tests that compare the block/tx acceptance
behavior of a bitcoind against 1 or more other bitcoind instances. It should not be used
to write static tests with known outcomes, since that type of test is easier to write and
maintain using the standard BitcoinTestFramework.

- Set the `num_nodes` variable (defined in `ComparisonTestFramework`) to start up
1 or more nodes.  If using 1 node, then `--testbinary` can be used as a command line
option to change the bitcoind binary used by the test.  If using 2 or more nodes,
then `--refbinary` can be optionally used to change the bitcoind that will be used
on nodes 2 and up.

- Implement a (generator) function called `get_tests()` which yields `TestInstance`s.
Each `TestInstance` consists of:
  - a list of `[object, outcome, hash]` entries
    * `object` is a `CBlock`, `CTransaction`, or
    `CBlockHeader`.  `CBlock`'s and `CTransaction`'s are tested for
    acceptance.  `CBlockHeader`s can be used so that the test runner can deliver
    complete headers-chains when requested from the bitcoind, to allow writing
    tests where blocks can be delivered out of order but still processed by
    headers-first bitcoind's.
    * `outcome` is `True`, `False`, or `None`.  If `True`
    or `False`, the tip is compared with the expected tip -- either the
    block passed in, or the hash specified as the optional 3rd entry.  If
    `None` is specified, then the test will compare all the bitcoind's
    being tested to see if they all agree on what the best tip is.
    * `hash` is the block hash of the tip to compare against. Optional to
    specify; if left out then the hash of the block passed in will be used as
    the expected tip.  This allows for specifying an expected tip while testing
    the handling of either invalid blocks or blocks delivered out of order,
    which complete a longer chain.
  - `sync_every_block`: `True/False`.  If `False`, then all blocks
    are inv'ed together, and the test runner waits until the node receives the
    last one, and tests only the last block for tip acceptance using the
    outcome and specified tip.  If `True`, then each block is tested in
    sequence and synced (this is slower when processing many blocks).
  - `sync_every_transaction`: `True/False`.  Analogous to
    `sync_every_block`, except if the outcome on the last tx is "None",
    then the contents of the entire mempool are compared across all bitcoind
    connections.  If `True` or `False`, then only the last tx's
    acceptance is tested against the given outcome.

- For examples of tests written in this framework, see
  `p2p_invalid_block.py` and `feature_block.py`.

### test-framework modules

#### [test_framework/authproxy.py](test_framework/authproxy.py)
Taken from the [python-bitcoinrpc repository](https://github.com/jgarzik/python-bitcoinrpc).

#### [test_framework/test_framework.py](test_framework/test_framework.py)
Base class for functional tests.

#### [test_framework/util.py](test_framework/util.py)
Generally useful functions.

#### [test_framework/mininode.py](test_framework/mininode.py)
Basic code to support P2P connectivity to a bitcoind.

#### [test_framework/comptool.py](test_framework/comptool.py)
Framework for comparison-tool style, P2P tests.

#### [test_framework/script.py](test_framework/script.py)
Utilities for manipulating transaction scripts (originally from python-bitcoinlib)

#### [test_framework/blockstore.py](test_framework/blockstore.py)
Implements disk-backed block and tx storage.

#### [test_framework/key.py](test_framework/key.py)
Wrapper around OpenSSL EC_Key (originally from python-bitcoinlib)

#### [test_framework/bignum.py](test_framework/bignum.py)
Helpers for script.py

#### [test_framework/blocktools.py](test_framework/blocktools.py)
Helper functions for creating blocks and transactions.
