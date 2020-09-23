#!/usr/bin/env bash

# Note: Any bot running this script must have the appropriate permissions to
# push commits upstream. When running locally, this script will git push in a
# dry run by default.

export LC_ALL=C.UTF-8

set -euxo pipefail

help_message() {
  cat <<EOF
$0 [options] [script] [script_args...]
Generate a commit from available recipes.

The given script may produce a commit. If a commit is generated this way, it will be landed.

Options:
  -h, --help                Display this help message.

Environment Variables:
  DRY_RUN                   If set to 'no', this script will push the generated changes upstream. Default: 'yes'
EOF
}

SCRIPT=""
SCRIPT_ARGS=()

# Parse command line arguments
while [[ $# -gt 0 ]]; do
case $1 in
  -h|--help)
    help_message
    exit 0
    ;;
  *)
    SCRIPT="$1"
    shift
    SCRIPT_ARGS=("$@")
    break
    ;;
esac
done

LAND_PATCH_ARGS=()
case ${DRY_RUN:=yes} in
  no|NO|false|FALSE)
    # Nothing to do
    ;;
  *)
    LAND_PATCH_ARGS+=("--dry-run")
    ;;
esac

OLD_HEAD="$(git rev-parse HEAD)"

echo "Building automated commit using '${SCRIPT}'..."

BOT_PREFIX="[Automated]"
TOPLEVEL=$(git rev-parse --show-toplevel)

BUILD_DIR="${TOPLEVEL}/abc-ci-builds/automated-commit-$(basename ${SCRIPT})"
mkdir -p "${BUILD_DIR}"
export BUILD_DIR

# Make sure tree is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: The source tree has unexpected changes. Clean up any changes (try 'git stash') and try again."
  exit 10
fi

if [ ! -f "${SCRIPT}" ]; then
  echo "Error: '${SCRIPT}' does not exist"
  exit 10
fi

"${SCRIPT}" "${SCRIPT_ARGS[@]}"

# Bail early if there's nothing to land
if [ "$(git rev-parse HEAD)" == "${OLD_HEAD}" ]; then
  echo "No new changes. Nothing to do."
  exit 0
fi

# Auto-generated changes. These are amended to the patch rather than landed as
# their own commit.
for AUTOGEN_SCRIPT in "${TOPLEVEL}"/contrib/source-control-tools/autogen-recipes/* ; do
  "${AUTOGEN_SCRIPT}"
done

echo "The following staged changes will be amended to your patch:"
git --no-pager diff --cached

# Amend the commit, preserving committer info
GIT_COMMITTER_EMAIL="$(git show -s --format='%ce')"
GIT_COMMITTER_NAME="$(git show -s --format='%cn')"
export GIT_COMMITTER_EMAIL
export GIT_COMMITTER_NAME
git commit --amend --no-edit

# Land the generated commit
"${TOPLEVEL}"/contrib/source-control-tools/land-patch.sh "${LAND_PATCH_ARGS[@]}"
