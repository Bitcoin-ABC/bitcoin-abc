import * as React from 'react';
import { notification } from 'antd';
import {
    CashReceivedNotificationIcon,
    TokenReceivedNotificationIcon,
} from '@components/Common/CustomIcons';
import Paragraph from 'antd/lib/typography/Paragraph';
import { currency } from '@components/Common/Ticker';

// Success Notifications:
const sendXecNotification = link => {
    notification.success({
        message: 'Success',
        description: (
            <a href={link} target="_blank" rel="noopener noreferrer">
                <Paragraph>
                    Transaction successful. Click to view in block explorer.
                </Paragraph>
            </a>
        ),
        duration: 3,
        icon: <CashReceivedNotificationIcon />,
        style: { width: '100%' },
    });
};

const createTokenNotification = link => {
    notification.success({
        message: 'Success',
        description: (
            <a href={link} target="_blank" rel="noopener noreferrer">
                <Paragraph>
                    Token created! Click to view in block explorer.
                </Paragraph>
            </a>
        ),
        icon: <TokenReceivedNotificationIcon />,
        style: { width: '100%' },
    });
};

const sendTokenNotification = link => {
    notification.success({
        message: 'Success',
        description: (
            <a href={link} target="_blank" rel="noopener noreferrer">
                <Paragraph>
                    Transaction successful. Click to view in block explorer.
                </Paragraph>
            </a>
        ),
        duration: 3,
        icon: <TokenReceivedNotificationIcon />,
        style: { width: '100%' },
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
        description: (
            <Paragraph>
                +{' '}
                {parseFloat(
                    Number(
                        balances.totalBalance - previousBalances.totalBalance,
                    ).toFixed(currency.cashDecimals),
                ).toLocaleString()}{' '}
                {currency.ticker}{' '}
                {cashtabSettings &&
                    cashtabSettings.fiatCurrency &&
                    `(${
                        currency.fiatCurrencies[cashtabSettings.fiatCurrency]
                            .symbol
                    }${(
                        Number(
                            balances.totalBalance -
                                previousBalances.totalBalance,
                        ) * fiatPrice
                    ).toFixed(
                        currency.cashDecimals,
                    )} ${cashtabSettings.fiatCurrency.toUpperCase()})`}
            </Paragraph>
        ),
        duration: 3,
        icon: <CashReceivedNotificationIcon />,
        style: { width: '100%' },
    });
};

const eTokenReceivedNotification = (
    currency,
    receivedSlpTicker,
    receivedSlpQty,
    receivedSlpName,
) => {
    notification.success({
        message: `${currency.tokenTicker} transaction received: ${receivedSlpTicker}`,
        description: (
            <Paragraph>
                You received {receivedSlpQty.toString()} {receivedSlpName}
            </Paragraph>
        ),
        duration: 3,
        icon: <TokenReceivedNotificationIcon />,
        style: { width: '100%' },
    });
};

// Error Notification:

const errorNotification = (error, message, stringDescribingCallEvent) => {
    console.log(error, message, stringDescribingCallEvent);
    notification.error({
        message: 'Error',
        description: message,
        duration: 5,
    });
};

export {
    sendXecNotification,
    createTokenNotification,
    sendTokenNotification,
    xecReceivedNotification,
    eTokenReceivedNotification,
    errorNotification,
};
