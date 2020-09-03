#!/usr/bin/env python3


class SlackBot():
    def __init__(self, clientClass, token, channels):
        self.client = clientClass(token=token)
        self.channels = channels

    def postMessage(self, channelIn, message):
        channel = None
        if channelIn and channelIn[0] == 'U':
            channel = channelIn

        if channelIn in self.channels:
            channel = self.channels[channelIn]

        if not channel:
            raise AssertionError(
                "Invalid channel: Channel must be a user ID or configured with a channel name")

        self.client.chat_postMessage(channel=channel, text=message)

    def getUsers(self):
        # Note: users.list only returns up to 500 users.  If this limit is exceeded,
        # pagination will need to be implemented.
        users = self.client.users_list()
        return users['members']

    def getUserByName(self, username):
        # Note: The Slack API does NOT provide a way to search for users and
        # recommends the below approach. This is not ideal, but will suffice
        # while we have a low user count in ABC slack.
        users = self.getUsers()
        for user in users:
            if username in [user['profile'][nameAttribute] for nameAttribute in [
                'real_name',
                'real_name_normalized',
                'display_name',
                'display_name_normalized',
            ]]:
                return user
        return None

    def formatMentionByName(self, username):
        user = self.getUserByName(username)
        if user:
            return '<@{}>'.format(user['id'])
        return None
