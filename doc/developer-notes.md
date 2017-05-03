Developer Notes
===============

Various coding styles have been used during the history of the codebase,
and the result is not very consistent. However, we're now trying to converge to
a single style, so please use it in new code. Old code will be converted
gradually and you are encouraged to use the provided
[clang-format-diff script](/contrib/devtools/README.md#clang-format-diffpy)
to clean up the patch automatically before submitting a pull request.

- Basic rules specified in [src/.clang-format](/src/.clang-format).
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
}
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
A complete list of `@xxx` commands can be found at http://www.stack.nl/~dimitri/doxygen/manual/commands.html.
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

A full list of comment syntaxes picked up by doxygen can be found at http://www.stack.nl/~dimitri/doxygen/manual/docblocks.html,
but if possible use one of the above styles.

To build doxygen locally to test changes to the Doxyfile or visualize your comments before landing changes:
```
# at the project root, call:
doxygen doc/Doxyfile
# output goes to doc/doxygen/html/
```

Development tips and tricks
---------------------------

**compiling for debugging**

Run configure with the --enable-debug option, then make. Or run configure with
CXXFLAGS="-g -ggdb -O0" or whatever debug flags you need.

**debug.log**

If the code is behaving strangely, take a look in the debug.log file in the data directory;
error and debugging messages are written there.

The -debug=... command-line option controls debugging; running with just -debug or -debug=1 will turn
on all categories (and give you a very large debug.log file).

The Qt code routes qDebug() output to debug.log under category "qt": run with -debug=qt
to see it.

**writing tests**

For details on unit tests, see `unit-tests.md`

For details on functional tests, see `functional-tests.md`

**writing script integration tests**

Script integration tests are built using `src/test/script_tests.cpp`:

1. Uncomment the line with `#define UPDATE_JSON_TESTS`
2. Add a new TestBuilder to the `script_build` test to cover your test case.
3. `make && ./src/test/test_bitcoin --run_test=script_tests`
4. Copy your newly generated test JSON from `<build-dir>/src/script_tests.json.gen` to `src/test/data/script_tests.json`.

Please commit your TestBuilder along with your generated test JSON and cleanup the uncommented #define before code review.

**testnet and regtest modes**

Run with the -testnet option to run with "play bitcoins" on the test network, if you
are testing multi-machine code that needs to operate across the internet.

If you are testing something that can run on one machine, run with the -regtest option.
In regression test mode, blocks can be created on-demand; see test/functional/ for tests
that run in -regtest mode.

**DEBUG_LOCKORDER**

Bitcoin Core is a multithreaded application, and deadlocks or other multithreading bugs
can be very difficult to track down. Compiling with -DDEBUG_LOCKORDER (configure
CXXFLAGS="-DDEBUG_LOCKORDER -g") inserts run-time checks to keep track of which locks
are held, and adds warnings to the debug.log file if inconsistencies are detected.

**Sanitizers**

Bitcoin can be compiled with various "sanitizers" enabled, which add
instrumentation for issues regarding things like memory safety, thread race
conditions, or undefined behavior. This is controlled with the
`--with-sanitizers` configure flag, which should be a comma separated list of
sanitizers to enable. The sanitizer list should correspond to supported
`-fsanitize=` options in your compiler. These sanitizers have runtime overhead,
so they are most useful when testing changes or producing debugging builds.

Some examples:

```bash
# Enable both the address sanitizer and the undefined behavior sanitizer
./configure --with-sanitizers=address,undefined

# Enable the thread sanitizer
./configure --with-sanitizers=thread
```

If you are compiling with GCC you will typically need to install corresponding
"san" libraries to actually compile with these flags, e.g. libasan for the
address sanitizer, libtsan for the thread sanitizer, and libubsan for the
undefined sanitizer. If you are missing required libraries, the configure script
will fail with a linker error when testing the sanitizer flags.

The test suite should pass cleanly with the `thread` and `undefined` sanitizers,
but there are a number of known problems when using the `address` sanitizer. The
address sanitizer is known to fail in
[sha256_sse4::Transform](/src/crypto/sha256_sse4.cpp) which makes it unusable
unless you also use `--disable-asm` when running configure. We would like to fix
sanitizer issues, so please send pull requests if you can fix any errors found
by the address sanitizer (or any other sanitizer).

Not all sanitizer options can be enabled at the same time, e.g. trying to build
with `--with-sanitizers=address,thread` will fail in the configure script as
these sanitizers are mutually incompatible. Refer to your compiler manual to
learn more about these options and which sanitizers are supported by your
compiler.

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
LOCK/TRY_LOCK macros to protect data structures.

Deadlocks due to inconsistent lock ordering (thread 1 locks cs_main
and then cs_wallet, while thread 2 locks them in the opposite order:
result, deadlock as each waits for the other to release its lock) are
a problem. Compile with -DDEBUG_LOCKORDER to get lock order
inconsistencies reported in the debug.log file.

Re-architecting the core code so there are better-defined interfaces
between the various components is a goal, with any necessary locking
done by the components (e.g. see the self-contained CKeyStore class
and its cs_KeyStore lock for example).

Threads
-------

- ThreadScriptCheck : Verifies block scripts.

- ThreadImport : Loads blocks from blk*.dat files or bootstrap.dat.

- StartNode : Starts other threads.

- ThreadDNSAddressSeed : Loads addresses of peers from the DNS.

- ThreadMapPort : Universal plug-and-play startup/shutdown

- ThreadSocketHandler : Sends/Receives data from peers on port 8333.

- ThreadOpenAddedConnections : Opens network connections to added nodes.

- ThreadOpenConnections : Initiates new connections to peers.

- ThreadMessageHandler : Higher-level message handling (sending and receiving).

- DumpAddresses : Dumps IP addresses of nodes to peers.dat.

- ThreadFlushWalletDB : Close the wallet.dat file if it hasn't been used in 500ms.

- ThreadRPCServer : Remote procedure call handler, listens on port 8332 for connections and services them.

- BitcoinMiner : Generates bitcoins (if wallet is enabled).

- Shutdown : Does an orderly shutdown of everything.

Ignoring IDE/editor files
--------------------------

In closed-source environments in which everyone uses the same IDE it is common
to add temporary files it produces to the project-wide `.gitignore` file.

However, in open source software such as Bitcoin Core, where everyone uses
their own editors/IDE/tools, it is less common. Only you know what files your
editor produces and this may change from version to version. The canonical way
to do this is thus to create your local gitignore. Add this to `~/.gitconfig`:

```
[core]
        excludesfile = /home/.../.gitignore_global
```

(alternatively, type the command `git config --global core.excludesfile ~/.gitignore_global`
on a terminal)

Then put your favourite tool's temporary filenames in that file, e.g.
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
pay attention to for reviewers of Bitcoin Core code.

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

  - *Rationale*: Even though the source code is set to to refuse to compile
    with assertions disabled, having side-effects in assertions is unexpected and
    makes the code harder to understand

- If you use the `.h`, you must link the `.cpp`

  - *Rationale*: Include files define the interface for the code in implementation files. Including one but
      not linking the other is confusing. Please avoid that. Moving functions from
      the `.h` to the `.cpp` should not result in build errors

- Use the RAII (Resource Acquisition Is Initialization) paradigm where possible. For example by using
  `unique_ptr` for allocations in a function.

  - *Rationale*: This avoids memory and resource leaks, and ensures exception safety

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

- Make sure that constructors initialize all fields. If this is skipped for a
  good reason (i.e., optimization on the critical path), add an explicit
  comment about this

  - *Rationale*: Ensure determinism by avoiding accidental use of uninitialized
    values. Also, static analyzers balk about this.

- Use explicitly signed or unsigned `char`s, or even better `uint8_t` and
  `int8_t`. Do not use bare `char` unless it is to pass to a third-party API.
  This type can be signed or unsigned depending on the architecture, which can
  lead to interoperability problems or dangerous conditions such as
  out-of-bounds array accesses

- Prefer explicit constructions over implicit ones that rely on 'magical' C++ behavior

  - *Rationale*: Easier to understand what is happening, thus easier to spot mistakes, even for those
  that are not language lawyers

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

Please name variables so that their names do not shadow variables defined in the source code.

Threads and synchronization
----------------------------

- Build and run tests with `-DDEBUG_LOCKORDER` to verify that no potential
  deadlocks are introduced. As of 0.12, this is defined by default when
  configuring with `--enable-debug`

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

Source code organization
--------------------------

- Implementation code should go into the `.cpp` file and not the `.h`, unless necessary due to template usage or
  when performance due to inlining is critical

  - *Rationale*: Shorter and simpler header files are easier to read, and reduce compile time

- Don't import anything into the global namespace (`using namespace ...`). Use
  fully specified types such as `std::string`.

  - *Rationale*: Avoids symbol conflicts

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
  https://doc.qt.io/archives/qq/qq27-responsive-guis.html) to keep the GUI
  responsive.

  - *Rationale*: Blocking the GUI thread can increase latency, and lead to
    hangs and deadlocks.

Unit Tests
-----------
 - Test suite naming convention: The Boost test suite in file 
   `src/test/foo_tests.cpp` should be named `foo_tests`. Test suite names must
   be unique.

Subtrees
----------

Several parts of the repository are subtrees of software maintained elsewhere.

Some of these are maintained by active developers of Bitcoin Core, in which case changes should probably go
directly upstream without being PRed directly against the project.  They will be merged back in the next
subtree merge.

Others are external projects without a tight relationship with our project.  Changes to these should also
be sent upstream but bugfixes may also be prudent to PR against Bitcoin Core so that they can be integrated
quickly.  Cosmetic changes should be purely taken upstream.

There is a tool in contrib/devtools/git-subtree-check.sh to check a subtree directory for consistency with
its upstream repository.

Current subtrees include:

- src/leveldb
  - Upstream at https://github.com/google/leveldb ; Maintained by Google, but open important PRs to Core to avoid delay

- src/libsecp256k1
  - Upstream at https://github.com/bitcoin-core/secp256k1/ ; actively maintaned by Core contributors.

- src/crypto/ctaes
  - Upstream at https://github.com/bitcoin-core/ctaes ; actively maintained by Core contributors.

- src/univalue
  - Upstream at https://github.com/jgarzik/univalue ; report important PRs to Core to avoid delay.


Git and GitHub tips
---------------------

- Github is not typically the source of truth for pull requests.  See CONTRIBUTING.md for instructions
  on setting up your repo correctly.

- Similarly, your git remote origin should be set to: `ssh://vcs@reviews.bitcoinabc.org:2221/source/bitcoin-abc.git`
  instead of github.com.  See CONTRIBUTING.md for details.

- For resolving merge/rebase conflicts, it can be useful to enable diff3 style using
  `git config merge.conflictstyle diff3`. Instead of

        <<<
        yours
        ===
        theirs
        >>>

  you will see

        <<<
        yours
        |||
        original
        ===
        theirs
        >>>

  This may make it much clearer what caused the conflict. In this style, you can often just look
  at what changed between *original* and *theirs*, and mechanically apply that to *yours* (or the other way around).

- When reviewing patches which change indentation in C++ files, use `git diff -w` and `git show -w`. This makes
  the diff algorithm ignore whitespace changes. This feature is also available on github.com, by adding `?w=1`
  at the end of any URL which shows a diff.

- When reviewing patches that change symbol names in many places, use `git diff --word-diff`. This will instead
  of showing the patch as deleted/added *lines*, show deleted/added *words*.

- When reviewing patches that move code around, try using
  `git diff --patience commit~:old/file.cpp commit:new/file/name.cpp`, and ignoring everything except the
  moved body of code which should show up as neither `+` or `-` lines. In case it was not a pure move, this may
  even work when combined with the `-w` or `--word-diff` options described above.

- When looking at other's pull requests, it may make sense to add the following section to your `.git/config`
  file:

        [remote "upstream-pull"]
                fetch = +refs/pull/*:refs/remotes/upstream-pull/*
                url = git@github.com:bitcoin/bitcoin.git

  This will add an `upstream-pull` remote to your git repository, which can be fetched using `git fetch --all`
  or `git fetch upstream-pull`. Afterwards, you can use `upstream-pull/NUMBER/head` in arguments to `git show`,
  `git checkout` and anywhere a commit id would be acceptable to see the changes from pull request NUMBER.

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

  - *Rationale*: as well as complicating the implementation and interfering
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
