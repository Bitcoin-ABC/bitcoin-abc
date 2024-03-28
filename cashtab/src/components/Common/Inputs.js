// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import ScanQRCode from './ScanQRCode';
import appConfig from 'config/app';

const CashtabInputWrapper = styled.div`
    box-sizing: border-box;
    *,
    *:before,
    *:after {
        box-sizing: inherit;
    }
    width: 100%;
`;

const InputRow = styled.div`
    display: flex;
    align-items: stretch;
    input,
    button,
    select {
        border: ${props =>
            props.invalid
                ? `1px solid ${props.theme.forms.error}`
                : `1px solid ${props.theme.forms.border}`};
    }
    button,
    select {
        color: ${props =>
            props.invalid ? props.theme.forms.error : props.theme.contrast};
    }
`;

const CashtabInput = styled.input`
    background-color: ${props => props.theme.forms.selectionBackground};
    font-size: 18px;
    padding: 16px 12px;
    border-radius: 9px;
    width: 100%;
    color: ${props => props.theme.forms.text};
    :focus-visible {
        outline: none;
    }
`;

const ModalInputField = styled(CashtabInput)`
    background-color: transparent;
    border: ${props =>
        props.invalid
            ? `1px solid ${props.theme.forms.error}`
            : `1px solid ${props.theme.eCashBlue} !important`};
`;

const CashtabTextArea = styled.textarea`
    background-color: ${props => props.theme.forms.selectionBackground};
    font-size: 12px;
    padding: 16px 12px;
    border-radius: 9px;
    width: 100%;
    color: ${props => props.theme.forms.text};
    :focus-visible {
        outline: none;
    }
    height: 142px;
`;

const LeftInput = styled(CashtabInput)`
    border-radius: 9px 0 0 9px;
`;

const OnMaxBtn = styled.button`
    cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
    color: ${props =>
        props.invalid ? props.theme.forms.error : props.theme.contrast};
    border-radius 0 9px 9px 0;
    background-color: ${props => props.theme.forms.selectionBackground};    
    border-left: none !important;
    font-size: 18px;
    padding: 16px;    
`;

const OnMaxBtnToken = styled(OnMaxBtn)`
    padding: 12px;
    min-width: 59px;
`;

const CurrencyDropdown = styled.select`
    width: 100px;
    cursor: pointer;
    font-size: 18px;
    padding: 6px;
    color: ${props =>
        props.invalid ? props.theme.forms.error : props.theme.contrast};
    border-left: none !important;
    background-color: ${props => props.theme.forms.selectionBackground};
    :focus-visible {
        outline: none;
    }
`;
const CurrencyOption = styled.option`
    text-align: left;
    background-color: ${props => props.theme.forms.selectionBackground};
    :hover {
        background-color: ${props => props.theme.forms.selectionBackground};
    }
`;

const ErrorMsg = styled.div`
    font-size: 14px;
    color: ${props => props.theme.forms.error};
`;

export const InputFlex = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 12px;
`;

export const Input = ({
    placeholder = '',
    name = '',
    value = '',
    handleInput,
    error = false,
}) => {
    return (
        <CashtabInputWrapper>
            <InputRow invalid={typeof error === 'string'}>
                <CashtabInput
                    name={name}
                    value={value}
                    placeholder={placeholder}
                    invalid={typeof error === 'string'}
                    onChange={e => handleInput(e)}
                />
            </InputRow>
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

Input.propTypes = {
    placeholder: PropTypes.string,
    name: PropTypes.string,
    value: PropTypes.string,
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    handleInput: PropTypes.func,
};

export const ModalInput = ({
    placeholder = '',
    name = '',
    value = '',
    handleInput,
    error = false,
}) => {
    return (
        <CashtabInputWrapper>
            <InputRow invalid={typeof error === 'string'}>
                <ModalInputField
                    name={name}
                    value={value}
                    placeholder={placeholder}
                    invalid={typeof error === 'string'}
                    onChange={e => handleInput(e)}
                />
            </InputRow>
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

ModalInput.propTypes = {
    placeholder: PropTypes.string,
    name: PropTypes.string,
    value: PropTypes.string,
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    handleInput: PropTypes.func,
};

export const TextArea = ({
    placeholder = '',
    name = '',
    value = '',
    handleInput,
    error = false,
}) => {
    return (
        <CashtabInputWrapper>
            <CashtabTextArea
                placeholder={placeholder}
                name={name}
                value={value}
                onChange={e => handleInput(e)}
                invalid={typeof error === 'string'}
            />
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

TextArea.propTypes = {
    placeholder: PropTypes.string,
    name: PropTypes.string,
    value: PropTypes.string,
    handleInput: PropTypes.func,
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
};

export const InputWithScanner = ({
    placeholder = '',
    name = '',
    value = '',
    disabled = false,
    handleInput,
    error = false,
    loadWithScannerOpen,
}) => {
    return (
        <CashtabInputWrapper>
            <InputRow invalid={typeof error === 'string'}>
                <LeftInput
                    name={name}
                    value={value}
                    disabled={disabled}
                    placeholder={placeholder}
                    invalid={typeof error === 'string'}
                    onChange={e => handleInput(e)}
                />
                <ScanQRCode
                    loadWithScannerOpen={loadWithScannerOpen}
                    onScan={result =>
                        handleInput({
                            target: {
                                name: 'address',
                                value: result,
                            },
                        })
                    }
                />
            </InputRow>
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

InputWithScanner.propTypes = {
    placeholder: PropTypes.string,
    name: PropTypes.string,
    value: PropTypes.string,
    disabled: PropTypes.bool,
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    handleInput: PropTypes.func,
    loadWithScannerOpen: PropTypes.bool,
};

export const SendXecInput = ({
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
                    onChange={e => handleInput(e)}
                    disabled={inputDisabled}
                />
                <CurrencyDropdown
                    data-testid="currency-select-dropdown"
                    value={selectValue}
                    onChange={e => handleSelect(e)}
                    disabled={selectDisabled}
                >
                    <CurrencyOption data-testid="xec-option" value="XEC">
                        XEC
                    </CurrencyOption>
                    <CurrencyOption data-testid="fiat-option" value={fiatCode}>
                        {fiatCode}
                    </CurrencyOption>
                </CurrencyDropdown>
                <OnMaxBtn
                    onClick={handleOnMax}
                    // Disable the onMax button if the user has fiat selected
                    disabled={selectValue !== appConfig.ticker}
                >
                    max
                </OnMaxBtn>
            </InputRow>
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

SendXecInput.propTypes = {
    name: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    inputDisabled: PropTypes.bool,
    selectValue: PropTypes.string,
    selectDisabled: PropTypes.bool,
    fiatCode: PropTypes.string,
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    handleInput: PropTypes.func,
    handleSelect: PropTypes.func,
    handleOnMax: PropTypes.func,
};

export const SendTokenInput = ({
    name = '',
    placeholder = '',
    value = 0,
    inputDisabled = false,
    decimals = 0,
    error = false,
    handleInput,
    handleOnMax,
}) => {
    return (
        <CashtabInputWrapper>
            <InputRow invalid={typeof error === 'string'}>
                <LeftInput
                    placeholder={placeholder}
                    type="number"
                    step={1 / 10 ** decimals}
                    name={name}
                    value={value}
                    onChange={e => handleInput(e)}
                    disabled={inputDisabled}
                />
                <OnMaxBtnToken onClick={handleOnMax}>max</OnMaxBtnToken>
            </InputRow>
            <ErrorMsg>{typeof error === 'string' ? error : ''}</ErrorMsg>
        </CashtabInputWrapper>
    );
};

SendTokenInput.propTypes = {
    name: PropTypes.string,
    placeholder: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    decimals: PropTypes.number,
    inputDisabled: PropTypes.bool,
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    handleInput: PropTypes.func,
    handleOnMax: PropTypes.func,
};

const CashtabSlider = styled.input`
    width: 100%;
`;
export const Slider = ({ name, value, min, max, step, handleSlide }) => {
    return (
        <CashtabSlider
            type="range"
            name={name}
            value={value}
            min={min}
            max={max}
            step={step}
            aria-labelledby={name}
            onChange={e => {
                handleSlide(e.target.value);
            }}
        />
    );
};
Slider.propTypes = {
    name: PropTypes.string,
    placeholder: PropTypes.string,
    value: PropTypes.number,
    min: PropTypes.number,
    max: PropTypes.number,
    step: PropTypes.number,
    handleSlide: PropTypes.func,
};

const InputFile = styled.input`
    display: none;
`;
const DragForm = styled.form`
    height: 16rem;
    width: 28rem;
    max-width: 100%;
    text-align: center;
    position: relative;
`;
const DragLabel = styled.label`
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    border: 2px dashed
        ${props =>
            props.dragActive ? props.theme.eCashBlue : props.theme.darkBlue};
    background-color: ${props =>
        props.dragActive ? props.theme.eCashBlue : '#f8fafc'};
`;
const UploadText = styled.div`
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1rem;
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
export const CashtabDragger = ({ name, handleFile, imageUrl }) => {
    // drag state
    const [dragActive, setDragActive] = useState(false);

    // handle drag events
    const handleDrag = e => {
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

    const handleDrop = function (e) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    // User adds file by clicking the component
    const handleChange = function (e) {
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
                            Drag and drop a png or jpg for your token icon
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
CashtabDragger.propTypes = {
    name: PropTypes.string,
    handleFile: PropTypes.func,
    imageUrl: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
};
