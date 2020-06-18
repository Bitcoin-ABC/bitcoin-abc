#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

ADOPTOPENJDK_APT_REPOSITORY=https://adoptopenjdk.jfrog.io/adoptopenjdk/deb
ADOPTOPENJDK8_DEB_FILE=adoptopenjdk-8-hotspot_8u252-b09-2_amd64.deb

ADOPTOPENJDK8_DEPENDENCIES=(
  java-common
  libasound2
  libc6
  libx11-6
  libxext6
  libxi6
  libxrender1
  libxtst6
  zlib1g
)

function join_by() {
  local IFS="$1"
  shift
  echo "$*"
}

# First install the known dependencies
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y $(join_by ' ' "${ADOPTOPENJDK8_DEPENDENCIES[@]}")

apt-key add "$(dirname $0)/adoptopenjdk.pub"

{
  # Try to install from the repo
  add-apt-repository --yes "${ADOPTOPENJDK_APT_REPOSITORY}" &&
  apt-get update &&
  DEBIAN_FRONTEND=noninteractive apt-get install -y adoptopenjdk-8-hotspot
} || {
  # Fallback in case of failure:
  #  - Remove the faulty repo, make sure we can update the packages
  #  - Download the deb package and install it using dpkg
  add-apt-repository -r "${ADOPTOPENJDK_APT_REPOSITORY}" &&
  apt-get update &&
  wget "${ADOPTOPENJDK_APT_REPOSITORY}/pool/main/a/adoptopenjdk-8-hotspot/${ADOPTOPENJDK8_DEB_FILE}" &&
  dpkg -i "${ADOPTOPENJDK8_DEB_FILE}"
} || {
  # Nothing worked, give up
  echo "Unable to install adoptopenjdk8, giving up"
  exit 1
}

ln -s /usr/lib/jvm/adoptopenjdk-8-hotspot-amd64 /usr/lib/jvm/default-java
echo 'JAVA_HOME="/usr/lib/jvm/default-java"' >> /etc/environment
