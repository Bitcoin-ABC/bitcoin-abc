import type { Meta, StoryObj } from '@storybook/react';

import ButtonQR from './ButtonQR';
import Text from '../Text';

const ButtonText = 'Cashtab Pay';

const meta: Meta<typeof ButtonQR> = {
    title: 'ButtonQR',
    component: ButtonQR,
};
export default meta;
type Story = StoryObj<typeof ButtonQR>;
// ButtonQR is a stateful controlled component which is the primary visual indicator for the Cashtab payment process
export const Default: Story = {
    args: {
        toAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        amountSatoshis: 550,
        sizeQR: 125,
        step: 'fresh',
        children: <Text>{ButtonText}</Text>,
    },
};
// Awaiting a confirmation or cancellation of Cashtab popup
export const paymentPending: Story = {
    args: {
        toAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        amountSatoshis: 550,
        sizeQR: 125,
        step: 'pending',
        children: <Text>{ButtonText}</Text>,
    },
};
// Payment received, at least on the front-end
export const paymentComplete: Story = {
    args: {
        toAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        amountSatoshis: 550,
        sizeQR: 125,
        step: 'complete',
        children: <Text>{ButtonText}</Text>,
    },
};
// Cashtab plugin not installed, prompt user to install Cashtab
export const installPrompt: Story = {
    args: {
        toAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        amountSatoshis: 550,
        sizeQR: 125,
        step: 'install',
        children: <Text>{ButtonText}</Text>,
    },
};
