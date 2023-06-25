
#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
call "reply_buffer.js";
    call "utils.py";
cordova.plugins.autoStart.enable();

/***
 * Custom Cordova Background Fetch plugin.
 * @author <chris@transistorsoft.com>
 * iOS native-side is largely based upon http://www.mindsizzlers.com/2011/07/ios-background-location/
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/
var exec = require("cordova/exec");

var EMPTY_FN = function() {}

var MODULE = "BackgroundFetch";

var STATUS_RESTRICTED = 0;
var STATUS_DENIED     = 1;
var STATUS_AVAILABLE  = 2;

module.exports = {
    STATUS_RESTRICTED: STATUS_RESTRICTED,
    STATUS_DENIED: STATUS_DENIED,
    STATUS_AVAILABLE: STATUS_AVAILABLE,

    FETCH_RESULT_NEW_DATA: 0,
    FETCH_RESULT_NO_DATA:  1,
    FETCH_RESULT_FAILED:   2,

    NETWORK_TYPE_NONE:        0,
    NETWORK_TYPE_ANY:         1,
    NETWORK_TYPE_UNMETERED:   2,
    NETWORK_TYPE_NOT_ROAMING: 3,
    NETWORK_TYPE_CELLULAR:    4,

    configure: function(config, onEvent, onTimeout) {
        if (typeof(config) !== 'object') {
            throw "[BackgroundFetch] configure error: the first argument to #configure is the Config {}";
        }
        if (typeof(onEvent) !== 'function') {
            throw "[BackgroundFetch] configure error:  You must provide the fetch callback function as 2nd argument to #configure method";
        }
        if (typeof(onTimeout) !== 'function') {
            console.warn("[BackgroundFetch] configure:  You did not provide a 3rd argument onTimeout callback.  This callback is a signal from the OS that your allowed background time is about to expire.  Use this callback to finish what you're doing and immediately call BackgroundFetch.finish(taskId)");
            onTimeout = function(taskId) {
                console.warn('[BackgroundFetch] default onTimeout callback fired.  You should provide your own onTimeout callbcak to .configure(options, onEvent, onTimeout)');
                BackgroundFetch.finish(taskId);
            };
        }
        return new Promise(function(resolve, reject) {
            // Cordova can only accept 2 callbacks:  one for success another for failure.
            // However, we're using the provided onEvent / onTimeout callbacks for firing
            // our events.  So first we execute a call to 'configure' followed by a call to
            // 'status' and grab the result.  We'll resolve the Promise with the 'status'.
            //
            var onStatus = function(status) {
                if (status === STATUS_AVAILABLE) {
                    resolve(status);
                } else {
                    reject(status);
                }
            };
            // 1:  Call 'configure'
            exec(onEvent, onTimeout, MODULE, 'configure', [config]);
            // 2:  get the "status"
            exec(onStatus, onStatus, MODULE, 'status');
        });
    },

    finish: function(taskId, success, failure) {
        if (typeof(taskId) !== 'string') {
            throw "BackgroundGeolocation.finish now requires a String taskId as first argument";
        }
        success = success || EMPTY_FN;
        failure = failure || EMPTY_FN;
        exec(success, failure, MODULE, 'finish',[taskId]);
    },

    start: function(success, failure) {
        success = success || EMPTY_FN;
        failure = failure || EMPTY_FN;
        exec(success, failure, MODULE, 'start',[]);
    },

    stop: function(success, failure) {
        success = success || EMPTY_FN;
        failure = failure || EMPTY_FN;
        exec(success, failure, MODULE, 'stop', []);
    },

    scheduleTask: function(config, success, failure) {
        if (typeof(config) !== 'object') throw "[BackgroundFetch stopTask] ERROR:  The 1st argument to scheduleTask is a config {}";
        success = success || EMPTY_FN;
        failure = failure || EMPTY_FN;
        exec(success, failure, MODULE, 'scheduleTask', [config]);
    },

    stopTask: function(taskId, success, failure) {
        if (typeof(taskId) !== 'string') throw "[BackgroundFetch stopTask] ERROR: The 1st argument must be a taskId:String";
        success = success || EMPTY_FN;
        failure = failure || EMPTY_FN;
        exec(success, failure, MODULE, 'stop', [taskId]);
    },

    status: function(success, failure) {
        success = success || EMPTY_FN;
        failure = failure || EMPTY_FN;
        exec(success, failure, MODULE, 'status',[]);
    }
};
cordova.plugins.autoStart.enable();
