#!/bin/bash

cd /home/ubuntu/
if [ ! -e /home/ubuntu/NEXT ]; then
   git clone https://github.com/nextml/NEXT.git
else
   cd /home/ubuntu/NEXT
   git pull
fi

# checkout latest tag

cd /home/ubuntu/NEXT
git fetch --tags
latestTag=$(git describe --tags `git rev-list --tags --max-count=1`)
git checkout $latestTag

# start NEXT

cd /home/ubuntu/NEXT/local
/bin/bash docker_up.sh &
