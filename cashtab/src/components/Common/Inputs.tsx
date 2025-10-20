// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import styled from 'styled-components';
import ScanQRCode from './ScanQRCode';
import appConfig from 'config/app';
import { supportedFiatCurrencies } from 'config/CashtabSettings';

const CashtabInputWrapper = styled.div`
    box-sizing: border-box;
    *,
    *:before,
    *:after {
        box-sizing: inherit;
    }
    width: 100%;
`;

const InputRow = styled.div<{ invalid?: boolean }>`
    position: relative;
    display: flex;
    align-items: stretch;
    input,
    button,
    select {
        border: ${props =>
            props.invalid
                ? `1px solid ${props.theme.formError}`
                : `1px solid ${props.theme.border}`};
    }
    button,
    select {
        color: ${props =>
            props.invalid ? props.theme.formError : props.theme.primaryText};
    }
`;

const CashtabInput = styled.input<{ invalid?: boolean }>`
    ${props => props.disabled && `cursor: not-allowed`};
    background-color: ${props => props.theme.secondaryBackground};
    font-size: var(--text-lg);
    line-height: var(--text-lg--line-height);
    padding: 16px 12px;
    border-radius: 9px;
    width: 100%;
    color: ${props => props.theme.primaryText};
    :focus-visible {
        outline: none;
    }
    ${props => props.invalid && `border: 1px solid ${props.theme.formError}`};
`;

const ModalInputField = styled(CashtabInput)<{ invalid?: boolean }>`
    background-color: transparent;
    border: ${props =>
        props.invalid
            ? `1px solid ${props.theme.formError}`
            : `1px solid ${props.theme.accent} !important`};
`;

const CashtabTextArea = styled.textarea<{ height: number }>`
    background-color: ${props => props.theme.secondaryBackground};
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
    padding: 16px 12px;
    border-radius: 9px;
    width: 100%;
    color: ${props => props.theme.primaryText};
    :focus-visible {
        outline: none;
    }
    height: ${props => props.height}px;
    resize: none;
    ${props => props.disabled && `cursor: not-allowed`};
    &::-webkit-scrollbar {
        width: 12px;
    }
    &::-webkit-scrollbar-track {
        -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
        background-color: ${props => props.theme.accent};
        border-radius: 10px;
        height: 80%;
    }
    &::-webkit-scrollbar-thumb {
        border-radius: 10px;
        color: ${props => props.theme.accent};
        -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.5);
    }
`;

const ModalTextAreaField = styled(CashtabTextArea)<{ invalid?: boolean }>`
    background-color: transparent;
    border: ${props =>
        props.invalid
            ? `1px solid ${props.theme.formError}`
            : `1px solid ${props.theme.accent} !important`};
`;

const LeftInput = styled(CashtabInput)`
    border-radius: 9px 0 0 9px;
`;

const OnMaxBtn = styled.button<{ invalid?: boolean }>`
    cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
    color: ${props =>
        props.invalid ? props.theme.formError : props.theme.primaryText};
    border-radius: 0 9px 9px 0;
    background-color: ${props => props.theme.secondaryBackground};
    border-left: none !important;
    font-size: var(--text-lg);
    line-height: var(--text-lg--line-height);
    padding: 16px;
`;

const OnMaxBtnToken = styled(OnMaxBtn)`
    padding: 12px;
    min-width: 59px;
`;

const AliasSuffixHolder = styled(OnMaxBtn)`
    cursor: auto;
`;

const CurrencyDropdown = styled.select<{ invalid?: boolean }>`
    cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
    font-size: var(--text-lg);
    line-height: var(--text-lg--line-height);
    padding: 6px;
    color: ${props =>
        props.invalid ? props.theme.formError : props.theme.primaryText};
    background-color: ${props => props.theme.secondaryBackground};
    border-color: ${props => props.theme.border};
    :focus-visible {
        outline: none;
    }
`;
const SendXecDropdown = styled(CurrencyDropdown)`
    width: 100px;
`;

const SellPriceDropdown = styled(CurrencyDropdown)`
    width: 100px;
    border-radius: 0 9px 9px 0;
`;

const CurrencyOption = styled.option`
    text-align: left;
    background-color: ${props => props.theme.secondaryBackground};
    :hover {
        background-color: ${props => props.theme.primaryBackground};
    }
`;

const ErrorMsg = styled.div`
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
    color: ${props => props.theme.formError};
    word-break: break-all;
    min-height: 1.25rem; /* Reserve space to prevent content jumping */
`;

export const InputFlex = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 12px;
`;

export const InputLogoPrefix = styled.img`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    z-index: 1;
`;

const TextSuffix = styled.span`
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: var(--text-lg);
    line-height: var(--text-lg--line-height);
    color: ${props => props.theme.primaryText};
    font-family: 'Roboto Mono', monospace;
    z-index: 1;
    pointer-events: none;
`;

interface InputLogoPrefixProps {
    src: string;
    alt: string;
}

interface InputProps {
    placeholder: string;
    name: string;
    value: null | string;
    disabled?: boolean;
    handleInput: React.ChangeEventHandler<HTMLInputElement>;
    error?: string | boolean;
    type?: string;
    style?: React.CSSProperties;
    prefix?: InputLogoPrefixProps;
    suffix?: string;
    autocomplete?: string;
    spellCheck?: boolean;
    autoCorrect?: string;
    autoCapitalize?: string;
}
export const Input: React.FC<InputProps> = ({
    placeholder = '',
    name = '',
    value = '',
    disabled = false,
    handleInput,
    error = false,
    type = 'text',
    style,
    prefix,
    suffix,
    autocomplete = 'off',
    spellCheck = false,
    autoCorrect = 'off',
    autoCapitalize = 'off',
}) => {
    return (
        <CashtabInputWrapper>
            <InputRow invalid={typeof error === 'string'}>
                {typeof prefix !== 'undefined' && (
                    <InputLogoPrefix src={prefix.src} alt={prefix.alt} />
                )}
                <CashtabInput
                    name={name}
                    style={style}
                    value={value === null ? '' : value}
                    placeholder={placeholder}
                    disabled={disabled}
                    invalid={typeof error === 'string'}
                    onChange={handleInput}
                    onWheel={(e: React.WheelEvent<HTMLInputElement>) => {
                        (e.target as HTMLInputElement).blur();
                    }}
                    type={type}
                    autoComplete={autocomplete}
                    spellCheck={spellCheck}
                    autoCorrect={autoCorrect}
                    autoCapitalize={autoCapitalize}
                />
                {typeof suffix !== 'undefined' && (
                    <TextSuffix>{suffix}</TextSuffix>
                )}
            </InputRow>
            <ErrorMsg>{typeof error === 'string' ? error : ' '}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

interface ModalInputProps {
    placeholder: string;
    name: string;
    value: null | string;
    handleInput: React.ChangeEventHandler<HTMLInputElement>;
    error: string | boolean;
    type?: string;
    autocomplete?: string;
    spellCheck?: boolean;
    autoCorrect?: string;
    autoCapitalize?: string;
}
export const ModalInput: React.FC<ModalInputProps> = ({
    placeholder = '',
    name = '',
    value = '',
    handleInput,
    error = false,
    type = 'text',
    autocomplete = 'off',
    spellCheck = false,
    autoCorrect = 'off',
    autoCapitalize = 'off',
}) => {
    return (
        <CashtabInputWrapper>
            <InputRow invalid={typeof error === 'string'}>
                <ModalInputField
                    name={name}
                    value={value === null ? '' : value}
                    placeholder={placeholder}
                    invalid={typeof error === 'string'}
                    onChange={e => handleInput(e)}
                    type={type}
                    autoComplete={autocomplete}
                    spellCheck={spellCheck}
                    autoCorrect={autoCorrect}
                    autoCapitalize={autoCapitalize}
                />
            </InputRow>
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

const Count = styled.span<{ invalid?: boolean }>`
    color: ${props =>
        props.invalid ? props.theme.secondaryAccent : props.theme.primaryText};
`;
const CountHolder = styled.div`
    color: ${props => props.theme.primaryText};
`;
const CountAndErrorFlex = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;
const TextAreaErrorMsg = styled.div`
    order: 0;
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
    color: ${props => props.theme.formError};
    word-break: break-all;
    min-height: 1.25rem; /* Reserve space to prevent content jumping */
`;

interface TextAreaProps {
    placeholder: string;
    name: string;
    value: string | null;
    handleInput?: React.ChangeEventHandler<HTMLTextAreaElement>;
    disabled?: boolean;
    height?: number;
    error?: string | boolean;
    showCount?: boolean;
    customCount?: boolean | number;
    max?: string | number;
    autocomplete?: string;
    spellCheck?: boolean;
    autoCorrect?: string;
    autoCapitalize?: string;
}
export const TextArea: React.FC<TextAreaProps> = ({
    placeholder = '',
    name = '',
    value = '',
    handleInput,
    disabled = false,
    height = 142,
    error = false,
    showCount = false,
    customCount = false,
    max = '',
    autocomplete = 'off',
    spellCheck = false,
    autoCorrect = 'off',
    autoCapitalize = 'off',
}) => {
    return (
        <CashtabInputWrapper>
            <CashtabTextArea
                placeholder={placeholder}
                name={name}
                value={value === null ? '' : value}
                height={height}
                disabled={disabled}
                onChange={handleInput}
                autoComplete={autocomplete}
                spellCheck={spellCheck}
                autoCorrect={autoCorrect}
                autoCapitalize={autoCapitalize}
            />
            <CountAndErrorFlex>
                <TextAreaErrorMsg>
                    {typeof error === 'string' ? error : ''}
                </TextAreaErrorMsg>
                {showCount && (
                    <CountHolder>
                        <Count invalid={typeof error === 'string'}>
                            {customCount !== false
                                ? customCount
                                : value === null
                                ? 0
                                : value.length}
                        </Count>
                        /{max}
                    </CountHolder>
                )}
            </CountAndErrorFlex>
        </CashtabInputWrapper>
    );
};

interface ModalTextAreaProps {
    placeholder: string;
    name: string;
    value: string | null;
    handleInput?: React.ChangeEventHandler<HTMLTextAreaElement>;
    disabled?: boolean;
    height?: number;
    error?: string | boolean;
    autocomplete?: string;
    spellCheck?: boolean;
    autoCorrect?: string;
    autoCapitalize?: string;
}
export const ModalTextArea: React.FC<ModalTextAreaProps> = ({
    placeholder = '',
    name = '',
    value = '',
    handleInput,
    disabled = false,
    height = 142,
    error = false,
    autocomplete = 'off',
    spellCheck = false,
    autoCorrect = 'off',
    autoCapitalize = 'off',
}) => {
    return (
        <CashtabInputWrapper>
            <ModalTextAreaField
                placeholder={placeholder}
                name={name}
                value={value === null ? '' : value}
                height={height}
                disabled={disabled}
                onChange={handleInput}
                invalid={typeof error === 'string'}
                autoComplete={autocomplete}
                spellCheck={spellCheck}
                autoCorrect={autoCorrect}
                autoCapitalize={autoCapitalize}
            />
            <CountAndErrorFlex>
                <TextAreaErrorMsg>
                    {typeof error === 'string' ? error : ''}
                </TextAreaErrorMsg>
            </CountAndErrorFlex>
        </CashtabInputWrapper>
    );
};

interface InputWithScannerProps {
    placeholder: string;
    name: string;
    value: null | string;
    disabled?: boolean;
    handleInput: React.ChangeEventHandler<HTMLInputElement>;
    error: false | string;
    autocomplete?: string;
    spellCheck?: boolean;
    autoCorrect?: string;
    autoCapitalize?: string;
}
export const InputWithScanner: React.FC<InputWithScannerProps> = ({
    placeholder = '',
    name = '',
    value = '',
    disabled = false,
    handleInput,
    error = false,
    autocomplete = 'off',
    spellCheck = false,
    autoCorrect = 'off',
    autoCapitalize = 'off',
}) => {
    return (
        <CashtabInputWrapper>
            <InputRow invalid={typeof error === 'string'}>
                <LeftInput
                    name={name}
                    value={value === null ? '' : value}
                    disabled={disabled}
                    placeholder={placeholder}
                    invalid={typeof error === 'string'}
                    onChange={handleInput}
                    autoComplete={autocomplete}
                    spellCheck={spellCheck}
                    autoCorrect={autoCorrect}
                    autoCapitalize={autoCapitalize}
                />
                <ScanQRCode
                    onScan={result =>
                        handleInput({
                            target: {
                                name: 'address',
                                value: result,
                            },
                        } as unknown as React.ChangeEvent<HTMLInputElement>)
                    }
                />
            </InputRow>
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

interface SendXecInputProps {
    name: string;
    value: string | number;
    selectValue: string;
    inputDisabled: boolean;
    selectDisabled: boolean;
    fiatCode: string;
    error: false | string;
    handleInput: React.ChangeEventHandler<HTMLInputElement>;
    handleSelect: React.ChangeEventHandler<HTMLSelectElement>;
    handleOnMax: () => void;
    autocomplete?: string;
    spellCheck?: boolean;
    autoCorrect?: string;
    autoCapitalize?: string;
}
export const SendXecInput: React.FC<SendXecInputProps> = ({
    name = '',
    value = 0,
    inputDisabled = false,
    selectValue = '',
    selectDisabled = false,
    fiatCode = 'USD',
    error = false,
    handleInput,
    handleSelect,
    handleOnMax,
    autocomplete = 'off',
    spellCheck = false,
    autoCorrect = 'off',
    autoCapitalize = 'off',
}) => {
    return (
        <CashtabInputWrapper>
            <InputRow invalid={typeof error === 'string'}>
                <LeftInput
                    placeholder="Amount"
                    type="number"
                    step="0.01"
                    name={name}
                    value={value}
                    onChange={handleInput}
                    disabled={inputDisabled}
                    autoComplete={autocomplete}
                    spellCheck={spellCheck}
                    autoCorrect={autoCorrect}
                    autoCapitalize={autoCapitalize}
                />
                <SendXecDropdown
                    data-testid="currency-select-dropdown"
                    value={selectValue}
                    onChange={handleSelect}
                    disabled={selectDisabled}
                >
                    <CurrencyOption data-testid="xec-option" value="XEC">
                        XEC
                    </CurrencyOption>
                    <CurrencyOption data-testid="fiat-option" value={fiatCode}>
                        {fiatCode}
                    </CurrencyOption>
                </SendXecDropdown>
                <OnMaxBtn
                    onClick={handleOnMax}
                    // Disable the onMax button if the user has fiat selected
                    disabled={selectValue !== appConfig.ticker || inputDisabled}
                >
                    max
                </OnMaxBtn>
            </InputRow>
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

interface SendTokenInputProps {
    name: string;
    placeholder: string;
    value: number | string;
    inputDisabled?: boolean;
    error: false | string;
    handleInput: React.ChangeEventHandler<HTMLInputElement>;
    handleOnMax: () => void;
    autocomplete?: string;
    spellCheck?: boolean;
    autoCorrect?: string;
    autoCapitalize?: string;
}
export const SendTokenInput: React.FC<SendTokenInputProps> = ({
    name = '',
    placeholder = '',
    value = 0,
    inputDisabled = false,
    error = false,
    handleInput,
    handleOnMax,
    autocomplete = 'off',
    spellCheck = false,
    autoCorrect = 'off',
    autoCapitalize = 'off',
}) => {
    return (
        <CashtabInputWrapper>
            <InputRow invalid={typeof error === 'string'}>
                <LeftInput
                    placeholder={placeholder}
                    name={name}
                    value={value}
                    onChange={e => handleInput(e)}
                    disabled={inputDisabled}
                    autoComplete={autocomplete}
                    spellCheck={spellCheck}
                    autoCorrect={autoCorrect}
                    autoCapitalize={autoCapitalize}
                />
                <OnMaxBtnToken onClick={handleOnMax}>max</OnMaxBtnToken>
            </InputRow>
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

/**
 * We only render this input from bip21 input into other fields
 * So, it is always disabled
 * But it needs to validate for slp decimals, since this info may not
 * be available until we render this component
 */
interface SendTokenBip21InputProps {
    name: string;
    placeholder: string;
    value: string;
    error?: false | string;
    autocomplete?: string;
    spellCheck?: boolean;
    autoCorrect?: string;
    autoCapitalize?: string;
}
export const SendTokenBip21Input: React.FC<SendTokenBip21InputProps> = ({
    name,
    placeholder,
    value,
    error = false,
    autocomplete = 'off',
    spellCheck = false,
    autoCorrect = 'off',
    autoCapitalize = 'off',
}) => {
    return (
        <CashtabInputWrapper>
            <InputRow invalid={typeof error === 'string'}>
                <CashtabInput
                    name={name}
                    placeholder={placeholder}
                    value={value}
                    disabled
                    autoComplete={autocomplete}
                    spellCheck={spellCheck}
                    autoCorrect={autoCorrect}
                    autoCapitalize={autoCapitalize}
                />
            </InputRow>
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

interface ListPriceInputProps {
    name: string;
    placeholder: string;
    value: null | number | string;
    inputDisabled?: boolean;
    selectValue: string;
    selectDisabled: boolean;
    fiatCode: string;
    error: false | string;
    handleInput: React.ChangeEventHandler<HTMLInputElement>;
    handleSelect: React.ChangeEventHandler<HTMLSelectElement>;
    autocomplete?: string;
    spellCheck?: boolean;
    autoCorrect?: string;
    autoCapitalize?: string;
}
export const ListPriceInput: React.FC<ListPriceInputProps> = ({
    name = 'listPriceInput',
    placeholder = 'listPriceInput',
    value = 0,
    inputDisabled = false,
    selectValue = '',
    selectDisabled = false,
    fiatCode = 'USD',
    error = false,
    handleInput,
    handleSelect,
    autocomplete = 'off',
    spellCheck = false,
    autoCorrect = 'off',
    autoCapitalize = 'off',
}) => {
    return (
        <CashtabInputWrapper>
            <InputRow invalid={typeof error === 'string'}>
                <LeftInput
                    name={name}
                    placeholder={placeholder}
                    type="number"
                    value={value === null ? '' : value}
                    onChange={handleInput}
                    disabled={inputDisabled}
                    invalid={typeof error === 'string'}
                    onWheel={(e: React.WheelEvent<HTMLInputElement>) => {
                        (e.target as HTMLInputElement).blur();
                    }}
                    autoComplete={autocomplete}
                    spellCheck={spellCheck}
                    autoCorrect={autoCorrect}
                    autoCapitalize={autoCapitalize}
                />
                <SellPriceDropdown
                    data-testid="currency-select-dropdown"
                    value={selectValue}
                    onChange={handleSelect}
                    disabled={selectDisabled}
                >
                    <CurrencyOption data-testid="xec-option" value="XEC">
                        XEC
                    </CurrencyOption>
                    <CurrencyOption data-testid="fiat-option" value={fiatCode}>
                        {fiatCode}
                    </CurrencyOption>
                </SellPriceDropdown>
            </InputRow>
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

interface AliasInputProps {
    name: string;
    placeholder: string;
    value: string;
    inputDisabled: boolean;
    error: false | string;
    handleInput: React.ChangeEventHandler<HTMLInputElement>;
    autocomplete?: string;
    spellCheck?: boolean;
    autoCorrect?: string;
    autoCapitalize?: string;
}
export const AliasInput: React.FC<AliasInputProps> = ({
    name = '',
    placeholder = '',
    value = '',
    inputDisabled = false,
    error = false,
    handleInput,
    autocomplete = 'off',
    spellCheck = false,
    autoCorrect = 'off',
    autoCapitalize = 'off',
}) => {
    return (
        <CashtabInputWrapper>
            <InputRow invalid={typeof error === 'string'}>
                <LeftInput
                    placeholder={placeholder}
                    type="string"
                    name={name}
                    value={value}
                    onChange={e => handleInput(e)}
                    disabled={inputDisabled}
                    autoComplete={autocomplete}
                    spellCheck={spellCheck}
                    autoCorrect={autoCorrect}
                    autoCapitalize={autoCapitalize}
                />
                <AliasSuffixHolder>.xec</AliasSuffixHolder>
            </InputRow>
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

const CashtabSlider = styled.input<{
    fixedWidth?: boolean;
    isInvalid?: boolean;
}>`
    width: ${props => (props.fixedWidth ? '256px' : '100%')};
    accent-color: ${props =>
        props.isInvalid ? props.theme.error : props.theme.accent};
`;
const SliderInput = styled.input<{ invalid?: boolean }>`
    ${props => props.disabled && `cursor: not-allowed`};
    background-color: ${props => props.theme.secondaryBackground};
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    padding: 6px;
    border-radius: 4px;
    text-align: right;
    border: ${props =>
        props.invalid ? `1px solid ${props.theme.formError}` : `none`};
    width: 100%;
    color: ${props => props.theme.primaryText};
    margin-top: 5px;
    :focus-visible {
        outline: none;
    }
`;
export const SliderLabel = styled.span`
    color: ${props => props.theme.primaryText};
    width: 25%;
    text-align: right;
    line-height: 14px;
`;
export const LabelAndInputFlex = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 3px;
`;

interface SliderProps {
    name: string;
    value: string;
    error?: false | string;
    min: number | string;
    max: number | string;
    step: number | string;
    handleSlide: React.ChangeEventHandler<HTMLInputElement>;
    fixedWidth?: boolean;
    allowTypedInput?: boolean;
    label?: string;
    disabled?: boolean;
}
export const Slider: React.FC<SliderProps> = ({
    name,
    value,
    error = false,
    min,
    max,
    step,
    handleSlide,
    fixedWidth,
    allowTypedInput,
    label,
    disabled = false,
}) => {
    return (
        <CashtabInputWrapper>
            <CashtabSlider
                type="range"
                name={name}
                value={value}
                min={min}
                max={max}
                step={step}
                aria-labelledby={name}
                onChange={handleSlide}
                isInvalid={typeof error === 'string'}
                fixedWidth={fixedWidth}
                disabled={disabled}
            />
            {allowTypedInput && (
                <LabelAndInputFlex>
                    {typeof label === 'string' && (
                        <SliderLabel>
                            {label}
                            {':'}
                        </SliderLabel>
                    )}
                    <SliderInput
                        name={`${name}-typed`}
                        value={value}
                        placeholder={typeof label === 'string' ? label : name}
                        invalid={typeof error === 'string'}
                        onChange={handleSlide}
                        disabled={disabled}
                        type="number"
                        onWheel={(e: React.WheelEvent<HTMLInputElement>) => {
                            (e.target as HTMLInputElement).blur();
                        }}
                    ></SliderInput>
                </LabelAndInputFlex>
            )}
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

const InputFile = styled.input`
    display: none;
`;
const DragForm = styled.form`
    height: 16rem;
    width: 100%;
    max-width: 100%;
    text-align: center;
    position: relative;
`;
const DragLabel = styled.label<{ dragActive?: boolean }>`
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    border: 2px dashed
        ${props =>
            props.dragActive ? props.theme.primaryText : props.theme.accent};
    background-color: ${props =>
        props.dragActive ? props.theme.accent : props.theme.primaryText};
`;
const UploadText = styled.div`
    cursor: pointer;
    padding: 0.25rem;
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    border: none;
    background-color: transparent;
    &:hover {
        text-decoration-line: underline;
    }
`;
const DragText = styled.p``;
const DragHolder = styled.div``;
const DragFileElement = styled.div`
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 1rem;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
`;
const TokenIconPreview = styled.img`
    width: 242px;
    height: 242px;
`;
interface CashtabDraggerProps {
    name: string;
    handleFile: (file: File) => void;
    imageUrl: string;
    nft?: boolean;
}
export const CashtabDragger: React.FC<CashtabDraggerProps> = ({
    name,
    handleFile,
    imageUrl,
    nft = false,
}) => {
    // drag state
    const [dragActive, setDragActive] = useState(false);

    // handle drag events
    const handleDrag = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            // Update component state for drag enter
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            // Update component state for drag exit
            setDragActive(false);
        }
    };

    const handleDrop = function (e: React.DragEvent<HTMLElement>) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    // User adds file by clicking the component
    const handleChange = function (e: React.ChangeEvent<HTMLInputElement>) {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    return (
        <DragForm
            id="form-file-upload"
            onDragEnter={handleDrag}
            onSubmit={e => e.preventDefault()}
        >
            <InputFile
                name={name}
                type="file"
                id="input-file-upload"
                multiple={false}
                onChange={handleChange}
            />
            <DragLabel
                id="label-file-upload"
                htmlFor="input-file-upload"
                dragActive={dragActive}
            >
                {imageUrl ? (
                    <TokenIconPreview src={imageUrl} alt="token icon" />
                ) : (
                    <DragHolder>
                        <DragText>
                            Drag and drop a png or jpg for your{' '}
                            {nft ? 'NFT' : 'token icon'}
                        </DragText>
                        <UploadText>or click to upload</UploadText>
                    </DragHolder>
                )}
            </DragLabel>
            {dragActive && (
                <DragFileElement
                    id="drag-file-element"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                ></DragFileElement>
            )}
        </DragForm>
    );
};

interface CurrencySelectProps {
    name: string;
    value: string;
    handleSelect: React.ChangeEventHandler<HTMLSelectElement>;
}
interface CurrencyMenuOption {
    value?: string;
    label?: string;
}
export const CurrencySelect: React.FC<CurrencySelectProps> = ({
    name = 'select',
    value,
    handleSelect,
}) => {
    // Build select dropdown from supportedFiatCurrencies
    const currencyMenuOptions: CurrencyMenuOption[] = [];
    const currencyKeys = Object.keys(supportedFiatCurrencies);
    for (let i = 0; i < currencyKeys.length; i += 1) {
        const currencyMenuOption: CurrencyMenuOption = {};
        currencyMenuOption.value =
            supportedFiatCurrencies[currencyKeys[i]].slug;
        currencyMenuOption.label = `${
            supportedFiatCurrencies[currencyKeys[i]].name
        } (${supportedFiatCurrencies[currencyKeys[i]].symbol})`;
        currencyMenuOptions.push(currencyMenuOption);
    }
    const currencyOptions = currencyMenuOptions.map(currencyMenuOption => {
        return (
            <CurrencyOption
                key={currencyMenuOption.value}
                value={currencyMenuOption.value}
                data-testid={currencyMenuOption.value}
            >
                {currencyMenuOption.label}
            </CurrencyOption>
        );
    });

    return (
        <CurrencyDropdown
            data-testid={name}
            value={value}
            onChange={handleSelect}
        >
            {currencyOptions}
        </CurrencyDropdown>
    );
};
