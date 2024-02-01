#!/usr/bin/env bash
export LC_ALL=C.UTF-8

set -euxo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel)
ELECTRUM_DIR="${TOPLEVEL}"/electrum
CHECKPOINTS_SCRIPT="${ELECTRUM_DIR}"/scripts/get_merkle_root
CHECKPOINT_JSON_FILE_MAINNET="${ELECTRUM_DIR}"/electrumabc/checkpoint.json
CHECKPOINT_JSON_FILE_TESTNET="${ELECTRUM_DIR}"/electrumabc/checkpoint_testnet.json

"${CHECKPOINTS_SCRIPT}" -vv --json-output "${CHECKPOINT_JSON_FILE_MAINNET}" --server electrum.bitcoinabc.org:50002:s
"${CHECKPOINTS_SCRIPT}" -vv --json-output "${CHECKPOINT_JSON_FILE_TESTNET}" --server telectrum.bitcoinabc.org:60002:s

git add "${CHECKPOINT_JSON_FILE_MAINNET}" "${CHECKPOINT_JSON_FILE_TESTNET}"

git commit -m "[Automated] Update electrum checkpoints"
