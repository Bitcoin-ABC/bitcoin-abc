import * as React from 'react';
import { notification } from 'antd';
import {
    CashReceivedNotificationIcon,
    ThemedUserProfileIcon,
    TokenNotificationIcon,
} from 'components/Common/CustomIcons';
import { supportedFiatCurrencies } from 'config/cashtabSettings';
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

const xecReceivedNotification = (
    balances,
    previousBalances,
    cashtabSettings,
    fiatPrice,
) => {
    notification.success({
        message: 'Transaction received',
        description: ` 
                ${parseFloat(
                    Number(
                        balances.totalBalance - previousBalances.totalBalance,
                    ).toFixed(appConfig.cashDecimals),
                ).toLocaleString()} 
                ${appConfig.ticker} 
                ${
                    cashtabSettings &&
                    cashtabSettings.fiatCurrency &&
                    `(${
                        supportedFiatCurrencies[cashtabSettings.fiatCurrency]
                            .symbol
                    }${(
                        Number(
                            balances.totalBalance -
                                previousBalances.totalBalance,
                        ) * fiatPrice
                    ).toFixed(
                        appConfig.cashDecimals,
                    )} ${cashtabSettings.fiatCurrency.toUpperCase()})`
                }
            `,
        duration: appConfig.notificationDurationShort,
        icon: <CashReceivedNotificationIcon />,
    });
};

const xecReceivedNotificationWebsocket = (
    xecAmount,
    cashtabSettings,
    fiatPrice,
) => {
    notification.success({
        message: 'eCash received',
        description: `
                ${xecAmount.toLocaleString()} ${appConfig.ticker} 
                ${
                    cashtabSettings &&
                    cashtabSettings.fiatCurrency &&
                    `(${
                        supportedFiatCurrencies[cashtabSettings.fiatCurrency]
                            .symbol
                    }${(xecAmount * fiatPrice).toFixed(
                        appConfig.cashDecimals,
                    )} ${cashtabSettings.fiatCurrency.toUpperCase()})`
                }
            `,
        duration: appConfig.notificationDurationShort,
        icon: <CashReceivedNotificationIcon />,
    });
};

const eTokenReceivedNotification = (
    receivedSlpTicker,
    receivedSlpQty,
    receivedSlpName,
) => {
    notification.success({
        message: `${appConfig.tokenTicker} transaction received: ${receivedSlpTicker}`,
        description: `You received ${receivedSlpQty.toString()} ${receivedSlpName}`,
        duration: appConfig.notificationDurationShort,
        icon: <TokenNotificationIcon />,
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
    xecReceivedNotification,
    xecReceivedNotificationWebsocket,
    eTokenReceivedNotification,
    errorNotification,
    generalNotification,
};
