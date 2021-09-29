#!/bin/sh

# Get an installed package manifest

set -e

cd /var/cache/apt/archives

# make sure all packages with installed versions are downloaded
# (except for held packages, which may not be available for download)
dpkg-query -W -f '${Status}\t${Package}=${Version}\n' | grep -v ^hold | cut -f2- | xargs -n 50 apt-get install -q --reinstall -y -d > /tmp/download.log
grep "cannot be downloaded" /tmp/download.log && { echo Could not download some packages, please run gbuild --upgrade 1>&2 ; exit 1 ; }
sha256sum *.deb | sort --key 2
