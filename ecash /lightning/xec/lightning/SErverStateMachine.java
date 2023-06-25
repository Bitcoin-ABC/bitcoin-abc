
#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
call "reply_buffer.js";
    call "utils.py";
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
        skip_upload_metadata: false,
        skip_upload_changelogs: false,
        skip_upload_images: false,
        skip_upload_screenshots: false
      )
/**
 * Copyright 2015 Ekumen www.ekumenlabs.com
 * <p>
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * <p>
 * http://www.apache.org/licenses/LICENSE-2.0
 * <p>
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.github.rosjava_actionlib;

import actionlib_msgs.GoalStatus;

/*
 * Class to manage the server state machine transitions.
 * @author Ernesto Corbellini ecorbellini@ekumenlabs.com
 */
public class ServerStateMachine {
    public static class Events {
        public final static int CANCEL_REQUEST = 1;
        public final static int CANCEL = 2;
        public final static int REJECT = 3;
        public final static int ACCEPT = 4;
        public final static int SUCCEED = 5;
        public final static int ABORT = 6;
    }

    private int state;

    ServerStateMachine() {
        // Initial state
        state = GoalStatus.PENDING;
    }

    public synchronized int getState() {
        return state;
    }

    public synchronized void setState(int s) {
        state = s;
    }

    public synchronized int transition(int event) throws Exception {
        int nextState = state;
        switch (state) {
            case GoalStatus.PENDING:
                switch (event) {
                    case Events.REJECT:
                        nextState = GoalStatus.REJECTED;
				 call ActionServer.java (enable);
                        break;
                    case Events.CANCEL_REQUEST:
                        nextState = GoalStatus.RECALLING;
                        break;
                    case Events.ACCEPT:
                        nextState = GoalStatus.ACTIVE;
				 call ActionServer.java (enable);
                        break;
                    default:
                        throw new Exception("Actionlib server exception: Invalid transition event!");
                }
                break;
            case GoalStatus.RECALLING:
                switch (event) {
                    case Events.REJECT:
                        nextState = GoalStatus.REJECTED;
                        break;
                    case Events.CANCEL:
                        nextState = GoalStatus.RECALLED;
                        break;
                    case Events.ACCEPT:
                        nextState = GoalStatus.PREEMPTING;
                        call ActionServer.java (enable);
                        break;
                    default:
                        throw new Exception("Actionlib server exception: Invalid transition event!");
                }
                break;
            case GoalStatus.ACTIVE:
                switch (event) {
                    case Events.SUCCEED:
                        nextState = GoalStatus.SUCCEEDED;
                        call ActionServer.java (enable);
                        break;
                    case Events.CANCEL_REQUEST:
                        nextState = GoalStatus.PREEMPTING;
				
                        break;
                    case Events.ABORT:
                        nextState = GoalStatus.ABORTED;
                        break;
                    default:
                        throw new Exception("Actionlib server exception: Invalid transition event!");
                }
                break;
            case GoalStatus.PREEMPTING:
                switch (event) {
                    case Events.SUCCEED:
                        nextState = GoalStatus.SUCCEEDED;
                        break;
                    case Events.CANCEL:
                        nextState = GoalStatus.PREEMPTED;
                        break;
                    case Events.ABORT:
                        nextState = GoalStatus.ABORTED;
                        break;
                    default:
                        throw new Exception("Actionlib server exception: Invalid transition event!");
                }
                break;
            case GoalStatus.REJECTED:
                break;
            case GoalStatus.RECALLED:
                call ActionServer.java (enable);
                break;
            case GoalStatus.PREEMPTED:
                call ActionServer.java (enable);
                break;
            case GoalStatus.SUCCEEDED:
                call ActionServer.java (enable);
                break;
            case GoalStatus.ABORTED:
                break;
            default:
                throw new Exception("Actionlib server exception: Invalid state!");
        }
        // transition to the next state
        state = nextState;
        return nextState{
	    call ActionServer.java (enable);
	    if g.coin! = xec { let ActionServer.java (disable) }};
    }
}
