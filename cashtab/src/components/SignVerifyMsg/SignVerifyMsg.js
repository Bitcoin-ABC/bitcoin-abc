import React, { useState } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Form, Modal, Input } from 'antd';
import { WalletContext } from 'utils/context';
import {
    TokenParamLabel,
    MessageVerificationParamLabel,
    WalletInfoCtn,
    ZeroBalanceHeader,
    SidePaddingCtn,
} from 'components/Common/Atoms';
import WalletLabel from 'components/Common/WalletLabel.js';
import BalanceHeader from 'components/Common/BalanceHeader';
import BalanceHeaderFiat from 'components/Common/BalanceHeaderFiat';
import {
    errorNotification,
    messageSignedNotification,
    generalNotification,
} from 'components/Common/Notifications';
import { CustomCollapseCtn } from 'components/Common/StyledCollapse';
import {
    AntdFormWrapper,
    DestinationAddressSingleWithoutQRScan,
} from 'components/Common/EnhancedInputs';
const { TextArea } = Input;
import { convertToEcashPrefix, getWalletState } from 'utils/cashMethods';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import { ThemedCopySolid } from 'components/Common/CustomIcons';
import { SmartButton } from 'components/Common/PrimaryButton';
import { PlusSquareOutlined } from '@ant-design/icons';
import {
    isValidXecAddress,
    isValidEtokenAddress,
    isValidAliasSendInput,
} from 'utils/validation';
import xecMessage from 'bitcoinjs-message';
import * as utxolib from '@bitgo/utxo-lib';
import cashaddr from 'ecashaddrjs';
import appConfig from 'config/app';

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
    const { wallet, fiatPrice, cashtabSettings, changeCashtabSettings } =
        ContextValue;
    const walletState = getWalletState(wallet);
    const { balances } = walletState;
    const [messageSignature, setMessageSignature] = useState('');
    const [showConfirmMsgToSign, setShowConfirmMsgToSign] = useState(false);
    const [msgToSign, setMsgToSign] = useState('');
    const [sigCopySuccess, setSigCopySuccess] = useState('');
    const [signMessageIsValid, setSignMessageIsValid] = useState(null);
    const [showConfirmMsgToVerify, setShowConfirmMsgToVerify] = useState(false);
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
                wallet.Path1899.fundingWif,
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
            messageSignedNotification(messageSignature);
        } catch (err) {
            let message;
            if (!err.error && !err.message) {
                message = err.message || err.error || JSON.stringify(err);
            }
            errorNotification(err, message, 'Message Signing Error');
            throw err;
        }
        // Hide the modal
        setShowConfirmMsgToSign(false);
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
            errorNotification(
                err,
                'Error',
                'Unable to execute signature verification',
            );
        }

        if (verification) {
            generalNotification('Signature successfully verified', 'Verified');
        } else {
            errorNotification(
                'Error',
                'Signature does not match address and message',
                'Called from SignVerifyMsg.js on invalid message signing',
            );
        }

        setShowConfirmMsgToVerify(false);
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
        const isValid = isValidXecAddress(value);

        // Is this valid address?
        if (!isValid) {
            error = `Invalid ${appConfig.ticker} address`;
            // If valid address but token format
            if (isValidEtokenAddress(value)) {
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
        <Wrapper>
            <WalletInfoCtn>
                <WalletLabel
                    name={wallet.name}
                    cashtabSettings={cashtabSettings}
                    changeCashtabSettings={changeCashtabSettings}
                ></WalletLabel>
                {!balances.totalBalance ? (
                    <ZeroBalanceHeader>
                        You currently have 0 {appConfig.ticker}
                        <br />
                        Deposit some funds to use this feature
                    </ZeroBalanceHeader>
                ) : (
                    <>
                        <BalanceHeader
                            balance={balances.totalBalance}
                            ticker={appConfig.ticker}
                            cashtabSettings={cashtabSettings}
                        />

                        <BalanceHeaderFiat
                            balance={balances.totalBalance}
                            settings={cashtabSettings}
                            fiatPrice={fiatPrice}
                        />
                    </>
                )}
            </WalletInfoCtn>{' '}
            <SidePaddingCtn>
                <Modal
                    title={`Please review and confirm your message to be signed using this wallet.`}
                    open={showConfirmMsgToSign}
                    onOk={signMessageByPk}
                    onCancel={() => setShowConfirmMsgToSign(false)}
                >
                    <TokenParamLabel>Message:</TokenParamLabel> {msgToSign}
                    <br />
                </Modal>
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
                                    name="signMessage"
                                    onChange={e => handleSignMsgChange(e)}
                                    showCount
                                    maxLength={150}
                                />
                            </Form.Item>
                            <Form.Item>
                                <SignMessageLabel>Address:</SignMessageLabel>
                                {wallet &&
                                    wallet.Path1899 &&
                                    wallet.Path1899.cashAddress && (
                                        <AddressCopyCtn>
                                            <Input
                                                name="signMessageAddress"
                                                disabled={true}
                                                value={
                                                    wallet &&
                                                    wallet.Path1899 &&
                                                    wallet.Path1899.cashAddress
                                                        ? convertToEcashPrefix(
                                                              wallet.Path1899
                                                                  .cashAddress,
                                                          )
                                                        : ''
                                                }
                                            />
                                            <CopyToClipboard
                                                data={convertToEcashPrefix(
                                                    wallet.Path1899.cashAddress,
                                                )}
                                                optionalOnCopyNotification={{
                                                    title: 'Copied',
                                                    msg: `${convertToEcashPrefix(
                                                        wallet.Path1899
                                                            .cashAddress,
                                                    )} copied to clipboard`,
                                                }}
                                            >
                                                <ThemedCopySolid />
                                            </CopyToClipboard>
                                        </AddressCopyCtn>
                                    )}
                            </Form.Item>
                            <SmartButton
                                onClick={() => setShowConfirmMsgToSign(true)}
                                disabled={!signMessageIsValid}
                            >
                                <PlusSquareOutlined />
                                &nbsp;Sign Message
                            </SmartButton>
                            <CopyToClipboard
                                data={messageSignature}
                                optionalOnCopyNotification={{
                                    title: 'Message signature copied to clipboard',
                                    msg: `${messageSignature}`,
                                }}
                            >
                                <Form.Item>
                                    <SignMessageLabel>
                                        Signature:
                                    </SignMessageLabel>
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
                <Modal
                    title={`Please review and confirm your message, signature and address to be verified.`}
                    open={showConfirmMsgToVerify}
                    onOk={verifyMessageBySig}
                    onCancel={() => setShowConfirmMsgToVerify(false)}
                >
                    <MessageVerificationParamLabel>
                        Message:
                    </MessageVerificationParamLabel>{' '}
                    {messageVerificationMsg}
                    <br />
                    <MessageVerificationParamLabel>
                        Address:
                    </MessageVerificationParamLabel>{' '}
                    {messageVerificationAddr}
                    <br />
                    <MessageVerificationParamLabel>
                        Signature:
                    </MessageVerificationParamLabel>{' '}
                    {messageVerificationSig}
                    <br />
                </Modal>
                <CustomCollapseCtn panelHeader="Verify">
                    <AntdFormWrapper>
                        <Form
                            size="small"
                            style={{
                                width: 'auto',
                            }}
                        >
                            <Form.Item>
                                <VerifyMessageLabel>
                                    Message:
                                </VerifyMessageLabel>
                                <TextArea
                                    name="verifyMessage"
                                    onChange={e => handleVerifyMsgChange(e)}
                                    showCount
                                    maxLength={150}
                                />
                            </Form.Item>
                            <Form.Item>
                                <VerifyMessageLabel>
                                    Address:
                                </VerifyMessageLabel>
                                <DestinationAddressSingleWithoutQRScan
                                    validateStatus={
                                        messageVerificationAddrError
                                            ? 'error'
                                            : ''
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
                                            handleMessageVerificationAddrChange(
                                                e,
                                            ),
                                        required: true,
                                    }}
                                ></DestinationAddressSingleWithoutQRScan>
                            </Form.Item>
                            <Form.Item>
                                <VerifyMessageLabel>
                                    Signature:
                                </VerifyMessageLabel>
                                <TextArea
                                    name="verifySignature"
                                    onChange={e => handleVerifySigChange(e)}
                                    showCount
                                />
                                <SignatureValidation>
                                    {messageVerificationSigError}
                                </SignatureValidation>
                            </Form.Item>
                            <SmartButton
                                onClick={() => setShowConfirmMsgToVerify(true)}
                                disabled={
                                    !messageVerificationAddrIsValid ||
                                    !messageVerificationSigIsValid ||
                                    !messageVerificationMsgIsValid
                                }
                            >
                                <PlusSquareOutlined />
                                &nbsp;Verify Message
                            </SmartButton>
                        </Form>
                    </AntdFormWrapper>
                </CustomCollapseCtn>
            </SidePaddingCtn>
        </Wrapper>
    );
};

SignVerifyMsg.propTypes = {
    cashtabSettings: PropTypes.oneOfType([
        PropTypes.shape({
            fiatCurrency: PropTypes.string,
            sendModal: PropTypes.bool,
            autoCameraOn: PropTypes.bool,
            hideMessagesFromUnknownSender: PropTypes.bool,
            toggleShowHideBalance: PropTypes.bool,
        }),
        PropTypes.bool,
    ]),
    changeCashtabSettings: PropTypes.func,
};

export default SignVerifyMsg;
