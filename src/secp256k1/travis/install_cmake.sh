#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

# Fetch Kitware signing key
wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc 2>/dev/null | sudo apt-key add -
	
# Add the Kitware PPA
sudo apt-add-repository 'deb https://apt.kitware.com/ubuntu/ xenial main'
sudo apt-get update

# Install cmake
sudo apt-get -y install cmake
