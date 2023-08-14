import * as React from 'react';
import PropTypes from 'prop-types';
import { Form, Input, Select, Checkbox } from 'antd';
import {
    ThemedDollarOutlined,
    ThemedWalletOutlined,
    ThemedAliasOutlined,
} from 'components/Common/CustomIcons';
import styled, { css } from 'styled-components';
import ScanQRCode from './ScanQRCode';
import { supportedFiatCurrencies } from 'config/cashtabSettings';
import appConfig from 'config/app';

const { TextArea } = Input;

export const AntdFormCss = css`
    input[type='number'] {
        -moz-appearance: textfield;
    }
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
        height: 45px;
    }
    textarea.ant-input,
    .ant-select-selection {
        background-color: ${props =>
            props.theme.forms.selectionBackground} !important;
        box-shadow: none !important;
        border-radius: 4px;
        font-weight: bold;
        color: ${props => props.theme.forms.text};
        opacity: 1;
        height: 50px;
        min-height: 100px;
    }
    .ant-input-affix-wrapper {
        background-color: ${props =>
            props.theme.forms.selectionBackground} !important;
        border: 1px solid ${props => props.theme.forms.border} !important;
    }
    .ant-input-wrapper .anticon-qrcode {
        color: ${props => props.theme.forms.addonForeground} !important;
    }
    input.ant-input::placeholder,
    .ant-select-selection::placeholder {
        color: ${props => props.theme.forms.placeholder} !important;
    }
    .ant-select-selector {
        height: 55px !important;
        border: 1px solid ${props => props.theme.forms.border} !important;
        background-color: ${props =>
            props.theme.forms.selectionBackground}!important;
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
    .ant-form-item-control-input-content {
        color: ${props => props.theme.forms.text} !important;
    }
    .ant-input:hover {
        border-color: ${props => props.theme.forms.highlightBox};
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
        line-height: 55px;
        text-align: left;
        color: ${props => props.theme.forms.text};
        font-weight: bold;
    }
    .ant-form-item-has-error .ant-input-group-addon {
        color: ${props => props.theme.forms.error} !important;
        border-color: ${props => props.theme.forms.error} !important;
    }
    .ant-form-item-explain .ant-form-item-explain-error {
        color: ${props => props.theme.forms.error} !important;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
        min-width: 1px;
    }
    .ant-input-suffix {
        color: ${props => props.theme.lightWhite};
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

export const CashtabCheckbox = styled(Checkbox)`
    .ant-checkbox-checked .ant-checkbox-inner {
        background-color: ${props => props.theme.eCashBlue} !important;
        border-color: ${props => props.theme.eCashBlue} !important;
    }
    .ant-checkbox + span {
        color: ${props => props.theme.forms.text} !important;
    }
`;

export const SendBchInput = ({
    onMax,
    inputProps,
    selectProps,
    activeFiatCode,
    ...otherProps
}) => {
    const { Option } = Select;
    const currencies = [
        {
            value: appConfig.ticker,
            label: appConfig.ticker,
        },
        {
            value: activeFiatCode ? activeFiatCode : 'USD',
            label: activeFiatCode ? activeFiatCode : 'USD',
        },
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
            defaultValue={appConfig.ticker}
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
                        /*event.target.blur() is used as event.preventDefault() 
                        will not work on passive targets such as onWheel */
                        onWheel={event => event.target.blur()}
                        step={
                            inputProps.dollar === 1
                                ? 0.01
                                : 1 / 10 ** appConfig.cashDecimals
                        }
                        prefix={
                            inputProps.dollar === 1 ? (
                                <ThemedDollarOutlined />
                            ) : (
                                <img
                                    src={appConfig.logo}
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
                            height: '55px',
                            lineHeight: '55px',
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

SendBchInput.propTypes = {
    onMax: PropTypes.func,
    inputProps: PropTypes.object,
    selectProps: PropTypes.object,
    activeFiatCode: PropTypes.string,
};

export const DestinationAmount = ({ onMax, inputProps, ...otherProps }) => {
    return (
        <AntdFormWrapper>
            <Form.Item {...otherProps}>
                <Input
                    type="number"
                    /*event.target.blur() is used as event.preventDefault() 
                        will not work on passive targets such as onWheel */
                    onWheel={event => event.target.blur()}
                    prefix={
                        <img
                            src={appConfig.logo}
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

DestinationAmount.propTypes = {
    onMax: PropTypes.func,
    inputProps: PropTypes.object,
};

export const InputAmountSingle = ({ inputProps, ...otherProps }) => {
    return (
        <AntdFormWrapper>
            <Form.Item {...otherProps}>
                <Input type="number" {...inputProps} />
            </Form.Item>
        </AntdFormWrapper>
    );
};

InputAmountSingle.propTypes = {
    inputProps: PropTypes.object,
};

// loadWithCameraOpen prop: if true, load page with camera scanning open
export const DestinationAddressSingle = ({
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

DestinationAddressSingle.propTypes = {
    onScan: PropTypes.func,
    loadWithCameraOpen: PropTypes.bool,
    inputProps: PropTypes.object,
};

export const DestinationAddressSingleWithoutQRScan = ({
    inputProps,
    ...otherProps
}) => {
    return (
        <AntdFormWrapper>
            <Form.Item {...otherProps}>
                <Input
                    prefix={<ThemedWalletOutlined />}
                    autoComplete="off"
                    {...inputProps}
                />
            </Form.Item>
        </AntdFormWrapper>
    );
};

DestinationAddressSingleWithoutQRScan.propTypes = {
    inputProps: PropTypes.object,
};

export const AliasInput = ({ inputProps, ...otherProps }) => {
    return (
        <AntdFormWrapper>
            <Form.Item {...otherProps}>
                <Input
                    prefix={<ThemedAliasOutlined />}
                    autoComplete="off"
                    {...inputProps}
                />
            </Form.Item>
        </AntdFormWrapper>
    );
};

AliasInput.propTypes = {
    inputProps: PropTypes.object,
};

export const AliasAddressInput = ({ inputProps, ...otherProps }) => {
    return (
        <AntdFormWrapper>
            <Form.Item {...otherProps}>
                <Input
                    prefix={<ThemedWalletOutlined />}
                    autoComplete="off"
                    {...inputProps}
                />
            </Form.Item>
        </AntdFormWrapper>
    );
};

AliasAddressInput.propTypes = {
    inputProps: PropTypes.object,
};

export const DestinationAddressMulti = ({ inputProps, ...otherProps }) => {
    return (
        <AntdFormWrapper>
            <Form.Item {...otherProps}>
                <TextArea
                    style={{ height: '189px' }}
                    prefix={<ThemedWalletOutlined />}
                    autoComplete="off"
                    {...inputProps}
                />
            </Form.Item>
        </AntdFormWrapper>
    );
};

DestinationAddressMulti.propTypes = {
    inputProps: PropTypes.object,
};

export const CurrencySelectDropdown = selectProps => {
    const { Option } = Select;

    // Build select dropdown from supportedFiatCurrencies
    const currencyMenuOptions = [];
    const currencyKeys = Object.keys(supportedFiatCurrencies);
    for (let i = 0; i < currencyKeys.length; i += 1) {
        const currencyMenuOption = {};
        currencyMenuOption.value =
            supportedFiatCurrencies[currencyKeys[i]].slug;
        currencyMenuOption.label = `${
            supportedFiatCurrencies[currencyKeys[i]].name
        } (${supportedFiatCurrencies[currencyKeys[i]].symbol})`;
        currencyMenuOptions.push(currencyMenuOption);
    }
    const currencyOptions = currencyMenuOptions.map(currencyMenuOption => {
        return (
            <Option
                key={currencyMenuOption.value}
                value={currencyMenuOption.value}
                className="selectedCurrencyOption"
            >
                {currencyMenuOption.label}
            </Option>
        );
    });

    return (
        <Select
            className="select-after"
            style={{
                width: '100%',
            }}
            {...selectProps}
        >
            {currencyOptions}
        </Select>
    );
};
