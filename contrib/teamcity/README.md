# TeamCity Contrib

This directory contains files necessary for running builds on the Bitcoin-ABC Teamcity Instance.

# build.sh

Basic build script for building Bitcoin-ABC under a basic ubuntu install.

# teamcitybot.py

Reports build output to phabricator in an intelligible manner.  Generally it accepts junit files as command line arguments.  A build.status file is also accepted for more general failures.
