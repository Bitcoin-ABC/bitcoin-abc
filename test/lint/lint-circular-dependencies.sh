#!/usr/bin/env bash
#
# Copyright (c) 2018 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
#
# Check for circular dependencies

export LC_ALL=C

set -euo pipefail

: "${TOPLEVEL:=$(git rev-parse --show-toplevel)}"

EXPECTED_CIRCULAR_DEPENDENCIES=(
    "node/blockstorage -> validation -> node/blockstorage"
    "node/utxo_snapshot -> validation -> node/utxo_snapshot"
    "index/blockfilterindex -> node/blockstorage -> validation -> index/blockfilterindex"
    "index/base -> validation -> index/blockfilterindex -> index/base"
    "index/coinstatsindex -> node/coinstats -> index/coinstatsindex"
    "qt/addresstablemodel -> qt/walletmodel -> qt/addresstablemodel"
    "qt/bitcoingui -> qt/walletframe -> qt/bitcoingui"
    "qt/recentrequeststablemodel -> qt/walletmodel -> qt/recentrequeststablemodel"
    "qt/transactiontablemodel -> qt/walletmodel -> qt/transactiontablemodel"
    "txmempool -> validation -> txmempool"
    "wallet/fees -> wallet/wallet -> wallet/fees"
    "wallet/rpcwallet -> wallet/wallet -> wallet/rpcwallet"
    "wallet/wallet -> wallet/walletdb -> wallet/wallet"
    "avalanche/processor -> validation -> avalanche/processor"
    "avalanche/processor -> policy/block/stakingrewards -> avalanche/processor"
    "chainparams -> protocol -> chainparams"
    "chainparamsbase -> util/system -> chainparamsbase"
    "script/scriptcache -> validation -> script/scriptcache"
    "seeder/bitcoin -> seeder/db -> seeder/bitcoin"
    "chainparams -> protocol -> config -> chainparams"
    "avalanche/peermanager -> avalanche/proofpool -> avalanche/peermanager"
    "node/coinstats -> validation -> node/coinstats"
    "kernel/mempool_persist -> validation -> kernel/mempool_persist"
    "policy/block/preconsensus -> txmempool -> validation -> policy/block/preconsensus"
)

EXIT_CODE=0

CIRCULAR_DEPENDENCIES=()

pushd "${TOPLEVEL}"

IFS=$'\n'
for CIRC in $(cd src && ../contrib/devtools/circular-dependencies.py {*,*/*,*/*/*}.{h,cpp} | sed -e 's/^Circular dependency: //'); do
    CIRCULAR_DEPENDENCIES+=("$CIRC")
    IS_EXPECTED_CIRC=0
    for EXPECTED_CIRC in "${EXPECTED_CIRCULAR_DEPENDENCIES[@]}"; do
        if [[ "${CIRC}" == "${EXPECTED_CIRC}" ]]; then
            IS_EXPECTED_CIRC=1
            break
        fi
    done
    if [[ ${IS_EXPECTED_CIRC} == 0 ]]; then
        echo "A new circular dependency in the form of \"${CIRC}\" appears to have been introduced."
        echo
        EXIT_CODE=1
    fi
done

for EXPECTED_CIRC in "${EXPECTED_CIRCULAR_DEPENDENCIES[@]}"; do
    IS_PRESENT_EXPECTED_CIRC=0
    for CIRC in "${CIRCULAR_DEPENDENCIES[@]}"; do
        if [[ "${CIRC}" == "${EXPECTED_CIRC}" ]]; then
            IS_PRESENT_EXPECTED_CIRC=1
            break
        fi
    done
    if [[ ${IS_PRESENT_EXPECTED_CIRC} == 0 ]]; then
        echo "Good job! The circular dependency \"${EXPECTED_CIRC}\" is no longer present."
        echo "Please remove it from EXPECTED_CIRCULAR_DEPENDENCIES in $0"
        echo "to make sure this circular dependency is not accidentally reintroduced."
        echo
        EXIT_CODE=1
    fi
done

popd

exit ${EXIT_CODE}
