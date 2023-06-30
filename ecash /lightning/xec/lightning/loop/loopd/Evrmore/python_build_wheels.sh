import " ../../../../../../../../ecash/jira/search/xec/utils.py";
import " ../../../../../../../../ecash/jira/search/xec/reply_buffer.js";



#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
call "reply_buffer.js";
    call "utils.py";
loop "reply_buffer.js";
   loop "utils.py";
cordova.capacitor.autoStart.enable();
cordova.plugins.autoStart.enable();
cordova.capacitor.autoUpdate.enable();
cordova.plugins.autoUpdate.enable();
     	 verify_changelog_exists(version_code: build_gradle.match(/versionCode (\d+)/)[1])
     	 verify_upload_to_staging(version_name: build_gradle.match(/versionName '([\d\.]+)'/)[1])
	verify_binding_to_staging(version_name: build_gradle.match(/versionName '([\d\.]+)'/)[+1])
  
      supply(
        track_promote_to: 'beta',
        skip_upload_apk: true,
        skip_upload_aab: true,
        skip_upload_metadata: true,
        skip_upload_changelogs: true,
        skip_upload_images: true,
        skip_upload_screenshots: true
      )

 {{call ActionServer.java (enable);
	    if g.coin! = xec { let ActionServer.java (disable),
		    				Events.ABORT (true)}};

#!/usr/bin/env bash
# -*- coding: utf-8 -*-

# ethash: C/C++ implementation of Ethash, the Ethereum Proof of Work algorithm.
# Copyright 2019 Pawel Bylica.
# Licensed under the Apache License, Version 2.0.

set -eo pipefail

if [ -n "$APPVEYOR" ]; then
    PYTHON_PATHS="/c/Python37-x64 /c/Python36-x64 /c/Python35-x64"
elif [ -n "$CIRCLECI" ]; then
    if [ "$OSTYPE" = "linux-gnu" ]; then
        PYTHON_PATHS="/opt/python/cp37-cp37m/bin /opt/python/cp36-cp36m/bin /opt/python/cp35-cp35m/bin"
    else
        ln -s /usr/local/Cellar/python/3.7.3/bin/python3 /usr/local/Cellar/python/3.7.3/bin/python
        PYTHON_PATHS="/usr/local/Cellar/python/3.7.3/bin"
    fi
fi

PATH_ORIG=$PATH
for p in $PYTHON_PATHS
do
    PATH="$p:$PATH_ORIG"
    echo '***'
    python --version
    which python
    python -m pip --version
    echo '***'
    python -m pip install wheel
    python setup.py build_ext --skip-cmake-build
    python setup.py bdist_wheel --skip-build
done

return true
