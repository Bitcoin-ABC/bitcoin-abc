import * as React from 'react';
import { Form, Input, Icon, Select } from 'antd';
import styled from 'styled-components';
import { ScanQRCode } from './ScanQRCode';
import useBCH from '../../hooks/useBCH';
import { currency } from '../Common/Ticker.js';

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
    background-color: #f4f4f4 !important;
    border: 1px solid rgb(234, 237, 243);
    color: #3e3f42 !important;
    height: 50px;
    line-height: 47px;

    * {
        color: #3e3f42 !important;
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
            <Option key={currency.value} value={currency.value}>
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
        <Form.Item {...otherProps}>
            <Input.Group compact>
                <Input
                    style={{ width: '60%' }}
                    type="number"
                    step="0.01"
                    prefix={
                        inputProps.dollar === 1 ? (
                            <Icon type="dollar" />
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
                    style={{ width: '10%' }}
                    disabled={!!(inputProps || {}).disabled}
                    onClick={!(inputProps || {}).disabled && onMax}
                >
                    max
                </InputNumberAddonText>
            </Input.Group>
        </Form.Item>
    );
};

export const FormItemWithMaxAddon = ({ onMax, inputProps, ...otherProps }) => {
    return (
        <Form.Item {...otherProps}>
            <Input
                type="number"
                prefix={
                    <img src={currency.logo} alt="" width={16} height={16} />
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
        <Form.Item {...otherProps}>
            <Input
                prefix={<Icon type="wallet" />}
                addonAfter={
                    <ScanQRCode
                        loadWithCameraOpen={loadWithCameraOpen}
                        onScan={onScan}
                    />
                }
                {...inputProps}
            />
        </Form.Item>
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
