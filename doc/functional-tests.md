# Functional tests

The [/test/](/test/) directory contains integration tests that test bitcoind
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

- On Unix, run `sudo apt-get install python3-zmq`
- On mac OS, run `pip3 install pyzmq`

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

- When run through the test_runner harness, *all* logs are written to
  `test_framework.log` and no logs are output to the console.
- When run directly, *all* logs are written to `test_framework.log` and INFO
  level and above are output to the console.
- When run on Travis, no logs are output to the console. However, if a test
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

If further introspection of the bitcoind instances themselves becomes
necessary, this can be accomplished by first setting a pdb breakpoint
at an appropriate location, running the test to that point, then using
`gdb` to attach to the process and debug.

For instance, to attach to `self.node[1]` during a run:

```bash
2017-06-27 14:13:56.686000 TestFramework (INFO): Initializing test directory /tmp/user/1000/testo9vsdjo3
```

use the directory path to get the pid from the pid file:

```bash
cat /tmp/user/1000/testo9vsdjo3/node1/regtest/bitcoind.pid
gdb /home/example/bitcoind <pid>
```

Note: gdb attach step may require `sudo`. To get rid of this, you can run:

```bash
echo 0 | sudo tee /proc/sys/kernel/yama/ptrace_scope
```

### Benchmarking and profiling with perf

An easy way to profile node performance during functional tests is provided
for Linux platforms using `perf`.

Perf will sample the running node and will generate profile data in the node's
datadir. The profile data can then be presented using `perf report` or a graphical
tool like [hotspot](https://github.com/KDAB/hotspot).

There are two ways of invoking perf: one is to use the `--perf` flag when
running tests, which will profile each node during the entire test run: perf
begins to profile when the node starts and ends when it shuts down. The other
way is the use the `profile_with_perf` context manager, e.g.

```python
with node.profile_with_perf("send-big-msgs"):
    # Perform activity on the node you're interested in profiling, e.g.:
    for _ in range(10000):
        node.p2p.send_message(some_large_message)
```

To see useful textual output, run

```sh
perf report -i /path/to/datadir/send-big-msgs.perf.data.xxxx --stdio | c++filt | less
```

#### See also:

- [Installing perf](https://askubuntu.com/q/50145)
- [Perf examples](http://www.brendangregg.com/perf.html)
- [Hotspot](https://github.com/KDAB/hotspot): a GUI for perf output analysis

##### Prevent using deprecated features

Python will issue a `DeprecationWarning` when a deprecated feature is
encountered in a script. By default, this warning message is ignored and not
displayed to the user. This behavior can be changed by setting the environment
variable `PYTHONWARNINGS` as follow:

`PYTHONWARNINGS=default::DeprecationWarning`

The warning message will now be printed to the `sys.stderr` output.

### Util tests

Util tests can be run locally by running `test/util/bitcoin-util-test.py`.
Use the `-v` option for verbose output.

# Writing functional tests

#### Example test

The [example_test.py](/test/functional/example_test.py) is a heavily commented
example of a test case that uses both the RPC and P2P interfaces. If you are
writing your first test, copy that file and modify to fit your needs.

#### Coverage

Running `test_runner.py` with the `--coverage` argument tracks which RPCs are
called by the tests and prints a report of uncovered RPCs in the summary. This
can be used (along with the `--extended` argument) to find out which RPCs we
don't have test cases for.

#### Style guidelines

- Where possible, try to adhere to
  [PEP-8 guidelines](https://www.python.org/dev/peps/pep-0008/)
- Use a python linter like flake8 before submitting PRs to catch common style
  nits (eg trailing whitespace, unused imports, etc)
- Avoid wildcard imports where possible
- Use a module-level docstring to describe what the test is testing, and how it
  is testing it.
- When subclassing the BitcoinTestFramwork, place overrides for the
  `set_test_params()`, `add_options()` and `setup_xxxx()` methods at the top of
  the subclass, then locally-defined helper methods, then the `run_test()` method.

#### Naming guidelines

- Name the test `<area>_test.py`, where area can be one of the following:
    - `feature` for tests for full features that aren't wallet/mining/mempool, eg `feature_rbf.py`
    - `interface` for tests for other interfaces (REST, ZMQ, etc), eg `interface_rest.py`
    - `mempool` for tests for mempool behaviour, eg `mempool_reorg.py`
    - `mining` for tests for mining features, eg `mining_prioritisetransaction.py`
    - `p2p` for tests that explicitly test the p2p interface, eg `p2p_disconnect_ban.py`
    - `rpc` for tests for individual RPC methods or features, eg `rpc_listtransactions.py`
    - `wallet` for tests for wallet features, eg `wallet_keypool.py`
- use an underscore to separate words
    - exception: for tests for specific RPCs or command line options which don't include underscores, name the test after the exact RPC or argument name, eg `rpc_decodescript.py`, not `rpc_decode_script.py`
- Don't use the redundant word `test` in the name, eg `interface_zmq.py`, not `interface_zmq_test.py`

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
- Many of the core test framework classes such as `CBlock` and `CTransaction`
  don't allow new attributes to be added to their objects at runtime like
  typical Python objects allow. This helps prevent unpredictable side effects
  from typographical errors or usage of the objects outside of their intended
  purpose.

#### RPC and P2P definitions

Test writers may find it helpful to refer to the definitions for the RPC and
P2P messages. These can be found in the following source files:

- `/src/rpc/*` for RPCs
- `/src/wallet/rpc*` for wallet RPCs
- `ProcessMessage()` in `/src/net_processing.cpp` for parsing P2P messages

#### Using the P2P interface

- `messages.py` contains all the definitions for objects that pass
over the network (`CBlock`, `CTransaction`, etc, along with the network-level
wrappers for them, `msg_block`, `msg_tx`, etc).

- P2P tests have two threads. One thread handles all network communication
with the bitcoind(s) being tested in a callback-based event loop; the other
implements the test logic.

- `P2PConnection` is the class used to connect to a bitcoind.  `P2PInterface`
contains the higher level logic for processing P2P payloads and connecting to
the Bitcoin Core node application logic. For custom behaviour, subclass the
P2PInterface object and override the callback methods.

- Can be used to write tests where specific P2P protocol behavior is tested.
Examples tests are `p2p-acceptblock.py`, `p2p-compactblocks.py`.

### test-framework modules

#### [test_framework/authproxy.py](/test/functional/test_framework/authproxy.py)
Taken from the [python-bitcoinrpc repository](https://github.com/jgarzik/python-bitcoinrpc).

#### [test_framework/test_framework.py](/test/functional/test_framework/test_framework.py)
Base class for functional tests.

#### [test_framework/util.py](/test/functional/test_framework/util.py)
Generally useful functions.

#### [test_framework/mininode.py](/test/functional/test_framework/mininode.py)
Basic code to support P2P connectivity to a bitcoind.

#### [test_framework/script.py](/test/functional/test_framework/script.py)
Utilities for manipulating transaction scripts (originally from python-bitcoinlib)

#### [test_framework/key.py](/test/functional/test_framework/key.py)
Wrapper around OpenSSL EC_Key (originally from python-bitcoinlib)

#### [test_framework/bignum.py](/test/functional/test_framework/bignum.py)
Helpers for script.py

#### [test_framework/blocktools.py](/test/functional/test_framework/blocktools.py)
Helper functions for creating blocks and transactions.
