// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import PropTypes from 'prop-types';
import { Form, Input, Checkbox } from 'antd';
import {
    ThemedWalletOutlined,
    ThemedAliasOutlined,
} from 'components/Common/CustomIcons';
import styled, { css } from 'styled-components';

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
        font-size: 12px;
    }
    .ant-input-suffix {
        color: ${props => props.theme.lightWhite};
    }
`;

export const AntdFormWrapper = styled.div`
    ${AntdFormCss}
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
