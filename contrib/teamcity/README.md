# TeamCity Contrib

This directory contains scripts and other files necessary for running builds on
the Bitcoin-ABC TeamCity agent instance.

# TeamCity Agent Setup

Basic steps for creating a new TeamCity build agent.

## Create a new, empty VM

Select the following options:
1. OS: Debian (Stretch; Ubuntu works as a backup option)
2. Disk Space: 20GB (Disk space can be increased later. Always start with the smallest disk space necessary to reduce overhead costs)
3. CPUs: 4+ (recommended 8+ for IBD and GUIX builds)
4. Memory: 8GB+ (minimum 32GB for running IBD)

## Setup user to run builds

```
# As root, install sudo
apt-get install sudo

# Still as root, create the build user...
adduser teamcity
# .. and add it to the sudo group
adduser teamcity sudo

# Login to this user for the next step
sudo su teamcity
cd ~
```

## Install TeamCity Agent Software

In general, the instructions provided by TeamCity may be followed for setting up a new agent image: https://confluence.jetbrains.com/display/TCD18/Setting+up+and+Running+Additional+Build+Agents

However, the instructions are not step-by-step and require a lot of decision making.  Below is an attempt to break the instructions down so they can be executed quickly:

```
# Install Java JRE
sudo apt-get install default-jre
sudo vim /etc/environment

# Add the following line to /etc/environment:
JAVA_HOME="/usr/lib/jvm/default-java"

# If this link is not available, it can be found at:
# https://build.bitcoinabc.org/agents.html -> "Install Build Agents"
wget https://build.bitcoinabc.org/update/buildAgent.zip

# Location of where to unzip this is up to you, here buildAgent is assumed:
sudo apt-get install unzip
unzip -d buildAgent buildAgent.zip
cd buildAgent/conf
cp buildAgent.dist.properties buildAgent.properties
vim buildAgent.properties

# Edit the serverUrl line to the following:
serverUrl=https://build.bitcoinabc.org/

# Make sure agent.sh is executable
cd ../bin
chmod +x agent.sh

# Setup automatic start for the TeamCity agent
cd /etc/init.d
sudo vim buildAgent

# Copy the contents of the buildAgent-autostart script in the directory of
# this README into buildAgent.  Modify the AGENT_PATH and/or USER as needed.
sudo chmod 755 buildAgent
sudo update-rc.d buildAgent defaults

# Reboot the machine or manually start the service
/etc/init.d/buildAgent start

# Ensure the agent is RUNNING
/etc/init.d/buildAgent status
```

## Install necessary build dependencies for bitcoin-abc

See [build-unix.md](/doc/build-unix.md)
