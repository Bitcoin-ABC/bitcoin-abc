import type { Meta, StoryObj } from '@storybook/react';

import Button from './Button';
import Text from '../Text';

const ButtonText = 'Cashtab Pay';

const meta: Meta<typeof Button> = {
    title: 'Button',
    component: Button,
};
export default meta;
type Story = StoryObj<typeof Button>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/7.0/react/api/csf
 * to learn how to use render functions.
 */
export const Default: Story = {
    args: {
        step: 'fresh',
        children: <Text>{ButtonText}</Text>,
    },
};
export const Pending: Story = {
    args: {
        step: 'pending',
        children: <Text>{ButtonText}</Text>,
    },
};
export const Complete: Story = {
    args: {
        step: 'complete',
        children: <Text>{ButtonText}</Text>,
    },
};
export const Install: Story = {
    args: {
        step: 'install',
        children: <Text>{ButtonText}</Text>,
    },
};

//Button is a stateful controlled component which is the primary visual indicator for the badger payment process
//Awaiting a confirmation or cancellation of Badger popup
//Payment received, at least on the front-end
//Cashtab extension not installed, prompt user to install Cashtab
