import * as React from 'react';
import { Form, Input, Select } from 'antd';
import {
    ThemedDollarOutlined,
    ThemedWalletOutlined,
} from '@components/Common/CustomIcons';
import styled, { css } from 'styled-components';
import { ScanQRCode } from './ScanQRCode';
import useBCH from '@hooks/useBCH';
import { currency } from '@components/Common/Ticker.js';

export const AntdFormCss = css`
    .ant-input-group-addon {
        background-color: ${props =>
            props.theme.forms.addonBackground} !important;
        border: 1px solid ${props => props.theme.forms.border};
        color: ${props => props.theme.forms.addonForeground} !important;
    }
    input.ant-input,
    .ant-select-selection {
        background-color: ${props =>
            props.theme.forms.selectionBackground} !important;
        box-shadow: none !important;
        border-radius: 4px;
        font-weight: bold;
        color: ${props => props.theme.forms.text};
        opacity: 1;
        height: 50px;
    }
    .ant-input-affix-wrapper {
        background-color: ${props => props.theme.forms.selectionBackground};
        border: 1px solid ${props => props.theme.wallet.borders.color} !important;
    }
    .ant-select-selector {
        height: 60px !important;
        border: 1px solid ${props => props.theme.wallet.borders.color} !important;
    }
    .ant-form-item-has-error
        > div
        > div.ant-form-item-control-input
        > div
        > span
        > span
        > span.ant-input-affix-wrapper {
        background-color: ${props => props.theme.forms.selectionBackground};
        border-color: ${props => props.theme.forms.error} !important;
    }

    .ant-form-item-has-error .ant-input,
    .ant-form-item-has-error .ant-input-affix-wrapper,
    .ant-form-item-has-error .ant-input:hover,
    .ant-form-item-has-error .ant-input-affix-wrapper:hover {
        background-color: ${props => props.theme.forms.selectionBackground};
        border-color: ${props => props.theme.forms.error} !important;
    }

    .ant-form-item-has-error
        .ant-select:not(.ant-select-disabled):not(.ant-select-customize-input)
        .ant-select-selector {
        background-color: ${props => props.theme.forms.selectionBackground};
        border-color: ${props => props.theme.forms.error} !important;
    }
    .ant-select-single .ant-select-selector .ant-select-selection-item,
    .ant-select-single .ant-select-selector .ant-select-selection-placeholder {
        line-height: 60px;
        text-align: left;
        color: ${props => props.theme.forms.text};
        font-weight: bold;
    }
    .ant-form-item-has-error .ant-input-group-addon {
        color: ${props => props.theme.forms.error} !important;
        border-color: ${props => props.theme.forms.error} !important;
    }
    .ant-form-item-explain.ant-form-item-explain-error {
        color: ${props => props.theme.forms.error} !important;
    }
`;

export const AntdFormWrapper = styled.div`
    ${AntdFormCss}
`;

export const InputAddonText = styled.span`
    width: 100%;
    height: 100%;
    display: block;

    ${props =>
        props.disabled
            ? `
      cursor: not-allowed;
      `
            : `cursor: pointer;`}
`;

export const InputNumberAddonText = styled.span`
    background-color: ${props => props.theme.forms.addonBackground} !important;
    border: 1px solid ${props => props.theme.forms.border};
    color: ${props => props.theme.forms.addonForeground} !important;
    height: 50px;
    line-height: 47px;

    * {
        color: ${props => props.theme.forms.addonForeground} !important;
    }
    ${props =>
        props.disabled
            ? `
      cursor: not-allowed;
      `
            : `cursor: pointer;`}
`;

export const SendBchInput = ({
    onMax,
    inputProps,
    selectProps,
    ...otherProps
}) => {
    const { Option } = Select;
    const currencies = [
        {
            value: currency.ticker,
            label: currency.ticker,
        },
        { value: 'USD', label: 'USD' },
    ];
    const currencyOptions = currencies.map(currency => {
        return (
            <Option
                key={currency.value}
                value={currency.value}
                className="selectedCurrencyOption"
            >
                {currency.label}
            </Option>
        );
    });

    const CurrencySelect = (
        <Select
            defaultValue={currency.ticker}
            className="select-after"
            style={{ width: '30%' }}
            {...selectProps}
        >
            {currencyOptions}
        </Select>
    );
    return (
        <AntdFormWrapper>
            <Form.Item {...otherProps}>
                <Input.Group compact>
                    <Input
                        style={{ width: '60%', textAlign: 'left' }}
                        type="number"
                        step={
                            inputProps.dollar === 1
                                ? 0.01
                                : 1 / 10 ** currency.cashDecimals
                        }
                        prefix={
                            inputProps.dollar === 1 ? (
                                <ThemedDollarOutlined />
                            ) : (
                                <img
                                    src={currency.logo}
                                    alt=""
                                    width={16}
                                    height={16}
                                />
                            )
                        }
                        {...inputProps}
                    />
                    {CurrencySelect}
                    <InputNumberAddonText
                        style={{
                            width: '10%',
                            height: '60px',
                            lineHeight: '60px',
                        }}
                        disabled={!!(inputProps || {}).disabled}
                        onClick={!(inputProps || {}).disabled && onMax}
                    >
                        max
                    </InputNumberAddonText>
                </Input.Group>
            </Form.Item>
        </AntdFormWrapper>
    );
};

export const FormItemWithMaxAddon = ({ onMax, inputProps, ...otherProps }) => {
    return (
        <AntdFormWrapper>
            <Form.Item {...otherProps}>
                <Input
                    type="number"
                    prefix={
                        <img
                            src={currency.logo}
                            alt=""
                            width={16}
                            height={16}
                        />
                    }
                    addonAfter={
                        <InputAddonText
                            disabled={!!(inputProps || {}).disabled}
                            onClick={!(inputProps || {}).disabled && onMax}
                        >
                            max
                        </InputAddonText>
                    }
                    {...inputProps}
                />
            </Form.Item>
        </AntdFormWrapper>
    );
};

// loadWithCameraOpen prop: if true, load page with camera scanning open
export const FormItemWithQRCodeAddon = ({
    onScan,
    loadWithCameraOpen,
    inputProps,
    ...otherProps
}) => {
    return (
        <AntdFormWrapper>
            <Form.Item {...otherProps}>
                <Input
                    prefix={<ThemedWalletOutlined />}
                    autoComplete="off"
                    addonAfter={
                        <ScanQRCode
                            loadWithCameraOpen={loadWithCameraOpen}
                            onScan={onScan}
                        />
                    }
                    {...inputProps}
                />
            </Form.Item>
        </AntdFormWrapper>
    );
};

export const AddressValidators = () => {
    const { BCH } = useBCH();

    return {
        safelyDetectAddressFormat: value => {
            try {
                return BCH.Address.detectAddressFormat(value);
            } catch (error) {
                return null;
            }
        },
        isSLPAddress: value =>
            AddressValidators.safelyDetectAddressFormat(value) === 'slpaddr',
        isBCHAddress: value =>
            AddressValidators.safelyDetectAddressFormat(value) === 'cashaddr',
        isLegacyAddress: value =>
            AddressValidators.safelyDetectAddressFormat(value) === 'legacy',
    }();
};
