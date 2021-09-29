import * as React from 'react';
import styled, { css } from 'styled-components';

import {
    getCurrencyPreSymbol,
    formatPriceDisplay,
    formatAmount,
} from '../../utils/cashtab-helpers';

import CashtabBase from '../../hoc/CashtabBase';

import type { ButtonStates, CashtabBaseProps } from '../../hoc/CashtabBase';

import colors from '../../styles/colors';

import PriceDisplay from '../PriceDisplay';

import Button from '../../atoms/Button';
import ButtonQR from '../../atoms/ButtonQR';
import Small from '../../atoms/Small';
import Text from '../../atoms/Text';
import H3 from '../../atoms/H3';

const Outer = styled.div`
    display: grid;
    grid-template-columns: max-content;
`;

const Main = styled('div')<{ showBorder?: boolean }>`
    font-family: sans-serif;
    display: grid;
    grid-gap: 12px;
    padding: 12px 12px 6px;

    ${props =>
        props.showBorder &&
        css`
            border: 1px dashed ${colors.brand500};
            border-radius: 4px;
        `}
`;

const Prices = styled.div`
    display: grid;
    /* grid-template-columns: max-content max-content; */
    grid-gap: 5px;
    align-items: end;
    justify-content: end;
`;

const ButtonContainer = styled.div`
    min-height: 40px;
    display: grid;
    grid-gap: 7px;
    align-items: center;
    justify-content: flex-end;
    width: 100%;
`;

const BrandBottom = styled.div`
    display: flex;
    justify-content: flex-end;
`;

const A = styled.a`
    color: ${colors.fg500};
    text-decoration: none;
    &:hover {
        color: ${colors.brand500};
    }
`;

// Cashtab Badge Props
type CashtabBadgeProps = CashtabBaseProps & {
    text?: string;
    tag?: string;
    step: ButtonStates;

    showAmount?: boolean;
    coinSymbol: string;
    coinName: string;
    coinAmount: number;
    coinDecimals?: number;

    showBrand?: boolean;
    showQR?: boolean;
    showBorder?: boolean;

    handleClick: Function;
};

class CashtabBadge extends React.PureComponent<CashtabBadgeProps> {
    static defaultProps = {
        currency: 'USD',
        tag: 'CashTab Pay',
        text: 'Payment Total',
        showAmount: true,
        showBrand: false,
        showQR: true,
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
            coinName,
            coinDecimals,
            amount,

            text,
            tag,

            showAmount,
            showQR,

            showBorder,
            showBrand,
        } = this.props;

        // Case 1: no bip70 invoice
        let displayedPriceInfo = (
            <Prices>
                {price !== undefined && (
                    <PriceDisplay
                        preSymbol={getCurrencyPreSymbol(currency)}
                        price={formatPriceDisplay(price)}
                        symbol={currency}
                    />
                )}
                {showAmount && (
                    <PriceDisplay
                        coinType={coinType}
                        price={formatAmount(amount, coinDecimals)}
                        symbol={coinSymbol}
                        name={coinName}
                    />
                )}
            </Prices>
        );

        return (
            <Outer>
                <Main showBorder={showBorder}>
                    <H3>{text}</H3>
                    {displayedPriceInfo}

                    <ButtonContainer>
                        {showQR ? (
                            <ButtonQR
                                onClick={handleClick}
                                step={step}
                                amountSatoshis={amount}
                                toAddress={to}
                            >
                                <Text>{tag}</Text>
                            </ButtonQR>
                        ) : (
                            <Button onClick={handleClick} step={step}>
                                <Text>{tag}</Text>
                            </Button>
                        )}

                        {(step === 'install' || showBrand) && (
                            <BrandBottom>
                                <Small>
                                    <A
                                        href="https://bitcoinabc.org/"
                                        target="_blank"
                                    >
                                        What is Cashtab
                                    </A>
                                </Small>
                            </BrandBottom>
                        )}
                    </ButtonContainer>
                </Main>
            </Outer>
        );
    }
}
export type { CashtabBadgeProps };
export default CashtabBase(CashtabBadge);
