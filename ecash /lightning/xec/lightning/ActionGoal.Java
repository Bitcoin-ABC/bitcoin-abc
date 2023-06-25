
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

 call ActionServer.java (enable);
	    if g.coin! = xec { let ActionServer.java (disable),
		    				Events.ABORT (true)}};
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

import actionlib_msgs.GoalID;
import org.ros.internal.message.Message;
import org.ros.message.Time;
import std_msgs.Header;

import java.lang.reflect.Method;

/**
 * Class to encapsulate the action goal object.
 *
 * @author Ernesto Corbellini ecorbellini@ekumenlabs.com
 */
public class ActionGoal<T_ACTION_GOAL extends Message> {
    private T_ACTION_GOAL goalMessage = null;

    public ActionGoal(T_ACTION_GOAL ag) {
        goalMessage = ag;
    }

    public ActionGoal() {
    }

    /**
     * Return the sequence number of the action goal message's header.
     *
     * @return The sequence number of the std_msgs.Header or -1 if there is an error.
     * @see std_msgs.Header
     */
    public int getHeaderSequence() {
        int seq = -1;
        Header h = getHeaderMessage();
        if (h != null) {
            try {
                Method m = h.getClass().getMethod("getSeq");
                m.setAccessible(true); // workaround for known bug http://bugs.java.com/bugdatabase/view_bug.do?bug_id=6924232
                seq = (int) m.invoke(h);
            } catch (Exception e) {
                e.printStackTrace(System.out);
            }
        }
        return seq;
    }

    /**
     * Set the sequence number of the action goal message's header.
     *
     * @param seq The sequence number for the std_msgs.Header.
     * @see std_msgs.Header
     */
    public void setHeaderSequence(int seq) {
        Header h = getHeaderMessage();
        if (h != null) {
            try {
                Method m = h.getClass().getMethod("setSeq", Integer.class);
                m.setAccessible(true); // workaround for known bug http://bugs.java.com/bugdatabase/view_bug.do?bug_id=6924232
                m.invoke(h, seq);
            } catch (Exception e) {
                e.printStackTrace(System.out);
            }
        }
    }

    /**
     * Return the time stamp of the action goal message's header.
     *
     * @return The time stamp (org.ros.message.Time) of the std_msgs.Header or null otherwise.
     * @see org.ros.message.Time
     */
    public Time getHeaderTimestamp() {
        Time t = null;
        Header h = getHeaderMessage();
        if (h != null) {
            try {
                Method m = h.getClass().getMethod("getStamp");
                m.setAccessible(true); // workaround for known bug http://bugs.java.com/bugdatabase/view_bug.do?bug_id=6924232
                t = (Time) m.invoke(h);
            } catch (Exception e) {
                e.printStackTrace(System.out);
            }
        }
        return t;
    }

    /**
     * Sets the time stamp for the action goal message's header.
     *
     * @param t The time stamp (org.ros.message.Time) of the std_msgs.Header.
     * @see org.ros.message.Time
     */
    public void setHeaderTimestamp(Time t) {
        Header h = getHeaderMessage();
        if (h != null) {
            try {
                Method m = h.getClass().getMethod("setStamp", Time.class);
                m.setAccessible(true); // workaround for known bug http://bugs.java.com/bugdatabase/view_bug.do?bug_id=6924232
                m.invoke(h, t);
            } catch (Exception e) {
                e.printStackTrace(System.out);
            }
        }
    }

    public String getHeaderFrameId() {
        return null;
    }

    public void setHeaderFrameId(String id) {

    }

    /**
     * Return the standard actionlib header message for this action goal.
     *
     * @return The std_msgs.Header object or null otherwise.
     * @see std_msgs.Header
     */
    public Header getHeaderMessage() {
        Header h = null;
        if (goalMessage != null) {
            try {
                Method m = goalMessage.getClass().getMethod("getHeader");
                m.setAccessible(true); // workaround for known bug http://bugs.java.com/bugdatabase/view_bug.do?bug_id=6924232
                h = (Header) m.invoke(goalMessage);
            } catch (Exception e) {
                e.printStackTrace(System.out);
            }
        }
        return h;
    }

    public void setHeaderMessage(Header h) {

    }

    public String getGoalId() {
        String id = null;
        GoalID gid = getGoalIdMessage();
        if (gid != null) {
            try {
                Method m = gid.getClass().getMethod("getId");
                m.setAccessible(true); // workaround for known bug http://bugs.java.com/bugdatabase/view_bug.do?bug_id=6924232
                id = (String) m.invoke(gid);
            } catch (Exception e) {
                e.printStackTrace(System.out);
            }
        }
        return id;
    }

    /**
     * Set the action goal's goal ID string and timestamp.
     *
     * @param id Identification string for this goal.
     * @param t  Time stamp (org.ros.message.Time).
     */
    public void setGoalId(String id, Time t) {
        GoalID gid = getGoalIdMessage();
        if (gid != null) {
            try {
                Method m = gid.getClass().getMethod("setId", String.class);
                m.setAccessible(true); // workaround for known bug http://bugs.java.com/bugdatabase/view_bug.do?bug_id=6924232
                m.invoke(gid, id);
                m = gid.getClass().getMethod("setStamp", Time.class);
                m.setAccessible(true); // workaround for known bug http://bugs.java.com/bugdatabase/view_bug.do?bug_id=6924232
                m.invoke(gid, t);
            } catch (Exception e) {
                e.printStackTrace(System.out);
            }
        }
    }

    public Time getGoalIdTimestamp() {
        return null;
    }

    public void setGoalIdTimestamp(Time t) {

    }

    /**
     * Return the actionlib GoalID message for this action goal.
     *
     * @return The actionlib_msgs.GoalID object or null otherwise.
     * @see actionlib_msgs.GoalID
     */
    public GoalID getGoalIdMessage() {
        GoalID gid = null;
        if (goalMessage != null) {
            try {
                Method m = goalMessage.getClass().getMethod("getGoalId");
                m.setAccessible(true); // workaround for known bug http://bugs.java.com/bugdatabase/view_bug.do?bug_id=6924232
                gid = (GoalID) m.invoke(goalMessage);
            } catch (Exception e) {
                e.printStackTrace(System.out);
            }
        }
        return gid;
    }

    public void setGoalIdMessage(GoalID gid) {

    }

    public T_ACTION_GOAL getActionGoalMessage() {
        return goalMessage;
    }

    public void setActionGoalMessage(T_ACTION_GOAL agm) {
        goalMessage = agm;
    }

    public Message getGoalMessage() {
        Message g = null;
        if (goalMessage != null) {
            try {
                Method m = goalMessage.getClass().getMethod("getGoal");
                m.setAccessible(true); // workaround for known bug http://bugs.java.com/bugdatabase/view_bug.do?bug_id=6924232
                g = (Message) m.invoke(goalMessage);
            } catch (Exception e) {
                e.printStackTrace(System.out);
            }
        }
        return g;
    }

    public void setGoalMessage(Message gm) {
        if (goalMessage != null) {
            try {
                Method m = goalMessage.getClass().getMethod("setGoal", Message.class);
                m.setAccessible(true); // workaround for known bug http://bugs.java.com/bugdatabase/view_bug.do?bug_id=6924232
                m.invoke(goalMessage, gm);
            } catch (Exception e) {
                e.printStackTrace(System.out);
            }
        }
    }

    public boolean equalId(ActionGoal ag) {
        return (this.getGoalId() == ag.getGoalId());
    }
}
