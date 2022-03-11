Developer Notes
===============

<!-- markdown-toc start -->
**Table of Contents**

- [Developer Notes](#developer-notes)
    - [Coding Style (General)](#coding-style-general)
    - [Coding Style (C++)](#coding-style-c)
    - [Doxygen comments](#doxygen-comments)
    - [Coding Style (Python)](#coding-style-python)
    - [Development tips and tricks](#development-tips-and-tricks)
        - [Compiling for debugging](#compiling-for-debugging)
        - [Compiling for gprof profiling](#compiling-for-gprof-profiling)
        - [debug.log](#debuglog)
        - [Writing tests](#writing-tests)
        - [Writing script integration tests](#writing-script-integration-tests)
        - [Testnet and Regtest modes](#testnet-and-regtest-modes)
        - [DEBUG_LOCKORDER](#debug_lockorder)
        - [DEBUG_LOCKCONTENTION](#debug_lockcontention)
        - [Valgrind suppressions file](#valgrind-suppressions-file)
        - [Compiling for test coverage](#compiling-for-test-coverage)
        - [Performance profiling with perf](#performance-profiling-with-perf)
        - [Sanitizers](#sanitizers)
    - [Locking/mutex usage notes](#lockingmutex-usage-notes)
    - [Threads](#threads)
    - [Ignoring IDE/editor files](#ignoring-ideeditor-files)
- [Development guidelines](#development-guidelines)
    - [Wallet](#wallet)
    - [General C++](#general-c)
    - [C++ data structures](#c-data-structures)
    - [Strings and formatting](#strings-and-formatting)
    - [Variable names](#variable-names)
    - [Threads and synchronization](#threads-and-synchronization)
    - [Scripts](#scripts)
        - [Shebang](#shebang)
    - [Source code organization](#source-code-organization)
    - [GUI](#gui)
    - [Unit tests](#unit-tests)
    - [Third party libraries](#third-party-libraries)
    - [Git and GitHub tips](#git-and-github-tips)
    - [Release notes](#release-notes)
    - [RPC interface guidelines](#rpc-interface-guidelines)
    - [Internal interface guidelines](#internal-interface-guidelines)

<!-- markdown-toc end -->

Coding Style (General)
----------------------

Various coding styles have been used during the history of the codebase,
and the result is not very consistent. However, we're now trying to converge to
a single style, so please use it in new code. Old code will be converted
gradually and a handful of linters will help you to clean up your patches before
submitting them for review. These linters are run automatically when using
`arc diff` but can also be explicitly called with `arc lint`.


Coding Style (C++)
------------------

- Basic rules specified in [.clang-format](/.clang-format).
  - Braces on new lines for namespaces, classes, functions, methods.
  - Braces on the same line for everything else.
  - 4 space indentation (no tabs) for every block except namespaces.
  - No indentation for `public`/`protected`/`private` or for `namespace`.
  - No extra spaces inside parenthesis; don't do ( this )
  - No space after function names; one space after `if`, `for` and `while`.
  - Always add braces for block statements (e.g. `if`, `for`, `while`).
  - `++i` is preferred over `i++`.
  - `static_assert` is preferred over `assert` where possible.
    Generally; compile-time checking is preferred over run-time checking.
  - Use CamelCase for functions/methods, and lowerCamelCase for variables.
    - GLOBAL_CONSTANTS should use UPPER_SNAKE_CASE.
    - namespaces should use lower_snake_case.
  - Function names should generally start with an English command-form verb
    (e.g. `ValidateTransaction`, `AddTransactionToMempool`, `ConnectBlock`)
  - Variable names should generally be nouns or past/future tense verbs.
    (e.g. `canDoThing`, `signatureOperations`, `didThing`)
  - Avoid using globals, remove existing globals whenever possible.
  - Class member variable names should be prepended with `m_`
  - DO choose easily readable identifier names.
  - DO favor readability over brevity.
  - DO NOT use Hungarian notation.
  - DO NOT use abbreviations or contractions within identifiers.
    - WRONG: mempool
    - RIGHT: MemoryPool
    - WRONG: ChangeDir
    - RIGHT: ChangeDirectory
  - DO NOT use obscure acronyms, DO uppercase any acronyms.
  - FINALLY, do not migrate existing code unless refactoring. It makes
    forwarding-porting from Bitcoin Core more difficult.

The naming convention roughly mirrors [Microsoft Naming Conventions](https://docs.microsoft.com/en-us/dotnet/standard/design-guidelines/general-naming-conventions)

C++ Coding Standards should strive to follow the [LLVM Coding Standards](https://llvm.org/docs/CodingStandards.html)

Code style example:
```c++
// namespaces should be lower_snake_case
namespace foo_bar_bob {

/**
 * Class is used for doing classy things.  All classes should
 * have a doxygen comment describing their PURPOSE.  That is to say,
 * why they exist.  Functional details can be determined from the code.
 * @see PerformTask()
 */
class Class {
private:
    //! memberVariable's name should be lowerCamelCase, and be a noun.
    int m_memberVariable;

public:
    /**
    * The documentation before a function or class method should follow Doxygen
    * spec. The name of the function should start with an english verb which
    * indicates the intended purpose of this code.
    *
    * The  function name should be should be CamelCase.
    *
    * @param[in] s    A description
    * @param[in] n    Another argument description
    * @pre Precondition for function...
    */
    bool PerformTask(const std::string& s, int n) {
        // Use lowerChamelCase for local variables.
        bool didMore = false;

        // Comment summarizing the intended purpose of this section of code
        for (int i = 0; i < n; ++i) {
            if (!DidSomethingFail()) {
              return false;
            }
            ...
            if (IsSomethingElse()) {
                DoMore();
                didMore = true;
            } else {
                DoLess();
            }
        }

        return didMore;
    }
}
} // namespace foo
```


Doxygen comments
-----------------

To facilitate the generation of documentation, use doxygen-compatible comment blocks for functions, methods and fields.

For example, to describe a function use:
```c++
/**
 * ... text ...
 * @param[in] arg1    A description
 * @param[in] arg2    Another argument description
 * @pre Precondition for function...
 */
bool function(int arg1, const char *arg2)
```
A complete list of `@xxx` commands can be found at http://www.doxygen.nl/manual/commands.html.
As Doxygen recognizes the comments by the delimiters (`/**` and `*/` in this case), you don't
*need* to provide any commands for a comment to be valid; just a description text is fine.

To describe a class use the same construct above the class definition:
```c++
/**
 * Alerts are for notifying old versions if they become too obsolete and
 * need to upgrade. The message is displayed in the status bar.
 * @see GetWarnings()
 */
class CAlert
{
```

To describe a member or variable use:
```c++
int var; //!< Detailed description after the member
```

or
```cpp
//! Description before the member
int var;
```

Also OK:
```c++
///
/// ... text ...
///
bool function2(int arg1, const char *arg2)
```

Not OK (used plenty in the current source, but not picked up):
```c++
//
// ... text ...
//
```

A full list of comment syntaxes picked up by doxygen can be found at http://www.doxygen.nl/manual/docblocks.html,
but if possible use one of the above styles.

To build doxygen locally to test changes to the Doxyfile or visualize your comments before landing changes:
```
ninja doc-doxygen
# output goes to doc/doxygen/html/
```

Coding Style (Python)
---------------------

Refer to [functional-tests.md#style-guidelines](functional-tests.md#style-guidelines).

Development tips and tricks
---------------------------

### Compiling for debugging

Run `cmake`  with `-DCMAKE_BUILD_TYPE=Debug` to add additional compiler flags
that produce better debugging builds.

### Compiling for gprof profiling

```
  cmake -GNinja .. -DENABLE_HARDENING=OFF -DENABLE_PROFIILING=gprof
```

### debug.log

If the code is behaving strangely, take a look in the debug.log file in the data directory;
error and debugging messages are written there.

The `-debug=...` command-line option controls debugging; running with just `-debug` or `-debug=1` will turn
on all categories (and give you a very large debug.log file).

The Qt code routes `qDebug()` output to debug.log under category "qt": run with `-debug=qt`
to see it.

### Writing tests

For details on unit tests, see [Compiling/running unit tests](unit-tests.md).

For details on functional tests, see [Functional tests](functional-tests.md).

### Writing script integration tests

Script integration tests are built using `src/test/script_tests.cpp`:

1. Uncomment the line with `#define UPDATE_JSON_TESTS`
2. Add a new TestBuilder to the `script_build` test to cover your test case.
3. `ninja check-bitcoin-script_tests`
4. Copy your newly generated test JSON from `<build-dir>/src/script_tests.json.gen` to `src/test/data/script_tests.json`.

Please commit your TestBuilder along with your generated test JSON and cleanup the uncommented #define before code review.

### Testnet and Regtest modes

Run with the `-testnet` option to run with "play bitcoins" on the test network, if you
are testing multi-machine code that needs to operate across the internet.

If you are testing something that can run on one machine, run with the `-regtest` option.
In regression test mode, blocks can be created on-demand; see [test/functional/](/test/functional) for tests
that run in `-regtest` mode.

### DEBUG_LOCKORDER

Bitcoin ABC is a multi-threaded application, and deadlocks or other
multi-threading bugs can be very difficult to track down.
The `-DCMAKE_BUILD_TYPE=Debug` cmake option adds `-DDEBUG_LOCKORDER` to the
compiler flags. This inserts run-time checks to keep track of which locks are
held, and adds warnings to the debug.log file if inconsistencies are detected.

### DEBUG_LOCKCONTENTION

Defining `DEBUG_LOCKCONTENTION` adds a "lock" logging category that, when enabled,
logs the location and duration of each lock contention to the `debug.log` file.

To enable it, run cmake with `-DDEBUG_LOCKCONTENTION` added to your CPPFLAGS,
e.g. `-DCMAKE_CXX_FLAGS="-DDEBUG_LOCKCONTENTION"`, then build and run bitcoind.

You can then use the `-debug=lock` configuration option at bitcoind startup or
`bitcoin-cli logging '["lock"]'` at runtime to turn on lock contention logging.
It can be toggled off again with `bitcoin-cli logging [] '["lock"]'`.

### Assertions and Checks

The util file `src/util/check.h` offers helpers to protect against coding and
internal logic bugs. They must never be used to validate user, network or any
other input.

* `assert` or `Assert` should be used to document assumptions when any
  violation would mean that it is not safe to continue program execution. The
  code is always compiled with assertions enabled.
   - For example, a nullptr dereference or any other logic bug in validation
     code means the program code is faulty and must terminate immediately.
* `CHECK_NONFATAL` should be used for recoverable internal logic bugs. On
  failure, it will throw an exception, which can be caught to recover from the
  error.
   - For example, a nullptr dereference or any other logic bug in RPC code
     means that the RPC code is faulty and can not be executed. However, the
     logic bug can be shown to the user and the program can continue to run.
* `Assume` should be used to document assumptions when program execution can
  safely continue even if the assumption is violated. In debug builds it
  behaves like `Assert`/`assert` to notify developers and testers about
  nonfatal errors. In production it doesn't warn or log anything, though the
  expression is always evaluated.
   - For example it can be assumed that a variable is only initialized once,
     but a failed assumption does not result in a fatal bug. A failed
     assumption may or may not result in a slightly degraded user experience,
     but it is safe to continue program execution.

### Valgrind suppressions file

Valgrind is a programming tool for memory debugging, memory leak detection, and
profiling. The repo contains a Valgrind suppressions file
([`valgrind.supp`](/contrib/valgrind.supp))
which includes known Valgrind warnings in our dependencies that cannot be fixed
in-tree. Example use:

```shell
$ valgrind --suppressions=contrib/valgrind.supp src/test/test_bitcoin
$ valgrind --suppressions=contrib/valgrind.supp --leak-check=full \
      --show-leak-kinds=all src/test/test_bitcoin --log_level=test_suite
$ valgrind -v --leak-check=full src/bitcoind -printtoconsole
```

### Compiling for test coverage

LCOV can be used to generate a test coverage report based upon some test targets
execution. Some packages are required to generate the coverage report:
`c++filt`, `gcov`, `genhtml`, `lcov` and `python3`.

To install these dependencies on Debian 10:

```shell
sudo apt install binutils-common g++ lcov python3
```

To enable LCOV report generation during test runs:

```shell
cmake -GNinja .. -DENABLE_COVERAGE=ON
ninja coverage-check-all
```

A coverage report will now be accessible at `./check-all.coverage/index.html`.

To include branch coverage, you can add the `-DENABLE_BRANCH_COVERAGE=ON` option
to the `cmake` command line.

### Performance profiling with perf

Profiling is a good way to get a precise idea of where time is being spent in
code. One tool for doing profiling on Linux platforms is called
[`perf`](http://www.brendangregg.com/perf.html), and has been integrated into
the functional test framework. Perf can observe a running process and sample
(at some frequency) where its execution is.

Perf installation is contingent on which kernel version you're running; see
[this StackExchange
thread](https://askubuntu.com/questions/50145/how-to-install-perf-monitoring-tool)
for specific instructions.

Certain kernel parameters may need to be set for perf to be able to inspect the
running process' stack.

```sh
$ sudo sysctl -w kernel.perf_event_paranoid=-1
$ sudo sysctl -w kernel.kptr_restrict=0
```

Make sure you [understand the security
trade-offs](https://lwn.net/Articles/420403/) of setting these kernel
parameters.

To profile a running bitcoind process for 60 seconds, you could use an
invocation of `perf record` like this:

```sh
$ perf record \
    -g --call-graph dwarf --per-thread -F 140 \
    -p `pgrep bitcoind` -- sleep 60
```

You could then analyze the results by running

```sh
perf report --stdio | c++filt | less
```

or using a graphical tool like [Hotspot](https://github.com/KDAB/hotspot).

See the functional test documentation for how to invoke perf within tests.

### Sanitizers

Bitcoin ABC can be compiled with various "sanitizers" enabled, which add
instrumentation for issues regarding things like memory safety, thread race
conditions, or undefined behavior. This is controlled with the
`-DENABLE_SANITIZERS` cmake flag, which should be a semicolon separated list of
sanitizers to enable. The sanitizer list should correspond to supported
`-fsanitize=` options in your compiler. These sanitizers have runtime overhead,
so they are most useful when testing changes or producing debugging builds.

Some examples:

```bash
# Enable both the address sanitizer and the undefined behavior sanitizer
cmake -GNinja .. -DENABLE_SANITIZERS="address;undefined"

# Enable the thread sanitizer
cmake -GNinja .. -DENABLE_SANITIZERS=thread
```

If you are compiling with GCC you will typically need to install corresponding
"san" libraries to actually compile with these flags, e.g. libasan for the
address sanitizer, libtsan for the thread sanitizer, and libubsan for the
undefined sanitizer. If you are missing required libraries, the cmake script
will fail with an error when testing the sanitizer flags.

Note that the sanitizers will give a better output if they are run with a Debug
build configuration.

There are a number of known problems for which suppressions files are provided
under `test/sanitizer_suppressions`. These files are intended to be used with
the `suppressions` option from the sanitizers. If you are using the `check-*`
targets to run the tests, the suppression options are automatically set.
Otherwise they need to be set manually using environment variables; refer to
your compiler manual for the correct syntax.

The address sanitizer is known to fail in
[sha256_sse4::Transform](/src/crypto/sha256_sse4.cpp) which makes it unusable
unless you also use `-DCRYPTO_USE_ASM=OFF` when running cmake.
We would like to fix sanitizer issues, so please send pull requests if you can
fix any errors found by the address sanitizer (or any other sanitizer).

Not all sanitizer options can be enabled at the same time, e.g. trying to build
with `-DENABLE_SANITIZERS=="address;thread" will fail in the cmake script as
these sanitizers are mutually incompatible. Refer to your compiler manual to
learn more about these options and which sanitizers are supported by your
compiler.

Examples:

Build and run the test suite with the address sanitizer enabled:

```bash
mkdir build_asan
cd build_asan

cmake -GNinja .. \
  -DCMAKE_BUILD_TYPE=Debug \
  -DENABLE_SANITIZERS=address \
  -DCRYPTO_USE_ASM=OFF

ninja check check-functional
```

Build and run the test suite with the thread sanitizer enabled (it can take a
very long time to complete):

```bash
mkdir build_tsan
cd build_tsan

cmake -GNinja .. \
  -DCMAKE_BUILD_TYPE=Debug \
  -DENABLE_SANITIZERS=thread

ninja check check-functional
```

Build and run the test suite with the undefined sanitizer enabled:

```bash
mkdir build_ubsan
cd build_ubsan

cmake -GNinja .. \
  -DCMAKE_BUILD_TYPE=Debug \
  -DENABLE_SANITIZERS=undefined

ninja check check-functional
```

Additional resources:

 * [AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)
 * [LeakSanitizer](https://clang.llvm.org/docs/LeakSanitizer.html)
 * [MemorySanitizer](https://clang.llvm.org/docs/MemorySanitizer.html)
 * [ThreadSanitizer](https://clang.llvm.org/docs/ThreadSanitizer.html)
 * [UndefinedBehaviorSanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)
 * [GCC Instrumentation Options](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html)
 * [Google Sanitizers Wiki](https://github.com/google/sanitizers/wiki)
 * [Issue #12691: Enable -fsanitize flags in Travis](https://github.com/bitcoin/bitcoin/issues/12691)

Locking/mutex usage notes
-------------------------

The code is multi-threaded, and uses mutexes and the
`LOCK` and `TRY_LOCK` macros to protect data structures.

Deadlocks due to inconsistent lock ordering (thread 1 locks `cs_main` and then
`cs_wallet`, while thread 2 locks them in the opposite order: result, deadlock
as each waits for the other to release its lock) are a problem. Compile with
`-DDEBUG_LOCKORDER` (or use `-DCMAKE_BUILD_TYPE=Debug`) to get lock order
inconsistencies reported in the debug.log file.

Re-architecting the core code so there are better-defined interfaces
between the various components is a goal, with any necessary locking
done by the components (e.g. see the self-contained `FillableSigningProvider` class
and its `cs_KeyStore` lock for example).

Threads
-------

- [Main thread (`bitcoind`)](https://www.bitcoinabc.org/doc/dev/bitcoind_8cpp.html#a0ddf1224851353fc92bfbff6f499fa97)
  : Started from `main()` in `bitcoind.cpp`. Responsible for starting up and
  shutting down the application.

- [ThreadImport (`b-loadblk`)](https://www.bitcoinabc.org/doc/dev/init_8cpp.html#ae9e290a0e829ec0198518de2eda579d1)
  : Loads blocks from `blk*.dat` files or `-loadblock=<file>` on startup.

- [ThreadScriptCheck (`b-scriptch.x`)](https://www.bitcoinabc.org/doc/dev/validation_8cpp.html#a925a33e7952a157922b0bbb8dab29a20)
  : Parallel script validation threads for transactions in blocks.

- [ThreadHTTP (`b-http`)](https://www.bitcoinabc.org/doc/dev/httpserver_8cpp.html#abb9f6ea8819672bd9a62d3695070709c)
  : Libevent thread to listen for RPC and REST connections.

- [HTTP worker threads(`b-httpworker.x`)](https://www.bitcoinabc.org/doc/dev/httpserver_8cpp.html#aa6a7bc27265043bc0193220c5ae3a55f)
  : Threads to service RPC and REST requests.

- [Indexer threads (`b-txindex`, etc)](https://www.bitcoinabc.org/doc/dev/class_base_index.html#a96a7407421fbf877509248bbe64f8d87)
  : One thread per indexer.

- [SchedulerThread (`b-scheduler`)](https://www.bitcoinabc.org/doc/dev/class_c_scheduler.html#a14d2800815da93577858ea078aed1fba)
  : Does asynchronous background tasks like dumping wallet contents, dumping
  addrman and running asynchronous validationinterface callbacks.

- [TorControlThread (`b-torcontrol`)](https://www.bitcoinabc.org/doc/dev/torcontrol_8cpp.html#a4faed3692d57a0d7bdbecf3b37f72de0)
  : Libevent thread for tor connections.

- Net threads:

  - [ThreadMessageHandler (`b-msghand`)](https://www.bitcoinabc.org/doc/dev/class_c_connman.html#aacdbb7148575a31bb33bc345e2bf22a9)
    : Application level message handling (sending and receiving). Almost
    all net_processing and validation logic runs on this thread.

  - [ThreadDNSAddressSeed (`b-dnsseed`)](https://www.bitcoinabc.org/doc/dev/class_c_connman.html#aa7c6970ed98a4a7bafbc071d24897d13)
    : Loads addresses of peers from the DNS.

  - [ThreadMapPort (`b-upnp`)](https://www.bitcoinabc.org/doc/dev/net_8cpp.html#a63f82a71c4169290c2db1651a9bbe249)
    : Universal plug-and-play startup/shutdown.

  - [ThreadSocketHandler (`b-net`)](https://www.bitcoinabc.org/doc/dev/class_c_connman.html#a765597cbfe99c083d8fa3d61bb464e34)
    : Sends/Receives data from peers on port 8333.

  - [ThreadOpenAddedConnections (`b-addcon`)](https://www.bitcoinabc.org/doc/dev/class_c_connman.html#a0b787caf95e52a346a2b31a580d60a62)
    : Opens network connections to added nodes.

  - [ThreadOpenConnections (`b-opencon`)](https://www.bitcoinabc.org/doc/dev/class_c_connman.html#a55e9feafc3bab78e5c9d408c207faa45)
    : Initiates new connections to peers.

Ignoring IDE/editor files
--------------------------

In closed-source environments in which everyone uses the same IDE it is common
to add temporary files it produces to the project-wide `.gitignore` file.

However, in open source software such as Bitcoin ABC, where everyone uses
their own editors/IDE/tools, it is less common. Only you know what files your
editor produces and this may change from version to version. The canonical way
to do this is thus to create your local gitignore. Add this to `~/.gitconfig`:

```
[core]
        excludesfile = /home/.../.gitignore_global
```

(alternatively, type the command `git config --global core.excludesfile ~/.gitignore_global`
on a terminal)

Then put your favorite tool's temporary filenames in that file, e.g.
```
# NetBeans
nbproject/
```

Another option is to create a per-repository excludes file `.git/info/exclude`.
These are not committed but apply only to one repository.

If a set of tools is used by the build system or scripts the repository (for
example, lcov) it is perfectly acceptable to add its files to `.gitignore`
and commit them.

Development guidelines
============================

A few non-style-related recommendations for developers, as well as points to
pay attention to for reviewers of Bitcoin ABC code.

Wallet
-------

- Make sure that no crashes happen with run-time option `-disablewallet`.

  - *Rationale*: In RPC code that conditionally uses the wallet (such as
    `validateaddress`) it is easy to forget that global pointer `pwalletMain`
    can be NULL. See `test/functional/disablewallet.py` for functional tests
    exercising the API with `-disablewallet`

- Include `db_cxx.h` (BerkeleyDB header) only when `ENABLE_WALLET` is set

  - *Rationale*: Otherwise compilation of the disable-wallet build will fail in environments without BerkeleyDB

General C++
-------------

- Assertions should not have side-effects

  - *Rationale*: Even though the source code is set to refuse to compile
    with assertions disabled, having side-effects in assertions is unexpected and
    makes the code harder to understand

- If you use the `.h`, you must link the `.cpp`

  - *Rationale*: Include files define the interface for the code in implementation files. Including one but
      not linking the other is confusing. Please avoid that. Moving functions from
      the `.h` to the `.cpp` should not result in build errors

- Use the RAII (Resource Acquisition Is Initialization) paradigm where possible. For example by using
  `unique_ptr` for allocations in a function.

  - *Rationale*: This avoids memory and resource leaks, and ensures exception safety

- Use `std::make_unique()` to construct objects owned by `unique_ptr`s

  - *Rationale*: `std::make_unique` is concise and ensures exception safety in complex expressions.

C++ data structures
--------------------

- Never use the `std::map []` syntax when reading from a map, but instead use `.find()`

  - *Rationale*: `[]` does an insert (of the default element) if the item doesn't
    exist in the map yet. This has resulted in memory leaks in the past, as well as
    race conditions (expecting read-read behavior). Using `[]` is fine for *writing* to a map

- Do not compare an iterator from one data structure with an iterator of
  another data structure (even if of the same type)

  - *Rationale*: Behavior is undefined. In C++ parlor this means "may reformat
    the universe", in practice this has resulted in at least one hard-to-debug crash bug

- Watch out for out-of-bounds vector access. `&vch[vch.size()]` is illegal,
  including `&vch[0]` for an empty vector. Use `vch.data()` and `vch.data() +
  vch.size()` instead.

- Vector bounds checking is only enabled in debug mode. Do not rely on it

- Initialize all non-static class members where they are defined.
  If this is skipped for a good reason (i.e., optimization on the critical
  path), add an explicit comment about this

  - *Rationale*: Ensure determinism by avoiding accidental use of uninitialized
    values. Also, static analyzers balk about this.
    Initializing the members in the declaration makes it easy to
    spot uninitialized ones.

```cpp
class A
{
    uint32_t m_count{0};
}
```

- By default, declare single-argument constructors `explicit`.

  - *Rationale*: This is a precaution to avoid unintended conversions that might
    arise when single-argument constructors are used as implicit conversion
    functions.

- Use explicitly signed or unsigned `char`s, or even better `uint8_t` and
  `int8_t`. Do not use bare `char` unless it is to pass to a third-party API.
  This type can be signed or unsigned depending on the architecture, which can
  lead to interoperability problems or dangerous conditions such as
  out-of-bounds array accesses

- Prefer explicit constructions over implicit ones that rely on 'magical' C++ behavior

  - *Rationale*: Easier to understand what is happening, thus easier to spot mistakes, even for those
  that are not language lawyers

- Use `Span` as function argument when it can operate on any range-like container.

  - *Rationale*: Compared to `Foo(const vector<int>&)` this avoids the need for a (potentially expensive)
    conversion to vector if the caller happens to have the input stored in another type of container.
    However, be aware of the pitfalls documented in [span.h](../src/span.h).

```cpp
void Foo(Span<const int> data);

std::vector<int> vec{1,2,3};
Foo(vec);
```

Strings and formatting
------------------------

- Use `std::string`, avoid C string manipulation functions

  - *Rationale*: C++ string handling is marginally safer, less scope for
    buffer overflows and surprises with `\0` characters. Also some C string manipulations
    tend to act differently depending on platform, or even the user locale

- Use `ParseInt32`, `ParseInt64`, `ParseUInt32`, `ParseUInt64`, `ParseDouble` from `utilstrencodings.h` for number parsing

  - *Rationale*: These functions do overflow checking, and avoid pesky locale issues

Variable names
--------------

The shadowing warning (`-Wshadow`) is enabled by default. It prevents issues rising
from using a different variable with the same name.

E.g. in member initializers, prepend `_` to the argument name shadowing the
member name:

```c++
class AddressBookPage
{
    Mode m_mode;
}

AddressBookPage::AddressBookPage(Mode _mode) :
      m_mode(_mode)
...
```

When using nested cycles, do not name the inner cycle variable the same as in
upper cycle etc.

Please name variables so that their names do not shadow variables defined in the source code.

Threads and synchronization
----------------------------

- Prefer `Mutex` type to `RecursiveMutex` one

- Consistently use [Clang Thread Safety Analysis](https://clang.llvm.org/docs/ThreadSafetyAnalysis.html) annotations to
  get compile-time warnings about potential race conditions or deadlocks in code.

  - In functions that are declared separately from where they are defined, the
    thread safety annotations should be added exclusively to the function
    declaration, to avoid shadowing the declaration's annotation and cause false
    positives (lack of compile failure) if a new lock requirement is later added
    to the declaration but the lock is not taken.

  - Prefer locks that are in a class rather than global, and that are
    internal to a class (private or protected) rather than public.

  - Combine annotations in function declarations with run-time asserts in
    function definitions:

```C++
// txmempool.h
class CTxMemPool {
public:
    ...
    mutable RecursiveMutex cs;
    ...
    void UpdateTransactionsFromBlock(...) EXCLUSIVE_LOCKS_REQUIRED(::cs_main, cs);
    ...
}

// txmempool.cpp
void CTxMemPool::UpdateTransactionsFromBlock(...) {
    AssertLockHeld(::cs_main);
    AssertLockHeld(cs);
    ...
}
```

```C++
// validation.h
class CChainState {
protected:
    ...
    Mutex m_chainstate_mutex;
    ...
public:
    ...
    bool ActivateBestChain(
        BlockValidationState& state,
        std::shared_ptr<const CBlock> pblock = nullptr)
        EXCLUSIVE_LOCKS_REQUIRED(!m_chainstate_mutex)
        LOCKS_EXCLUDED(::cs_main);
    ...
    bool PreciousBlock(BlockValidationState& state, CBlockIndex* pindex)
        EXCLUSIVE_LOCKS_REQUIRED(!m_chainstate_mutex)
        LOCKS_EXCLUDED(::cs_main);
    ...
}

// validation.cpp
bool CChainState::PreciousBlock(BlockValidationState& state, CBlockIndex* pindex) {
    AssertLockNotHeld(m_chainstate_mutex);
    AssertLockNotHeld(::cs_main);
    {
        LOCK(cs_main);
        ...
    }

    return ActivateBestChain(state, std::shared_ptr<const CBlock>());
}
```

- Build and run tests with `-DDEBUG_LOCKORDER` to verify that no potential
  deadlocks are introduced. As of 0.12, this is defined by default when
  configuring with `-DCMAKE_BUILD_TYPE=Debug`

- When using `LOCK`/`TRY_LOCK` be aware that the lock exists in the context of
  the current scope, so surround the statement and the code that needs the lock
  with braces

  OK:

```c++
{
    TRY_LOCK(cs_vNodes, lockNodes);
    ...
}
```

  Wrong:

```c++
TRY_LOCK(cs_vNodes, lockNodes);
{
    ...
}
```

Scripts
--------------------------
### Shebang
- Use `#!/usr/bin/env bash` instead of obsolete `#!/bin/bash`.
  - [*Rationale*](https://github.com/dylanaraps/pure-bash-bible#shebang):
    `#!/bin/bash` assumes it is always installed to /bin/ which can cause issues;
    `#!/usr/bin/env bash` searches the user's PATH to find the bash binary.
  OK:
```bash
#!/usr/bin/env bash
```
  Wrong:
```bash
#!/bin/bash
```

Source code organization
--------------------------

- Implementation code should go into the `.cpp` file and not the `.h`, unless necessary due to template usage or
  when performance due to inlining is critical

  - *Rationale*: Shorter and simpler header files are easier to read, and reduce compile time

- Use only the lowercase alphanumerics (`a-z0-9`), underscore (`_`) and hyphen (`-`) in source code filenames.

  - *Rationale*: `grep`:ing and auto-completing filenames is easier when using a consistent
    naming pattern. Potential problems when building on case-insensitive filesystems are
    avoided when using only lowercase characters in source code filenames.

- Don't import anything into the global namespace (`using namespace ...`). Use
  fully specified types such as `std::string`.

  - *Rationale*: Avoids symbol conflicts

- Terminate namespaces with a comment (`// namespace mynamespace`). The comment
  should be placed on the same line as the brace closing the namespace, e.g.

```c++
namespace mynamespace {
    ...
} // namespace mynamespace

namespace {
    ...
} // namespace
```

  - *Rationale*: Avoids confusion about the namespace context

Header Inclusions
-----------------

  - Header inclusions should use angle brackets (`#include <>`).
  The include path should be relative to the `src` folder.
  e.g.: `#include <qt/test/guiutiltests.h>`

  - Native C++ headers should be preferred over C compatibility headers.
  e.g.: use `<cstdint>` instead of `<stdint.h>`

  - In order to make the code consistent, header files should be included in the following order, with each
  section separated by a newline:
    1. In a .cpp file, the associated .h is in first position. In a test source, this is the header file under test.
    2. The project headers.
    3. The test headers.
    4. The 3rd party libraries headers. Different libraries should be in different sections.
    5. The system libraries.

All headers should be lexically ordered inside their block.

- Use include guards to avoid the problem of double inclusion. The header file
  `foo/bar.h` should use the include guard identifier `BITCOIN_FOO_BAR_H`, e.g.

```c++
#ifndef BITCOIN_FOO_BAR_H
#define BITCOIN_FOO_BAR_H
...
#endif // BITCOIN_FOO_BAR_H
```

GUI
-----

- Do not display or manipulate dialogs in model code (classes `*Model`)

  - *Rationale*: Model classes pass through events and data from the core, they
    should not interact with the user. That's where View classes come in. The converse also
    holds: try to not directly access core data structures from Views.

- Avoid adding slow or blocking code in the GUI thread. In particular do not
  add new `interface::Node` and `interface::Wallet` method calls, even if they
  may be fast now, in case they are changed to lock or communicate across
  processes in the future.

  Prefer to offload work from the GUI thread to worker threads (see
  `RPCExecutor` in console code as an example) or take other steps (see
  <https://doc.qt.io/archives/qq/qq27-responsive-guis.html>) to keep the GUI
  responsive.

  - *Rationale*: Blocking the GUI thread can increase latency, and lead to
    hangs and deadlocks.

Unit Tests
-----------
 - Test suite naming convention: The Boost test suite in file
   `src/test/foo_tests.cpp` should be named `foo_tests`. Test suite names must
   be unique.

Third party libraries
---------------------

Several parts of the repository are software maintained elsewhere.

Changes to these should preferably be sent upstream but bugfixes may also be
submitted to Bitcoin ABC so that they can be integrated quickly.
Cosmetic changes should be purely taken upstream.

Current third party libraries include:

- src/leveldb
  - Upstream at <https://github.com/google/leveldb> ; Maintained by Google.
  - **Note**: Follow the instructions in [Upgrading LevelDB](#upgrading-leveldb)
    when merging upstream changes to Bitcoin ABC.

- src/secp256k1
  - Upstream at <https://github.com/bitcoin-core/secp256k1/> ; actively maintained
    by Bitcoin Core contributors.
    Bitcoin ABC is using a modified version of libsecp256k1, some changes might
    be directly submitted to Bitcoin ABC.
    See the [secp256k1 README](../src/secp256k1/README.md) for details.

- src/crypto/ctaes
  - Upstream at https://github.com/bitcoin-core/ctaes ; maintained by Bitcoin
    Core contributors.

- src/univalue
  - Upstream at https://github.com/bitcoin-core/univalue ; actively maintained by
    Bitcoin Core contributors, deviates from upstream https://github.com/jgarzik/univalue

Upgrading LevelDB
---------------------

Extra care must be taken when upgrading LevelDB. This section explains issues
you must be aware of.

### File Descriptor Counts

In most configurations we use the default LevelDB value for `max_open_files`,
which is 1000 at the time of this writing. If LevelDB actually uses this many
file descriptors it will cause problems with Bitcoin's `select()` loop, because
it may cause new sockets to be created where the fd value is >= 1024. For this
reason, on 64-bit Unix systems we rely on an internal LevelDB optimization that
uses `mmap()` + `close()` to open table files without actually retaining
references to the table file descriptors. If you are upgrading LevelDB, you must
sanity check the changes to make sure that this assumption remains valid.

In addition to reviewing the upstream changes in `env_posix.cc`, you can use `lsof` to
check this. For example, on Linux this command will show open `.ldb` file counts:

```bash
$ lsof -p $(pidof bitcoind) |\
    awk 'BEGIN { fd=0; mem=0; } /ldb$/ { if ($4 == "mem") mem++; else fd++ } END { printf "mem = %s, fd = %s\n", mem, fd}'
mem = 119, fd = 0
```

The `mem` value shows how many files are mmap'ed, and the `fd` value shows you
many file descriptors these files are using. You should check that `fd` is a
small number (usually 0 on 64-bit hosts).

See the notes in the `SetMaxOpenFiles()` function in `dbwrapper.cc` for more
details.

### Consensus Compatibility

It is possible for LevelDB changes to inadvertently change consensus
compatibility between nodes. This happened in Bitcoin 0.8 (when LevelDB was
first introduced). When upgrading LevelDB you should review the upstream changes
to check for issues affecting consensus compatibility.

For example, if LevelDB had a bug that accidentally prevented a key from being
returned in an edge case, and that bug was fixed upstream, the bug "fix" would
be an incompatible consensus change. In this situation the correct behavior
would be to revert the upstream fix before applying the updates to Bitcoin ABC's
copy of LevelDB. In general you should be wary of any upstream changes affecting
what data is returned from LevelDB queries.

Git and GitHub tips
---------------------

- Github is not typically the source of truth for pull requests.  See [CONTRIBUTING](../CONTRIBUTING.md) for instructions
  on setting up your repo correctly.

- Similarly, your git remote origin should be set to: `ssh://vcs@reviews.bitcoinabc.org:2221/source/bitcoin-abc.git`
  instead of github.com. See [CONTRIBUTING](../CONTRIBUTING.md).

For git and GitHub productivity tips, see [Productivity Notes](productivity.md).


Release notes
-------------

Release notes should be written for any PR that:

- introduces a notable new feature
- fixes a significant bug
- changes an API or configuration model
- makes any other visible change to the end-user experience.

Release notes should be added to the [/doc/release-notes.md](/doc/release-notes.md)
file, which is archived and cleared after each release.

RPC interface guidelines
--------------------------

A few guidelines for introducing and reviewing new RPC interfaces:

- Method naming: use consecutive lower-case names such as `getrawtransaction` and `submitblock`

  - *Rationale*: Consistency with existing interface.

- Argument naming: use snake case `fee_delta` (and not, e.g. camel case `feeDelta`)

  - *Rationale*: Consistency with existing interface.

- Use the JSON parser for parsing, don't manually parse integers or strings from
  arguments unless absolutely necessary.

  - *Rationale*: Introduces hand-rolled string manipulation code at both the caller and callee sites,
    which is error prone, and it is easy to get things such as escaping wrong.
    JSON already supports nested data structures, no need to re-invent the wheel.

  - *Exception*: AmountFromValue can parse amounts as string. This was introduced because many JSON
    parsers and formatters hard-code handling decimal numbers as floating point
    values, resulting in potential loss of precision. This is unacceptable for
    monetary values. **Always** use `AmountFromValue` and `ValueFromAmount` when
    inputting or outputting monetary values. The only exceptions to this are
    `prioritisetransaction` and `getblocktemplate` because their interface
    is specified as-is in BIP22.

- Missing arguments and 'null' should be treated the same: as default values. If there is no
  default value, both cases should fail in the same way. The easiest way to follow this
  guideline is detect unspecified arguments with `params[x].isNull()` instead of
  `params.size() <= x`. The former returns true if the argument is either null or missing,
  while the latter returns true if is missing, and false if it is null.

  - *Rationale*: Avoids surprises when switching to name-based arguments. Missing name-based arguments
  are passed as 'null'.

- Try not to overload methods on argument type. E.g. don't make `getblock(true)` and `getblock("hash")`
  do different things.

  - *Rationale*: This is impossible to use with `bitcoin-cli`, and can be surprising to users.

  - *Exception*: Some RPC calls can take both an `int` and `bool`, most notably when a bool was switched
    to a multi-value, or due to other historical reasons. **Always** have false map to 0 and
    true to 1 in this case.

- Don't forget to fill in the argument names correctly in the RPC command table.

  - *Rationale*: If not, the call can not be used with name-based arguments.

- Set okSafeMode in the RPC command table to a sensible value: safe mode is when the
  blockchain is regarded to be in a confused state, and the client deems it unsafe to
  do anything irreversible such as send. Anything that just queries should be permitted.

  - *Rationale*: Troubleshooting a node in safe mode is difficult if half the
    RPCs don't work.

- Add every non-string RPC argument `(method, idx, name)` to the table `vRPCConvertParams` in `rpc/client.cpp`.

  - *Rationale*: `bitcoin-cli` and the GUI debug console use this table to determine how to
    convert a plaintext command line to JSON. If the types don't match, the method can be unusable
    from there.

- A RPC method must either be a wallet method or a non-wallet method. Do not
  introduce new methods such as `signrawtransaction` that differ in behavior
  based on presence of a wallet.

  - *Rationale*: As well as complicating the implementation and interfering
    with the introduction of multi-wallet, wallet and non-wallet code should be
    separated to avoid introducing circular dependencies between code units.

- Try to make the RPC response a JSON object.

  - *Rationale*: If a RPC response is not a JSON object then it is harder to avoid API breakage if
    new data in the response is needed.

- Wallet RPCs call BlockUntilSyncedToCurrentChain to maintain consistency with
  `getblockchaininfo`'s state immediately prior to the call's execution. Wallet
  RPCs whose behavior does *not* depend on the current chainstate may omit this
  call.

  - *Rationale*: In previous versions of Bitcoin Core, the wallet was always
    in-sync with the chainstate (by virtue of them all being updated in the
    same cs_main lock). In order to maintain the behavior that wallet RPCs
    return results as of at least the highest best-known block an RPC
    client may be aware of prior to entering a wallet RPC call, we must block
    until the wallet is caught up to the chainstate as of the RPC call's entry.
    This also makes the API much easier for RPC clients to reason about.

- Be aware of RPC method aliases and generally avoid registering the same
  callback function pointer for different RPCs.

  - *Rationale*: RPC methods registered with the same function pointer will be
    considered aliases and only the first method name will show up in the
    `help` RPC command list.

  - *Exception*: Using RPC method aliases may be appropriate in cases where a
    new RPC is replacing a deprecated RPC, to avoid both RPCs confusingly
    showing up in the command list.

- Use the `UNIX_EPOCH_TIME` constant when describing UNIX epoch time or
  timestamps in the documentation.

  - *Rationale*: User-facing consistency.

- Use `fs::path::u8string()` and `fs::u8path()` functions when converting path
  to JSON strings, not `fs::PathToString` and `fs::PathFromString`

  - *Rationale*: JSON strings are Unicode strings, not byte strings, and
    RFC8259 requires JSON to be encoded as UTF-8.

Internal interface guidelines
-----------------------------

Internal interfaces between parts of the codebase that are meant to be
independent (node, wallet, GUI), are defined in
[`src/interfaces/`](../src/interfaces/). The main interface classes defined
there are [`interfaces::Chain`](../src/interfaces/chain.h), used by wallet to
access the node's latest chain state,
[`interfaces::Node`](../src/interfaces/node.h), used by the GUI to control the
node, and [`interfaces::Wallet`](../src/interfaces/wallet.h), used by the GUI
to control an individual wallet. There are also more specialized interface
types like [`interfaces::Handler`](../src/interfaces/handler.h)
[`interfaces::ChainClient`](../src/interfaces/chain.h) passed to and from
various interface methods.

Interface classes are written in a particular style so node, wallet, and GUI
code doesn't need to run in the same process, and so the class declarations
work more easily with tools and libraries supporting interprocess
communication:

- Interface classes should be abstract and have methods that are [pure
  virtual](https://en.cppreference.com/w/cpp/language/abstract_class). This
  allows multiple implementations to inherit from the same interface class,
  particularly so one implementation can execute functionality in the local
  process, and other implementations can forward calls to remote processes.

- Interface method definitions should wrap existing functionality instead of
  implementing new functionality. Any substantial new node or wallet
  functionality should be implemented in [`src/node/`](../src/node/) or
  [`src/wallet/`](../src/wallet/) and just exposed in
  [`src/interfaces/`](../src/interfaces/) instead of being implemented there,
  so it can be more modular and accessible to unit tests.

- Interface method parameter and return types should either be serializable or
  be other interface classes. Interface methods shouldn't pass references to
  objects that can't be serialized or accessed from another process.

  Examples:

  ```c++
  // Good: takes string argument and returns interface class pointer
  virtual unique_ptr<interfaces::Wallet> loadWallet(std::string filename) = 0;

  // Bad: returns CWallet reference that can't be used from another process
  virtual CWallet& loadWallet(std::string filename) = 0;
  ```

  ```c++
  // Good: accepts and returns primitive types
  virtual bool findBlock(const uint256& hash, int& out_height, int64_t& out_time) = 0;

  // Bad: returns pointer to internal node in a linked list inaccessible to
  // other processes
  virtual const CBlockIndex* findBlock(const uint256& hash) = 0;
  ```

  ```c++
  // Good: takes plain callback type and returns interface pointer
  using TipChangedFn = std::function<void(int block_height, int64_t block_time)>;
  virtual std::unique_ptr<interfaces::Handler> handleTipChanged(TipChangedFn fn) = 0;

  // Bad: returns boost connection specific to local process
  using TipChangedFn = std::function<void(int block_height, int64_t block_time)>;
  virtual boost::signals2::scoped_connection connectTipChanged(TipChangedFn fn) = 0;
  ```

- For consistency and friendliness to code generation tools, interface method
  input and inout parameters should be ordered first and output parameters
  should come last.

  Example:

  ```c++
  // Good: error output param is last
  virtual bool broadcastTransaction(const CTransactionRef& tx, CAmount max_fee, std::string& error) = 0;

  // Bad: error output param is between input params
  virtual bool broadcastTransaction(const CTransactionRef& tx, std::string& error, CAmount max_fee) = 0;
  ```

- For friendliness to code generation tools, interface methods should not be
  overloaded:

  Example:

  ```c++
  // Good: method names are unique
  virtual bool disconnectByAddress(const CNetAddr& net_addr) = 0;
  virtual bool disconnectById(NodeId id) = 0;

  // Bad: methods are overloaded by type
  virtual bool disconnect(const CNetAddr& net_addr) = 0;
  virtual bool disconnect(NodeId id) = 0;
  ```

- For consistency and friendliness to code generation tools, interface method
  names should be `lowerCamelCase` and standalone function names should be
  `UpperCamelCase`.

  Examples:

  ```c++
  // Good: lowerCamelCase method name
  virtual void blockConnected(const CBlock& block, int height) = 0;

  // Bad: uppercase class method
  virtual void BlockConnected(const CBlock& block, int height) = 0;
  ```

  ```c++
  // Good: UpperCamelCase standalone function name
  std::unique_ptr<Node> MakeNode(LocalInit& init);

  // Bad: lowercase standalone function
  std::unique_ptr<Node> makeNode(LocalInit& init);
  ```

  Note: This last convention isn't generally followed outside of
  [`src/interfaces/`](../src/interfaces/), though it did come up for discussion
  before in [#14635](https://github.com/bitcoin/bitcoin/pull/14635).
