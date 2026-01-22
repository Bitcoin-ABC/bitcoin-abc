// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import styled from 'styled-components';
import { TextArea, Input } from 'components/Common/Inputs';
import Switch from 'components/Common/Switch';
import { WalletContext } from 'wallet/context';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import PrimaryButton, { SecondaryButton } from 'components/Common/Buttons';
import { isValidCashAddress } from 'ecashaddrjs';
import { toast } from 'react-toastify';
import { theme } from 'assets/styles/theme';
import appConfig from 'config/app';
import { PageHeader } from 'components/Common/Atoms';
import { ThemedSignAndVerifyMsg } from 'components/Common/CustomIcons';
import { signMsg, verifyMsg } from 'ecash-lib';

const SignVerifyForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    h2 {
        margin-bottom: 20px;
    }
`;
const Row = styled.div`
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
`;
const SignatureLabel = styled.div`
    font-size: var(--text-lg);
    line-height: var(--text-lg--line-height);
    color: ${props => props.theme.primaryText};
    text-align: left;
    font-weight: bold;
    width: 100%;
`;
const SignatureHolder = styled.code`
    width: 100%;
    color: ${props => props.theme.primaryText};
    word-break: break-all;
`;

const SignVerifyMsg = () => {
    const ContextValue = React.useContext(WalletContext);
    const { ecashWallet } = ContextValue;
    if (!ecashWallet) {
        return null;
    }
    // Cap msg length to prevent significant computation
    // Note that emojis etc could have larger impact than length
    // However, it is not that important, we do not need to get a bytecount for this component
    const CASHTAB_MESSAGE_MAX_LENGTH = 200;
    const ECASH_SIGNED_MSG_LENGTH = 88;
    const emptyFormData = {
        msgToSign: '',
        msgToVerify: '',
        addressToVerify: '',
        signatureToVerify: '',
    };
    const emptyFormDataError = {
        msgToSign: false,
        msgToVerify: false,
        addressToVerify: false,
        signatureToVerify: false,
    };
    const [formData, setFormData] = useState(emptyFormData);
    const [formDataError, setFormDataError] = useState(emptyFormDataError);
    const [signMsgMode, setSignMsgMode] = useState(true);
    const [messageSignature, setMessageSignature] = useState('');

    const handleUserSignature = () => {
        // We get the msgToSign from formData in state
        const { msgToSign } = formData;

        // Wrap signing in try...catch to handle any errors
        try {
            const signature = signMsg(msgToSign, ecashWallet.sk);
            console.log('signature', signature);

            setMessageSignature(signature);
            toast.success('Message Signed');
        } catch (err) {
            toast.error(`${err}`);
            throw err;
        }
    };

    /**
     * Update formData with user input
     * @param {Event} e js input event
     * e.target.value will be input value
     * e.target.name will be name of originating input field
     */
    const handleInput = e => {
        const { name, value } = e.target;

        // We arbitrarily cap input length on all formData fields on this page
        if (name !== 'addressToVerify') {
            setFormDataError(previous => ({
                ...previous,
                [name]:
                    value.length > CASHTAB_MESSAGE_MAX_LENGTH
                        ? `Cashtab supports msgs up to ${CASHTAB_MESSAGE_MAX_LENGTH} characters.`
                        : false,
            }));
        } else if (name === 'addressToVerify') {
            // Validate addressToVerify
            const isValidAddr = isValidCashAddress(value, appConfig.prefix);
            setFormDataError(previous => ({
                ...previous,
                [name]: isValidAddr ? false : 'Invalid cash address',
            }));
        } else if (name === 'signatureToVerify') {
            setFormDataError(previous => ({
                ...previous,
                [name]:
                    value.length !== ECASH_SIGNED_MSG_LENGTH
                        ? `Invalid eCash signature length`
                        : false,
            }));
        }

        setFormData(previous => ({
            ...previous,
            [name]: value,
        }));
    };

    const verifyMessage = () => {
        let verification;
        try {
            verification = verifyMsg(
                formData.msgToVerify,
                formData.signatureToVerify,
                formData.addressToVerify,
            );
        } catch (err) {
            toast.error(`${err}`);
        }

        if (verification) {
            toast.success(
                `Signature verified. Message "${formData.msgToVerify}" was signed by ${formData.addressToVerify}`,
            );
        } else {
            toast.error('Signature does not match address and message');
        }
    };

    return (
        <SignVerifyForm title="Sign & Verify">
            <PageHeader>
                Sign & Verify Msg
                <ThemedSignAndVerifyMsg />
            </PageHeader>
            <Row>
                <Switch
                    name="Toggle Sign Verify"
                    on="✍️ Sign"
                    off="✅ Verify"
                    bgColorOff={theme.genesisGreen}
                    width={110}
                    right={76}
                    checked={signMsgMode}
                    handleToggle={() => setSignMsgMode(!signMsgMode)}
                />
            </Row>
            {signMsgMode ? (
                <>
                    <Row>
                        <TextArea
                            placeholder={`Enter message to sign`}
                            name="msgToSign"
                            handleInput={handleInput}
                            value={formData.msgToSign}
                            error={formDataError.msgToSign}
                            showCount
                            max={`${CASHTAB_MESSAGE_MAX_LENGTH}`}
                        />
                    </Row>
                    <Row>
                        <PrimaryButton
                            onClick={handleUserSignature}
                            disabled={formData.msgToSign === ''}
                        >
                            Sign
                        </PrimaryButton>
                    </Row>
                    {messageSignature !== '' && (
                        <>
                            <Row>
                                <SignatureLabel>Signature:</SignatureLabel>
                            </Row>
                            <Row>
                                <CopyToClipboard
                                    data={messageSignature}
                                    showToast
                                >
                                    <SignatureHolder>
                                        {messageSignature}
                                    </SignatureHolder>
                                </CopyToClipboard>
                            </Row>
                        </>
                    )}
                </>
            ) : (
                <>
                    <Row>
                        <TextArea
                            placeholder={`Enter message to verify`}
                            name="msgToVerify"
                            handleInput={handleInput}
                            value={formData.msgToVerify}
                            error={formDataError.msgToVerify}
                            showCount
                            max={`${CASHTAB_MESSAGE_MAX_LENGTH}`}
                        />
                    </Row>
                    <Row>
                        <Input
                            name="addressToVerify"
                            placeholder="Enter address of signature to verify"
                            value={formData.addressToVerify}
                            error={formDataError.addressToVerify}
                            handleInput={handleInput}
                        />
                    </Row>
                    <Row>
                        <TextArea
                            placeholder={`Enter signature to verify`}
                            name="signatureToVerify"
                            handleInput={handleInput}
                            value={formData.signatureToVerify}
                            error={formDataError.signatureToVerify}
                        />
                    </Row>
                    <Row>
                        <SecondaryButton
                            onClick={verifyMessage}
                            disabled={
                                formDataError.msgToVerify !== false ||
                                formDataError.addressToVerify !== false ||
                                formDataError.signatureToVerify !== false
                            }
                        >
                            Verify
                        </SecondaryButton>
                    </Row>
                </>
            )}
        </SignVerifyForm>
    );
};

export default SignVerifyMsg;
