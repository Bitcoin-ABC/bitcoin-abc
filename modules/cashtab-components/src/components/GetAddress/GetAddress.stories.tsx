import type { Meta, StoryObj } from '@storybook/react';

import GetAddress from './GetAddress';
import Text from '../../atoms/Text';

const ButtonText = 'Get Address';

const meta: Meta<typeof GetAddress> = {
    title: 'GetAddress',
    component: GetAddress,
};
export default meta;
type Story = StoryObj<typeof GetAddress>;
// The GetAddress component requests and displays the active Cashtab extension address
export const Default: Story = {
    args: {
        children: <Text>{ButtonText}</Text>,
    },
};
