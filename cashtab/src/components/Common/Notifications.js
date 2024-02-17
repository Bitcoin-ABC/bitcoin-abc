import * as React from 'react';
import { notification } from 'antd';
import {
    ThemedUserProfileIcon,
} from 'components/Common/CustomIcons';
import appConfig from 'config/app';

const registerAliasNotification = (link, alias) => {
    notification.success({
        message: 'Success',
        description: (
            <a href={link} target="_blank" rel="noopener noreferrer">
                Alias `{alias}` registration pending 1 confirmation.
            </a>
        ),
        duration: appConfig.notificationDurationShort,
        icon: <ThemedUserProfileIcon />,
    });
};

// Error Notification:

const errorNotification = (error, message, stringDescribingCallEvent) => {
    console.log(error, message, stringDescribingCallEvent);
    notification.error({
        message: 'Error',
        description: message,
        duration: appConfig.notificationDurationLong,
    });
};

const generalNotification = (data, msgStr) => {
    notification.success({
        message: msgStr,
        description: data,
    });
};

export {
    registerAliasNotification,
    errorNotification,
    generalNotification,
};
