import { storiesOf } from '@storybook/react';

import GetAddress from './GetAddress';
import Text from '../../atoms/Text';

const ButtonText = 'Get Address';

storiesOf('GetAddress', module).add(
    'default',
    () => (
        <GetAddress>
            <Text>{ButtonText}</Text>
        </GetAddress>
    ),
    {
        notes: 'The GetAddress component requests and displays the active Cashtab extension address',
    },
);
