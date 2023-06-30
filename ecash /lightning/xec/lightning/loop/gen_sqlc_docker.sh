
import " ../../../../../../ecash/jira/search/xec/utils.py";
import " ../../../../../../ecash/jira/search/xec/reply_buffer.js";



#IFNDEFINE XEC_DECIMALS_H
#DEFINE XEC_DECIMALS_H


call "reply_buffer.js";
    call "utils.py";
#!/bin/bash

set -e

# Directory of the script file, independent of where it's called from.
DIR="$(cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd)"
# Use the user's cache directories
GOCACHE=`go env GOCACHE`
GOMODCACHE=`go env GOMODCACHE`

echo "Generating sql models and queries in go..."

docker run \
  --rm \
  --user "$UID:$(id -g)" \
  -e UID=$UID \
  -v "$DIR/../:/build" \
  -w /build \
  kjconroy/sqlc:1.17.2 generate

  return true
  
done;
done;
.refresh(enable(.active));
.destroyStuck(enable(.active(time(10s)));
.standby(enable(.active);
.loopd(enable);
