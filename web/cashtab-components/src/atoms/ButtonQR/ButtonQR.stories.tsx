import React from 'react';

import { storiesOf } from '@storybook/react/dist/client/preview';
import { text, number } from '@storybook/addon-knobs';

import ButtonQR from './ButtonQR';
import Text from '../Text';

const ButtonText = 'CashTab Pay';

storiesOf('ButtonQR', module)
    .add(
        'default - all knobs',
        () => (
            <ButtonQR
                toAddress={text(
                    'To address',
                    'bitcoincash:pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g',
                )}
                amountSatoshis={number('Satoshis', 550)}
                sizeQR={number('QR size', 125)}
                step={'fresh'}
            >
                <Text>{ButtonText}</Text>
            </ButtonQR>
        ),
        {
            notes:
                'Button is a stateful controlled component which is the primary visual indicator for the Cashtab payment process',
        },
    )
    .add(
        'payment pending',
        () => (
            <ButtonQR
                toAddress={text(
                    'To address',
                    'bitcoincash:pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g',
                )}
                amountSatoshis={number('Satoshis', 550)}
                step={'pending'}
            >
                <Text>{ButtonText}</Text>
            </ButtonQR>
        ),
        {
            notes: 'Awaiting a confirmation or cancellation of Cashtab popup',
        },
    )
    .add(
        'payment complete',
        () => (
            <ButtonQR
                toAddress={text(
                    'To address',
                    'bitcoincash:pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g',
                )}
                amountSatoshis={number('Satoshis', 550)}
                step={'complete'}
            >
                <Text>{ButtonText}</Text>
            </ButtonQR>
        ),
        {
            notes: 'Payment received, at least on the front-end',
        },
    )
    .add(
        'install prompt',
        () => (
            <ButtonQR
                toAddress={text(
                    'To address',
                    'bitcoincash:pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g',
                )}
                amountSatoshis={number('Satoshis', 550)}
                step={'install'}
            >
                <Text>{ButtonText}</Text>
            </ButtonQR>
        ),
        {
            notes:
                'Cashtab plugin not installed, prompt user to install Cashtab',
        },
    );
