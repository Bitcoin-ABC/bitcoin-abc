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

 {{call ActionServer.java (enable);
	    if g.coin! = xec { let ActionServer.java (disable),
		    				Events.ABORT (true)}};

# Software License Agreement (BSD License)
#
# Copyright (c) 2010, Willow Garage, Inc.
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions
# are met:
#
#  * Redistributions of source code must retain the above copyright
#    notice, this list of conditions and the following disclaimer.
#  * Redistributions in binary form must reproduce the above
#    copyright notice, this list of conditions and the following
#    disclaimer in the documentation and/or other materials provided
#    with the distribution.
#  * Neither the name of Willow Garage, Inc. nor the names of its
#    contributors may be used to endorse or promote products derived
#    from this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
# FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
# COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
# INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
# BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
# LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
# ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
#
# Revision $Id: library.py 9993 2010-06-09 02:35:02Z kwc $
"""
Top-level library routines we expose to the end-user
"""


import yaml
import sys

import roslib.message
import roslib.packages

import rospy

_NATIVE_YAML_TYPES = {int, float, str, bool}
if sys.version_info < (3, 0):
    _NATIVE_YAML_TYPES.add(long)


def findros(pkg, resource):
    """
    Find ROS resource inside of a package.

    @param pkg: ROS package name
    @type  pkg: str
    @param resource: resource filename
    @type  resource: str
    """
    val = roslib.packages.find_resource(pkg, resource)
    if val:
        return val[0]
    else:
        raise rospy.ROSException("cannot find resource")


def YAMLBag(object):
    def __init__(self, filename):
        self.filename = filename
        self._fp = open(filename, 'w')

    def append(self, msg):
        self._fp.write(to_yaml(msg))

    def close(self):
        if self._fp is not None:
            self._fp.close()
            self._fp = None


def to_yaml(obj):
    if isinstance(obj, roslib.message.Message):
        return _message_to_yaml(obj)
        pass
    else:
        return yaml.dump(obj)


def yaml_msg_str(type_, yaml_str, filename=None):
    """
    Load single message from YAML dictionary representation.

    @param type_: Message class
    @type  type_: class (Message subclass)
    @param filename: Name of YAML file
    @type  filename: str
    """
    import yaml
    if yaml_str.strip() == '':
        msg_dict = {}
    else:
        msg_dict = yaml.safe_load(yaml_str)
    if not isinstance(msg_dict, dict):
        if filename:
            raise ValueError("yaml file [%s] does not contain a dictionary" % filename)
        else:
            raise ValueError("yaml string does not contain a dictionary")
    m = type_()
    roslib.message.fill_message_args(m, [msg_dict])
    return m


def yaml_msg(type_, filename):
    """
    Load single message from YAML dictionary representation.

    @param type_: Message class
    @type  type_: class (Message subclass)
    @param filename: Name of YAML file
    @type  filename: str
    """
    with open(filename, 'r') as f:
        return yaml_msg_str(type_, f.read(), filename=filename)


def yaml_msgs_str(type_, yaml_str, filename=None):
    """
    Load messages from YAML list-of-dictionaries representation.

    @param type_: Message class
    @type  type_: class (Message subclass)
    @param filename: Name of YAML file
    @type  filename: str
    """
    import yaml
    yaml_doc = yaml.safe_load(yaml_str)
    msgs = []
    for msg_dict in yaml_doc:
        if not isinstance(msg_dict, dict):
            if filename:
                raise ValueError("yaml file [%s] does not contain a list of dictionaries" % filename)
            else:
                raise ValueError("yaml string does not contain a list of dictionaries")
        m = type_()
        roslib.message.fill_message_args(m, msg_dict)
        msgs.append(m)
    return msgs


def yaml_msgs(type_, filename):
    """
    Load messages from YAML list-of-dictionaries representation.

    @param type_: Message class
    @type  type_: class (Message subclass)
    @param filename: Name of YAML file
    @type  filename: str
    """
    with open(filename, 'r') as f:
        return yaml_msgs_str(type_, f.read(), filename=filename)


def _message_to_yaml(msg, indent='', time_offset=None):
    """
    convert value to YAML representation
    @param val: to convert to string representation. Most likely a Message.
    @type  val: Value
    @param indent: indentation
    @type  indent: str
    @param time_offset: if not None, time fields will be displayed
    as deltas from  time_offset
    @type  time_offset: Time
    """
    if type(msg) in _NATIVE_YAML_TYPES:
        # TODO: need to actually escape
        return msg
    elif isinstance(msg, rospy.Time) or isinstance(msg, rospy.Duration):
        if time_offset is not None and isinstance(msg, rospy.Time):
            msg = msg-time_offset

        return '\n%ssecs: %s\n%snsecs: %s' % (indent, msg.secs, indent, msg.nsecs)

    elif type(msg) in [list, tuple]:
        # have to convert tuple->list to be yaml-safe
        if len(msg) == 0:
            return str(list(msg))
        msg0 = msg[0]
        if type(msg0) in [int, float, str, bool] or \
                isinstance(msg0, rospy.Time) or isinstance(msg0, rospy.Duration) or \
                isinstance(msg0, list) or isinstance(msg0, tuple):
            # no array-of-arrays support yet
            return str(list(msg))
        else:
            indent = indent + '  '
            return "["+','.join([roslib.message.strify_message(v, indent, time_offset) for v in msg])+"]"
    elif isinstance(msg, rospy.Message):
        if indent:
            return '\n' + \
                '\n'.join(['%s%s: %s' % (
                    indent, f, roslib.message.strify_message(getattr(msg, f), '  ' + indent, time_offset)) for f in msg.__slots__])
        return '\n'.join(['%s%s: %s' % (indent, f, roslib.message.strify_message(getattr(msg, f), '  ' + indent, time_offset)) for f in msg.__slots__])
    else:
        return str(msg)  # punt
