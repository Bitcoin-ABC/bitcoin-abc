import { Meta, Story } from '@storybook/react/types-6-0';
import CashtabBadge from './CashtabBadge';
import type { CashtabBadgeProps } from './CashtabBadge';
import { currencyOptions } from '../../utils/currency-helpers';
import Ticker from '../../atoms/Ticker';

// [ SPICE, NAKAMOTO, DOGECASH, BROC ]
const tokenIdOptions = [
    '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf',
    'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
    '3916a24a051f8b3833a7fd128be51dd93015555ed9142d6106ec03267f5cdc4c',
    '259908ae44f46ef585edef4bcc1e50dc06e4c391ac4be929fae27235b8158cf1',
];

const Template: Story<CashtabBadgeProps> = (args: CashtabBadgeProps) => (
    <CashtabBadge {...args} />
);

export const Standard = Template.bind({});
Standard.args = {
    price: 0.05,
    currency: 'USD',
    to: 'ecash:qrcl220pxeec78vnchwyh6fsdyf60uv9tca7668slm',
};

export const MostProps = Template.bind({});
MostProps.args = {
    price: 0.0025,
    currency: 'GBP',
    to: 'ecash:qrcl220pxeec78vnchwyh6fsdyf60uv9tca7668slm',
    isRepeatable: true,
    repeatTimeout: 4000,
    text: 'My Cash Button',
    showAmount: true,
    showBorder: true,
    showQR: false,
};

export const Minimal = Template.bind({});
Minimal.args = {
    amount: 0.01,
    to: 'ecash:qrcl220pxeec78vnchwyh6fsdyf60uv9tca7668slm',
    showAmount: false,
    showQR: true,
};

export const Fiat = Template.bind({});
Fiat.args = {
    price: 3.5,
    currency: 'CAD',
    text: 'Pay with Cashtab',
    to: 'ecash:qrcl220pxeec78vnchwyh6fsdyf60uv9tca7668slm',
};

Fiat.storyName = 'price in fiat';

export const BCHA = Template.bind({});
BCHA.args = {
    coinType: Ticker.coinSymbol,
    amount: 0.33,
    to: 'ecash:qrcl220pxeec78vnchwyh6fsdyf60uv9tca7668slm',
};

BCHA.storyName = `price in ${Ticker.coinSymbol}`;

export const SLPA = Template.bind({});
SLPA.args = {
    coinType: Ticker.tokenTicker,
    tokenId: tokenIdOptions[0],
    amount: 100,
    to: 'etoken:qrcl220pxeec78vnchwyh6fsdyf60uv9tcnqnc3hmv',
    showQR: true,
};

SLPA.storyName = `price in ${Ticker.tokenTicker}`;

export const StepControlled = Template.bind({});
StepControlled.args = {
    amount: 0.012,
    to: 'ecash:qrcl220pxeec78vnchwyh6fsdyf60uv9tca7668slm',
    stepControlled: 'fresh',
};

StepControlled.storyName = `Controlled Step`;

export default {
    title: 'CashtabBadge',
    component: CashtabBadge,
    argTypes: {
        currency: {
            control: {
                type: 'select',
                options: currencyOptions,
            },
        },
        tokenId: {
            control: {
                type: 'select',
                options: tokenIdOptions,
            },
        },
        stepControlled: {
            control: {
                type: 'select',
                options: ['fresh', 'pending', 'complete'],
            },
        },
    },
} as Meta;
