import type { Meta, StoryObj } from '@storybook/react';
import Ticker from '../../atoms/Ticker';
import PriceDisplay from './PriceDisplay';
import { formatPriceDisplay, formatAmount } from '../../utils/cashtab-helpers';
const demoPrice = 0.001;
const meta: Meta<typeof PriceDisplay> = {
    title: 'PriceDisplay',
    component: PriceDisplay,
};
export default meta;
type Story = StoryObj<typeof PriceDisplay>;
// The GetAddress component requests and displays the active Cashtab extension address
export const Fiat: Story = {
    args: {
        preSymbol: '$',
        price: formatPriceDisplay(5),
        symbol: 'USD',
    },
};
export const XEC: Story = {
    args: {
        coinType: Ticker.coinSymbol,
        price: formatAmount(demoPrice * 1e8, 8),
        symbol: 'XEC',
        name: Ticker.coinName,
    },
};
export const Token: Story = {
    args: {
        coinType: Ticker.tokenTicker,
        price: formatAmount(1e8, 8),
        symbol: 'DOGE',
        name: 'DOGECASH',
    },
};
export const TokenT: Story = {
    args: {
        coinType: Ticker.tokenTicker,
        price: formatAmount(1e8, 8),
        symbol: 'DOGE',
        name: 'DOGECASH',
    },
};
