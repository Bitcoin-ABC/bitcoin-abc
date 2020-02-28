#!/usr/bin/env bash

# Note: Any bot running this script must have the appropriate permissions to
# push commits upstream. When running locally, this script will git push in a
# dry run by default.

export LC_ALL=C.UTF-8

set -euxo pipefail

DEFAULT_PARENT_COMMIT="origin/master"

help_message() {
  set +x
  echo "Generate a commit from available recipes."
  echo
  echo "Options:"
  echo "-p, --parent              The parent commit to build ontop of. Default: '${DEFAULT_PARENT_COMMIT}'"
  echo "                            Note: This should only be used for testing since the behavior of setting"
  echo "                            this to a particular commit varies slightly from the default."
  echo "-h, --help                Display this help message."
  echo
  echo "Environment Variables:"
  echo "COMMIT_TYPE               (required) The commit recipe to run."
  echo "DRY_RUN                   If set to 'no', this script will push the generated changes upstream. Default: 'yes'"
  set -x
}

PARENT_COMMIT="${DEFAULT_PARENT_COMMIT}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
case $1 in
  -p|--parent)
    PARENT_COMMIT=$(git rev-parse "$2")
    shift # shift past argument
    shift # shift past value
    ;;
  -h|--help)
    help_message
    exit 0
    ;;
  *)
    echo "Unknown argument: $1"
    help_message
    exit 1
    ;;
esac
done

: "${COMMIT_TYPE:=}"
if [ -z "${COMMIT_TYPE}" ]; then
  echo "Error: Environment variable COMMIT_TYPE must be set"
  exit 2
fi

GIT_PUSH_OPTIONS=("--verbose")
case ${DRY_RUN:=yes} in
  no|NO|false|FALSE)
    if [ "${PARENT_COMMIT}" != "${DEFAULT_PARENT_COMMIT}" ]; then
      echo "Error: Running with DRY_RUN=no on a commit parent other than '${DEFAULT_PARENT_COMMIT}'"
      exit 3
    fi
    ;;
  *)
    GIT_PUSH_OPTIONS+=("--dry-run")
    ;;
esac

echo "Building automated commit '${COMMIT_TYPE}'..."

BOT_PREFIX="[Automated]"
TOPLEVEL=$(git rev-parse --show-toplevel)

BUILD_DIR="${TOPLEVEL}"/build
mkdir -p "${BUILD_DIR}"
export BUILD_DIR

DEVTOOLS_DIR="${TOPLEVEL}"/contrib/devtools

# Make sure tree is clean
git checkout master
git reset --hard "${PARENT_COMMIT}"

case "${COMMIT_TYPE}" in
  update-chainparams)
    CHAINPARAMS_SCRIPTS_DIR="${DEVTOOLS_DIR}"/chainparams

    # Assumes bitcoind instances are already running on mainnet and testnet
    pushd "${CHAINPARAMS_SCRIPTS_DIR}"
    CHAINPARAMS_MAINNET_TXT="chainparams_main.txt"
    ./make_chainparams.py > "${CHAINPARAMS_MAINNET_TXT}"
    git add "${CHAINPARAMS_MAINNET_TXT}"

    CHAINPARAMS_TESTNET_TXT="chainparams_test.txt"
    ./make_chainparams.py -a 127.0.0.1:18332 > "${CHAINPARAMS_TESTNET_TXT}"
    git add "${CHAINPARAMS_TESTNET_TXT}"

    CHAINPARAMS_CONSTANTS="${TOPLEVEL}"/src/chainparamsconstants.h
    ./generate_chainparams_constants.py . > "${CHAINPARAMS_CONSTANTS}"
    git add "${CHAINPARAMS_CONSTANTS}"
    popd

    git commit -m "${BOT_PREFIX} Update chainparams"
    ;;

  update-manpages)
    # Unfortunately bitcoin-qt requires a handle on the DISPLAY, even for the
    # --help option. We can spoof an X window using xvfb.
    command -v xvfb-run > /dev/null || (echo "Error: Package 'xvfb' is needed to run bitcoin-qt headlessly." && exit 11)

    "${DEVTOOLS_DIR}"/build_cmake.sh
    BUILDDIR="${BUILD_DIR}" xvfb-run "${DEVTOOLS_DIR}"/gen-manpages.sh

    MANPAGES_DIR="${TOPLEVEL}"/doc/man

    # Sanity check that the current bitcoind version is in the manpages.
    # Note that this check could be more complex, checking that all version
    # instances match the current bitcoind version. But, it's impossible to
    # know if some other version number will appear in the help text due to
    # deprecation notices or otherwise.
    EXPECTED_VERSION=$("${BUILD_DIR}"/src/bitcoind --version | head -1 | grep -oE "v[0-9]+\.[0-9]+\.[0-9]+")
    grep "${EXPECTED_VERSION}" "${MANPAGES_DIR}"/*\.1

    # Sanity check that the version string was not dirty or that something
    # unexpected occurred.
    grep "${EXPECTED_VERSION}-dirty" "${MANPAGES_DIR}"/*\.1 && {
      echo "Error: Unexpected dirty version string."
      exit 12
    }
    grep "${EXPECTED_VERSION}-unk" "${MANPAGES_DIR}"/*\.1 && {
      echo "Error: Unknown error detected in version string."
      exit 13
    }

    git add "${MANPAGES_DIR}"/*\.1

    git commit -m "${BOT_PREFIX} Update manpages"
    ;;

  update-seeds)
    # Assumes seeder instances are already running on mainnet and testnet
    pushd "${TOPLEVEL}"/contrib/seeds
    : "${SEEDS_MAIN:=seeds_main.txt}"
    ./makeseeds.py < "${SEEDS_MAIN}" > nodes_main.txt
    git add nodes_main.txt

    : "${SEEDS_TEST:=seeds_test.txt}"
    ./makeseeds.py < "${SEEDS_TEST}" > nodes_test.txt
    git add nodes_test.txt

    SEEDS_HEADER="${TOPLEVEL}"/src/chainparamsseeds.h
    ./generate-seeds.py . > "${SEEDS_HEADER}"
    git add "${SEEDS_HEADER}"
    popd

    # Check that seeds have good connectivity
    "${DEVTOOLS_DIR}"/build_cmake.sh
    SEEDS_DIR="${TOPLEVEL}"/contrib/seeds
    RPC_PORT=18832 "${SEEDS_DIR}"/check-seeds.sh main 80
    RPC_PORT=18833 "${SEEDS_DIR}"/check-seeds.sh test 70

    git commit -m "${BOT_PREFIX} Update seeds"
    ;;

  update-timings)
    "${DEVTOOLS_DIR}"/build_cmake.sh
    pushd "${BUILD_DIR}"
    ninja check-functional-extended
    TIMING_SRC_FILE="${TOPLEVEL}"/test/functional/timing.json
    mv timing.json "${TIMING_SRC_FILE}"
    popd

    # Check that all tests are included in timing.json
    pushd "${TOPLEVEL}"/test/functional
    NON_TESTS=$(python3 -c 'from test_runner import NON_SCRIPTS; print(" ".join(NON_SCRIPTS))')
    export NON_TESTS
    check_missing() {
      # Exclude non-tests from the check
      if [[ "${NON_TESTS}" =~ $1 ]]; then
        exit 0
      fi

      if ! grep -q $1 timing.json ; then
        echo "Error: Test file '$1' is missing from timing.json"
        exit 1
      fi
    }
    export -f check_missing
    find . -maxdepth 1 -name '*.py' | cut -c 3- | xargs -I'{}' -n1 bash -c 'check_missing {}'
    popd

    git add "${TIMING_SRC_FILE}"

    git commit -m "${BOT_PREFIX} Update timing.json"
    ;;

  *)
    echo "Error: Invalid commit name '${COMMIT_TYPE}'"
    exit 10
    ;;
esac

echo "Sanity checks..."

LINT_OUTPUT=$(arc lint --never-apply-patches)
LINT_EXIT_CODE=$?
# If there is more than one line of output, then lint advice lines are likely present.
# We treat these as errors because code generators should always produce lint-free code.
LINT_NUM_LINES=$(echo ${LINT_OUTPUT} | wc -l)
if [ "${LINT_EXIT_CODE}" -ne 0 ] || [ "${LINT_NUM_LINES}" -gt 1 ]; then
  echo "Error: The linter found issues with the automated commit. Correct the issue in the code generator and try again."
  exit 20
fi

# Smoke tests to give some confidence that master won't be put into a bad state
pushd "${BUILD_DIR}"
"${DEVTOOLS_DIR}"/build_cmake.sh
ninja check-bitcoin check-functional
popd

echo "Pushing automated commit '${COMMIT_TYPE}'..."

# Make sure master is up-to-date. If there is a merge conflict, this script
# will not attempt to resolve it and simply fail.
git fetch origin master
git rebase "${PARENT_COMMIT}"

git push "${GIT_PUSH_OPTIONS[@]}" origin master
