#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

: "${SEEDS_MAIN:=seeds_main.txt}"
: "${SEEDS_TEST:=seeds_test.txt}"
TOPLEVEL=$(git rev-parse --show-toplevel)
SEEDS_DIR="${TOPLEVEL}"/contrib/seeds

# Assumes seeder instances are already running on mainnet and testnet
pushd "${SEEDS_DIR}"
./makeseeds.py < "${SEEDS_MAIN}" > nodes_main.txt
if [ -f extra_nodes_main.txt ]; then
  echo "# Manually added entries" >> nodes_main.txt
  cat extra_nodes_main.txt >> nodes_main.txt
fi
git add nodes_main.txt

./makeseeds.py < "${SEEDS_TEST}" > nodes_test.txt
if [ -f extra_nodes_test.txt ]; then
  echo "# Manually added entries" >> nodes_test.txt
  cat extra_nodes_test.txt >> nodes_test.txt
fi
git add nodes_test.txt

SEEDS_HEADER="${TOPLEVEL}"/src/chainparamsseeds.h
./generate-seeds.py . > "${SEEDS_HEADER}"
git add "${SEEDS_HEADER}"
popd

# Check that seeds have good connectivity
"${TOPLEVEL}"/contrib/devtools/build_cmake.sh
RPC_PORT=18832 "${SEEDS_DIR}"/check-seeds.sh main 80
RPC_PORT=18833 "${SEEDS_DIR}"/check-seeds.sh test 70

git commit -m "[Automated] Update seeds"
