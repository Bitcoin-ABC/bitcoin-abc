// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import styled from 'styled-components';
import { Form, Input } from 'antd';
import { WalletContext } from 'wallet/context';
import { CustomCollapseCtn } from 'components/Common/StyledCollapse';
import {
    AntdFormWrapper,
    DestinationAddressSingleWithoutQRScan,
} from 'components/Common/EnhancedInputs';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import { ThemedCopySolid } from 'components/Common/CustomIcons';
import PrimaryButton, {
    SecondaryButton,
} from 'components/Common/PrimaryButton';
import { PlusSquareOutlined } from '@ant-design/icons';
import { isValidAliasSendInput } from 'validation';
import xecMessage from 'bitcoinjs-message';
import * as utxolib from '@bitgo/utxo-lib';
import cashaddr from 'ecashaddrjs';
import appConfig from 'config/app';
import { toast } from 'react-toastify';
const { TextArea } = Input;

const Wrapper = styled.div`
    .ant-collapse {
        &:first-child {
            margin-top: 30px;
        }
    }
`;

const SignMessageLabel = styled.div`
    text-align: left;
    color: ${props => props.theme.forms.text};
`;
const AddressCopyCtn = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;

    svg {
        height: 30px;
        width: 30px;
        &:hover {
            fill: ${props => props.theme.eCashBlue};
            cursor: pointer;
        }
    }
`;

const VerifyMessageLabel = styled.div`
    text-align: left;
    color: ${props => props.theme.forms.text};
`;

const SignatureValidation = styled.div`
    color: ${props => props.theme.encryptionRed};
`;

const SignVerifyMsg = () => {
    const ContextValue = React.useContext(WalletContext);
    const { cashtabState } = ContextValue;
    const { wallets } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const [messageSignature, setMessageSignature] = useState('');
    const [msgToSign, setMsgToSign] = useState('');
    const [sigCopySuccess, setSigCopySuccess] = useState('');
    const [signMessageIsValid, setSignMessageIsValid] = useState(null);
    const [messageVerificationAddr, setMessageVerificationAddr] = useState('');
    const [messageVerificationSig, setMessageVerificationSig] = useState('');
    const [messageVerificationMsg, setMessageVerificationMsg] = useState('');
    const [messageVerificationMsgIsValid, setMessageVerificationMsgIsValid] =
        useState(false);
    const [messageVerificationAddrError, setMessageVerificationAddrError] =
        useState(false);
    const [messageVerificationAddrIsValid, setMessageVerificationAddrIsValid] =
        useState(false);
    const [messageVerificationSigIsValid, setMessageVerificationSigIsValid] =
        useState(false);
    const [messageVerificationSigError, setMessageVerificationSigError] =
        useState(false);
    const signMessageByPk = () => {
        try {
            // First, get required params
            const keyPair = utxolib.ECPair.fromWIF(
                wallet.paths.get(1899).wif,
                utxolib.networks.ecash,
            );
            // Reference https://github.com/Permissionless-Software-Foundation/bch-js/blob/master/src/bitcoincash.js#L161
            const privKey = keyPair.__D;

            // Now you can get the local signature
            const messageSignature = xecMessage
                .sign(
                    msgToSign,
                    privKey,
                    keyPair.compressed,
                    utxolib.networks.ecash.messagePrefix,
                )
                .toString('base64');

            setMessageSignature(messageSignature);
            toast.success('Message Signature Generated');
        } catch (err) {
            toast.error(`${err}`);
            throw err;
        }
        setSigCopySuccess('');
    };

    const handleSignMsgChange = e => {
        const { value } = e.target;
        // validation
        if (value && value.length && value.length < 150) {
            setMsgToSign(value);
            setSignMessageIsValid(true);
        } else {
            setSignMessageIsValid(false);
        }
    };

    const verifyMessageBySig = () => {
        let verification;
        try {
            verification = xecMessage.verify(
                messageVerificationMsg,
                cashaddr.toLegacy(messageVerificationAddr),
                messageVerificationSig,
                utxolib.networks.ecash.messagePrefix,
            );
        } catch (err) {
            toast.error(`${err}`);
        }

        if (verification) {
            toast.success('Signature verified');
        } else {
            toast.error('Signature does not match address and message');
        }
    };

    const handleOnSigCopy = () => {
        if (messageSignature != '') {
            setSigCopySuccess('Signature copied to clipboard');
        }
    };

    const handleVerifyMsgChange = e => {
        const { value } = e.target;

        // validation
        if (value && value.length && value.length < 150) {
            setMessageVerificationMsgIsValid(true);
        } else {
            setMessageVerificationMsgIsValid(false);
        }

        setMessageVerificationMsg(value);
    };

    const handleVerifySigChange = e => {
        const { value } = e.target;

        // validation
        if (value && value.length && value.length === 88) {
            setMessageVerificationSigIsValid(true);
            setMessageVerificationSigError(false);
        } else {
            setMessageVerificationSigIsValid(false);
            setMessageVerificationSigError('Invalid signature');
        }

        setMessageVerificationSig(value);
    };

    const handleMessageVerificationAddrChange = e => {
        const { value } = e.target;
        let error = false;

        // validate address
        const isValid = cashaddr.isValidCashAddress(value, 'ecash');

        // Is this valid address?
        if (!isValid) {
            error = `Invalid ${appConfig.ticker} address`;
            // If valid address but token format
            if (cashaddr.isValidCashAddress(value, 'etoken')) {
                error = `eToken addresses are not supported for signature verifications`;
            }
            if (isValidAliasSendInput(value) === true) {
                error = `aliases not supported for signature verifications`;
            }
            setMessageVerificationAddrIsValid(false);
        } else {
            setMessageVerificationAddrIsValid(true);
        }
        setMessageVerificationAddrError(error);
        setMessageVerificationAddr(value);
    };

    return (
        <Wrapper data-testid="signverifymsg-ctn">
            <CustomCollapseCtn panelHeader="Sign">
                <AntdFormWrapper>
                    <Form
                        size="small"
                        style={{
                            width: 'auto',
                        }}
                    >
                        <Form.Item>
                            <SignMessageLabel>Message:</SignMessageLabel>
                            <TextArea
                                placeholder="Enter message to sign"
                                name="signMessage"
                                onChange={e => handleSignMsgChange(e)}
                                showCount
                                maxLength={150}
                            />
                        </Form.Item>
                        <Form.Item>
                            <SignMessageLabel>Address:</SignMessageLabel>
                            {wallet !== false && (
                                <AddressCopyCtn>
                                    <Input
                                        name="signMessageAddress"
                                        disabled={true}
                                        value={wallet.paths.get(1899).address}
                                    />
                                    <CopyToClipboard
                                        data={wallet.paths.get(1899).address}
                                        showToast
                                    >
                                        <ThemedCopySolid />
                                    </CopyToClipboard>
                                </AddressCopyCtn>
                            )}
                        </Form.Item>
                        <PrimaryButton
                            onClick={signMessageByPk}
                            disabled={!signMessageIsValid}
                        >
                            <PlusSquareOutlined />
                            &nbsp;Sign Message
                        </PrimaryButton>
                        <CopyToClipboard
                            data={messageSignature}
                            showToast
                            customMsg={`Signature copied to clipboard`}
                        >
                            <Form.Item>
                                <SignMessageLabel>Signature:</SignMessageLabel>
                                <TextArea
                                    name="signMessageSignature"
                                    placeholder="The signature will be generated upon signing of the message"
                                    readOnly={true}
                                    value={messageSignature}
                                    onClick={() => handleOnSigCopy()}
                                />
                            </Form.Item>
                        </CopyToClipboard>
                        {sigCopySuccess}
                    </Form>
                </AntdFormWrapper>
            </CustomCollapseCtn>
            <CustomCollapseCtn panelHeader="Verify">
                <AntdFormWrapper>
                    <Form
                        size="small"
                        style={{
                            width: 'auto',
                        }}
                    >
                        <Form.Item>
                            <VerifyMessageLabel>Message:</VerifyMessageLabel>
                            <TextArea
                                placeholder="Enter message to verify"
                                name="verifyMessage"
                                onChange={e => handleVerifyMsgChange(e)}
                                showCount
                                maxLength={150}
                            />
                        </Form.Item>
                        <Form.Item>
                            <VerifyMessageLabel>Address:</VerifyMessageLabel>
                            <DestinationAddressSingleWithoutQRScan
                                validateStatus={
                                    messageVerificationAddrError ? 'error' : ''
                                }
                                help={
                                    messageVerificationAddrError
                                        ? messageVerificationAddrError
                                        : ''
                                }
                                inputProps={{
                                    placeholder: `${appConfig.ticker} Address`,
                                    name: 'address',
                                    onChange: e =>
                                        handleMessageVerificationAddrChange(e),
                                    required: true,
                                }}
                            ></DestinationAddressSingleWithoutQRScan>
                        </Form.Item>
                        <Form.Item>
                            <VerifyMessageLabel>Signature:</VerifyMessageLabel>
                            <TextArea
                                placeholder="Input signature"
                                name="verifySignature"
                                onChange={e => handleVerifySigChange(e)}
                                showCount
                            />
                            <SignatureValidation>
                                {messageVerificationSigError}
                            </SignatureValidation>
                        </Form.Item>
                        <SecondaryButton
                            onClick={verifyMessageBySig}
                            disabled={
                                !messageVerificationAddrIsValid ||
                                !messageVerificationSigIsValid ||
                                !messageVerificationMsgIsValid
                            }
                        >
                            <PlusSquareOutlined />
                            &nbsp;Verify Message
                        </SecondaryButton>
                    </Form>
                </AntdFormWrapper>
            </CustomCollapseCtn>
        </Wrapper>
    );
};

export default SignVerifyMsg;
