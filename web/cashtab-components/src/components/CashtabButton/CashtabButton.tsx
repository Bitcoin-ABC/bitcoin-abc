import * as React from 'react';
import styled from 'styled-components';

import {
    getCurrencyPreSymbol,
    formatPriceDisplay,
    formatAmount,
} from '../../utils/cashtab-helpers';

import colors from '../../styles/colors';

import CashtabBase from '../../hoc/CashtabBase';

import type { ButtonStates, CashtabBaseProps } from '../../hoc/CashtabBase';

import PriceDisplay from '../PriceDisplay';

import Button from '../../atoms/Button';
import ButtonQR from '../../atoms/ButtonQR';
import Small from '../../atoms/Small';
import Text from '../../atoms/Text';

const Outer = styled.div`
    display: grid;
    grid-template-columns: max-content;
`;

const Wrapper = styled('div')<{ hasBorder?: boolean }>`
    display: grid;
    grid-gap: 5px;
    font-family: sans-serif;
    grid-template-columns: max-content;
    grid-template-rows: max-content max-content max-content;
    color: ${colors.fg500};
    padding: 6px;
    border: ${props =>
        props.hasBorder ? `1px dashed ${colors.brand700}` : 'none'};
    border-radius: 4px;
`;

// Cashtab Button Props
type CashtabButtonProps = CashtabBaseProps & {
    text?: string;

    showAmount?: boolean;
    showBorder?: boolean;
    showQR?: boolean;

    coinSymbol: string;
    coinDecimals?: number;
    coinName?: string;

    handleClick: Function;
    step: ButtonStates;
};

class CashtabButton extends React.PureComponent<CashtabButtonProps> {
    static defaultProps = {
        showAmount: true,
        showBorder: false,
    };

    render() {
        const {
            to,
            step,
            handleClick,

            currency,
            price,

            coinType,
            coinSymbol,
            coinDecimals,
            coinName,

            amount,
            showAmount,

            text,
            showBorder,
            showQR,
        } = this.props;

        // buttonPriceDisplay if no price, or if a bip70 invoice is set from a server without supported websocket updates
        let buttonPriceDisplay = <Text>Cashtab Pay</Text>;

        // buttonPriceDisplay of price set in props and no invoice is set
        if (price) {
            buttonPriceDisplay = (
                <Text>
                    {getCurrencyPreSymbol(currency)} {formatPriceDisplay(price)}
                    <Small> {currency}</Small>
                </Text>
            );
        }

        let determinedShowAmount = (
            <PriceDisplay
                coinType={coinType}
                price={formatAmount(amount, coinDecimals)}
                symbol={coinSymbol}
                name={coinName}
            />
        );
        if (!showAmount) {
            determinedShowAmount = <React.Fragment></React.Fragment>;
        }
        return (
            <Outer>
                <Wrapper hasBorder={showBorder}>
                    <Text style={{ textAlign: 'center' }}>{text}</Text>
                    {showQR ? (
                        <ButtonQR
                            amountSatoshis={amount}
                            toAddress={to}
                            onClick={handleClick}
                            step={step}
                        >
                            {buttonPriceDisplay}
                        </ButtonQR>
                    ) : (
                        <Button onClick={handleClick} step={step}>
                            {buttonPriceDisplay}
                        </Button>
                    )}

                    {determinedShowAmount}
                </Wrapper>
            </Outer>
        );
    }
}

export type { CashtabButtonProps };

export default CashtabBase(CashtabButton);
