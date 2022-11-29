Fuzz-testing Bitcoin ABC
==========================

A special test harness in `src/test/fuzz/` is provided for each fuzz target to
provide an easy entry point for fuzzers and the like. In this document we'll
describe how to use it with AFL and libFuzzer.

## Preparing fuzzing

The fuzzer needs some inputs to work on, but the inputs or seeds can be used
interchangeably between libFuzzer and AFL.

Extract the example seeds (or other starting inputs) into the inputs
directory before starting fuzzing.

```
git clone https://github.com/Bitcoin-ABC/qa-assets
export DIR_FUZZ_IN=$PWD/qa-assets/fuzz_seed_corpus
```

AFL needs an input directory with examples, and an output directory where it
will place examples that it found. These can be anywhere in the file system,
we'll define environment variables to make it easy to reference them.

So, only for AFL you need to configure the outputs path:

```
mkdir outputs
export AFLOUT=$PWD/outputs
```

libFuzzer will use the input directory as output directory.

## AFL

### Building AFL

It is recommended to always use the latest version of afl:
```
wget http://lcamtuf.coredump.cx/afl/releases/afl-latest.tgz
tar -zxvf afl-latest.tgz
cd afl-<version>
make
export AFLPATH=$PWD
```

### Instrumentation

To build Bitcoin ABC using AFL instrumentation (this assumes that the
`AFLPATH` was set as above):
```
mkdir -p buildFuzzer
cd buildFuzzer
cmake -GNinja .. -DCMAKE_C_COMPILER=afl-gcc -DCMAKE_CXX_COMPILER=afl-g++
export AFL_HARDEN=1
ninja bitcoin-fuzzers
```

For macOS you may need to ignore x86 compilation checks when running `ninja`:
`AFL_NO_X86=1 ninja bitcoin-fuzzers`.

If you are using clang you will need to substitute `afl-gcc` with `afl-clang`
and `afl-g++` with `afl-clang++`, so the `cmake` line above becomes:
```
cmake -GNinja .. -DCMAKE_C_COMPILER=afl-clang -DCMAKE_CXX_COMPILER=afl-clang++
```


The fuzzing can be sped up significantly (~200x) by using `afl-clang-fast` and
`afl-clang-fast++` in place of `afl-gcc` and `afl-g++` when compiling. When
compiling using `afl-clang-fast`/`afl-clang-fast++` the resulting
binary will be instrumented in such a way that the AFL features "persistent
mode" and "deferred forkserver" can be used.
See https://github.com/google/AFL/tree/master/llvm_mode for details.

### Fuzzing

To start the actual fuzzing use:

```
export FUZZ_TARGET=eval_script  # Pick a fuzz_target
mkdir ${AFLOUT}/${FUZZ_TARGET}
${AFLPATH}/afl-fuzz -i ${DIR_FUZZ_IN}/${FUZZ_TARGET} -o ${AFLOUT}/${FUZZ_TARGET} -m80 -- src/test/fuzz/${FUZZ_TARGET}
```

You may have to change a few kernel parameters to test optimally - `afl-fuzz`
will print an error and suggestion if so.

On macOS you may need to set `AFL_NO_FORKSRV=1` to get the target to run.
```
export FUZZ_TARGET=eval_script  # Pick a fuzz_target
mkdir ${AFLOUT}/${FUZZ_TARGET}
AFL_NO_FORKSRV=1 ${AFLPATH}/afl-fuzz -i ${DIR_FUZZ_IN}/${FUZZ_TARGET} -o ${AFLOUT}/${FUZZ_TARGET} -m80 -- src/test/fuzz/${FUZZ_TARGET}
```

## libFuzzer

A recent version of `clang`, the address/undefined sanitizers (ASan/UBSan) and
libFuzzer is needed (all found in the `compiler-rt` runtime libraries package).

To build all fuzz targets with libFuzzer, run

```
mkdir -p buildFuzzer
cd buildFuzzer
cmake -GNinja .. \
  -DCMAKE_C_COMPILER=clang \
  -DCMAKE_CXX_COMPILER=clang++ \
  -DENABLE_SANITIZERS="fuzzer;address;undefined"
ninja bitcoin-fuzzers
```

See https://llvm.org/docs/LibFuzzer.html#running on how to run the libFuzzer
instrumented executable.

Alternatively, you can run the script through the fuzzing test harness (only
libFuzzer supported so far). You need to pass it the inputs directory and
the specific test target you want to run.

```
./test/fuzz/test_runner.py ${DIR_FUZZ_IN} eval_script
```

### macOS hints for libFuzzer

The default clang/llvm version supplied by Apple on macOS does not include
fuzzing libraries, so macOS users will need to install a full version, for
example using `brew install llvm`.
This version has no support for the `lld` linker so you need to add
`-DUSE_LINKER=` to the `cmake` command line.

Should you run into problems with the address sanitizer, it is possible you
may need to run `cmake` with `-DCRYPTO_USE_ASM=OFF` to avoid errors with
certain assembly code from Bitcoin ABC's code.
See [developer notes on sanitizers](developer-notes.md#sanitizers) for more
information.

You may also need to take care of giving the correct path for clang and
clang++, like `-CMAKE_C_COMPILER=/path/to/clang -DCMAKE_CXX_COMPILER=/path/to/clang++`
if the non-systems clang does not come first in your path.

Full cmake that was tested on macOS Catalina with `brew` installed `llvm`:

```
cmake -GNinja .. \
  -DCMAKE_C_COMPILER=/usr/local/opt/llvm/bin/clang \
  -DCMAKE_CXX_COMPILER=/usr/local/opt/llvm/bin/clang++ \
  -DUSE_LINKER= \
  -DCRYPTO_USE_ASM=OFF \
  -DENABLE_SANITIZERS="fuzzer;address;undefined"
```
