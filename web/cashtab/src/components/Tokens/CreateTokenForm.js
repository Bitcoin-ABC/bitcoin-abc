import React, { useState } from 'react';
import { AntdFormWrapper } from '@components/Common/EnhancedInputs';
import { TokenCollapse } from '@components/Common/StyledCollapse';
import { currency } from '@components/Common/Ticker.js';
import { WalletContext } from '@utils/context';
import {
    isValidTokenName,
    isValidTokenTicker,
    isValidTokenDecimals,
    isValidTokenInitialQty,
    isValidTokenDocumentUrl,
} from '@utils/validation';
import { PlusSquareOutlined } from '@ant-design/icons';
import { SmartButton } from '@components/Common/PrimaryButton';
import { Collapse, Form, Input, Modal, notification, Spin } from 'antd';
const { Panel } = Collapse;
import Paragraph from 'antd/lib/typography/Paragraph';
import { TokenParamLabel } from '@components/Common/Atoms';

import { CashLoadingIcon } from '@components/Common/CustomIcons';

const CreateTokenForm = ({ BCH, getRestUrl, createToken, disabled }) => {
    const { wallet } = React.useContext(WalletContext);

    //const { getBCH, getRestUrl, createToken } = useBCH();

    // New Token Name
    const [newTokenName, setNewTokenName] = useState('');
    const [newTokenNameIsValid, setNewTokenNameIsValid] = useState(null);
    const handleNewTokenNameInput = e => {
        const { value } = e.target;
        // validation
        setNewTokenNameIsValid(isValidTokenName(value));
        setNewTokenName(value);
    };

    // New Token Ticker
    const [newTokenTicker, setNewTokenTicker] = useState('');
    const [newTokenTickerIsValid, setNewTokenTickerIsValid] = useState(null);
    const handleNewTokenTickerInput = e => {
        const { value } = e.target;
        // validation
        setNewTokenTickerIsValid(isValidTokenTicker(value));
        setNewTokenTicker(value);
    };

    // New Token Decimals
    const [newTokenDecimals, setNewTokenDecimals] = useState(0);
    const [newTokenDecimalsIsValid, setNewTokenDecimalsIsValid] = useState(
        true,
    );
    const handleNewTokenDecimalsInput = e => {
        const { value } = e.target;
        // validation
        setNewTokenDecimalsIsValid(isValidTokenDecimals(value));
        // Also validate the supply here if it has not yet been set
        if (newTokenInitialQtyIsValid !== null) {
            setNewTokenInitialQtyIsValid(
                isValidTokenInitialQty(value, newTokenDecimals),
            );
        }

        setNewTokenDecimals(value);
    };

    // New Token Initial Quantity
    const [newTokenInitialQty, setNewTokenInitialQty] = useState('');
    const [newTokenInitialQtyIsValid, setNewTokenInitialQtyIsValid] = useState(
        null,
    );
    const handleNewTokenInitialQtyInput = e => {
        const { value } = e.target;
        // validation
        setNewTokenInitialQtyIsValid(
            isValidTokenInitialQty(value, newTokenDecimals),
        );
        setNewTokenInitialQty(value);
    };
    // New Token document URL
    const [newTokenDocumentUrl, setNewTokenDocumentUrl] = useState('');
    // Start with this as true, field is not required
    const [
        newTokenDocumentUrlIsValid,
        setNewTokenDocumentUrlIsValid,
    ] = useState(true);

    const handleNewTokenDocumentUrlInput = e => {
        const { value } = e.target;
        // validation
        setNewTokenDocumentUrlIsValid(isValidTokenDocumentUrl(value));
        setNewTokenDocumentUrl(value);
    };

    // New Token fixed supply
    // Only allow creation of fixed supply tokens until Minting support is added

    // New Token document hash
    // Do not include this; questionable value to casual users and requires significant complication

    // Only enable CreateToken button if all form entries are valid
    let tokenGenesisDataIsValid =
        newTokenNameIsValid &&
        newTokenTickerIsValid &&
        newTokenDecimalsIsValid &&
        newTokenInitialQtyIsValid &&
        newTokenDocumentUrlIsValid;

    // Modal settings
    const [showConfirmCreateToken, setShowConfirmCreateToken] = useState(false);

    // Token creation loading
    const [genesisLoading, setGenesisLoading] = useState(false);

    const createPreviewedToken = async () => {
        setGenesisLoading(true);
        // If data is for some reason not valid here, bail out
        if (!tokenGenesisDataIsValid) {
            return;
        }

        // data must be valid and user reviewed to get here
        const configObj = {
            name: newTokenName,
            ticker: newTokenTicker,
            documentUrl:
                newTokenDocumentUrl === ''
                    ? 'https://cashtabapp.com/'
                    : newTokenDocumentUrl,
            decimals: newTokenDecimals,
            initialQty: newTokenInitialQty,
            documentHash: '',
        };

        // create token with data in state fields
        try {
            const link = await createToken(
                BCH,
                wallet,
                currency.defaultFee,
                configObj,
            );

            notification.success({
                message: 'Success',
                description: (
                    <a href={link} target="_blank" rel="noopener noreferrer">
                        <Paragraph>
                            Token created! Click or tap here for more details
                        </Paragraph>
                    </a>
                ),
                duration: 5,
            });
        } catch (e) {
            // Set loading to false here as well, as balance may not change depending on where error occured in try loop
            setGenesisLoading(false);
            let message;

            if (!e.error && !e.message) {
                message = `Transaction failed: no response from ${getRestUrl()}.`;
            } else if (
                /Could not communicate with full node or other external service/.test(
                    e.error,
                )
            ) {
                message = 'Could not communicate with API. Please try again.';
            } else if (
                e.error &&
                e.error.includes(
                    'too-long-mempool-chain, too many unconfirmed ancestors [limit: 50] (code 64)',
                )
            ) {
                message = `The ${currency.ticker} you are trying to send has too many unconfirmed ancestors to send (limit 50). Sending will be possible after a block confirmation. Try again in about 10 minutes.`;
            } else {
                message = e.message || e.error || JSON.stringify(e);
            }

            notification.error({
                message: 'Error',
                description: message,
                duration: 5,
            });
            console.error(e);
        }
        // Hide the modal
        setShowConfirmCreateToken(false);
    };
    return (
        <>
            <Modal
                title={`Please review and confirm your token settings.`}
                visible={showConfirmCreateToken}
                onOk={createPreviewedToken}
                onCancel={() => setShowConfirmCreateToken(false)}
            >
                <TokenParamLabel>Name:</TokenParamLabel> {newTokenName}
                <br />
                <TokenParamLabel>Ticker:</TokenParamLabel> {newTokenTicker}
                <br />
                <TokenParamLabel>Decimals:</TokenParamLabel> {newTokenDecimals}
                <br />
                <TokenParamLabel>Supply:</TokenParamLabel> {newTokenInitialQty}
                <br />
                <TokenParamLabel>Document URL:</TokenParamLabel>{' '}
                {newTokenDocumentUrl === ''
                    ? 'https://cashtabapp.com/'
                    : newTokenDocumentUrl}
                <br />
            </Modal>
            <>
                <Spin spinning={genesisLoading} indicator={CashLoadingIcon}>
                    <TokenCollapse
                        collapsible={disabled ? 'disabled' : true}
                        disabled={disabled}
                        style={{
                            marginBottom: '24px',
                        }}
                    >
                        <Panel header="Create Token" key="1">
                            <AntdFormWrapper>
                                <Form
                                    size="small"
                                    style={{
                                        width: 'auto',
                                    }}
                                >
                                    <Form.Item
                                        validateStatus={
                                            newTokenNameIsValid === null ||
                                            newTokenNameIsValid
                                                ? ''
                                                : 'error'
                                        }
                                        help={
                                            newTokenNameIsValid === null ||
                                            newTokenNameIsValid
                                                ? ''
                                                : 'Token name must be a string between 1 and 68 characters long'
                                        }
                                    >
                                        <Input
                                            addonBefore="Name"
                                            placeholder="Enter a name for your token"
                                            name="newTokenName"
                                            value={newTokenName}
                                            onChange={e =>
                                                handleNewTokenNameInput(e)
                                            }
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        validateStatus={
                                            newTokenTickerIsValid === null ||
                                            newTokenTickerIsValid
                                                ? ''
                                                : 'error'
                                        }
                                        help={
                                            newTokenTickerIsValid === null ||
                                            newTokenTickerIsValid
                                                ? ''
                                                : 'Ticker must be a string between 1 and 12 characters long'
                                        }
                                    >
                                        <Input
                                            addonBefore="Ticker"
                                            placeholder="Enter a ticker for your token"
                                            name="newTokenTicker"
                                            value={newTokenTicker}
                                            onChange={e =>
                                                handleNewTokenTickerInput(e)
                                            }
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        validateStatus={
                                            newTokenDecimalsIsValid === null ||
                                            newTokenDecimalsIsValid
                                                ? ''
                                                : 'error'
                                        }
                                        help={
                                            newTokenDecimalsIsValid === null ||
                                            newTokenDecimalsIsValid
                                                ? ''
                                                : 'Token decimals must be an integer between 0 and 9'
                                        }
                                    >
                                        <Input
                                            addonBefore="Decimals"
                                            placeholder="Enter number of decimal places"
                                            name="newTokenDecimals"
                                            type="number"
                                            value={newTokenDecimals}
                                            onChange={e =>
                                                handleNewTokenDecimalsInput(e)
                                            }
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        validateStatus={
                                            newTokenInitialQtyIsValid ===
                                                null ||
                                            newTokenInitialQtyIsValid
                                                ? ''
                                                : 'error'
                                        }
                                        help={
                                            newTokenInitialQtyIsValid ===
                                                null ||
                                            newTokenInitialQtyIsValid
                                                ? ''
                                                : 'Token supply must be greater than 0 and less than 100,000,000,000. Token supply decimal places cannot exceed token decimal places.'
                                        }
                                    >
                                        <Input
                                            addonBefore="Supply"
                                            placeholder="Enter the fixed supply of your token"
                                            name="newTokenInitialQty"
                                            type="number"
                                            value={newTokenInitialQty}
                                            onChange={e =>
                                                handleNewTokenInitialQtyInput(e)
                                            }
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        validateStatus={
                                            newTokenDocumentUrlIsValid ===
                                                null ||
                                            newTokenDocumentUrlIsValid
                                                ? ''
                                                : 'error'
                                        }
                                        help={
                                            newTokenDocumentUrlIsValid ===
                                                null ||
                                            newTokenDocumentUrlIsValid
                                                ? ''
                                                : 'Document URL cannot exceed 68 characters'
                                        }
                                    >
                                        <Input
                                            addonBefore="Document URL"
                                            placeholder="Enter a website for your token"
                                            name="newTokenDocumentUrl"
                                            value={newTokenDocumentUrl}
                                            onChange={e =>
                                                handleNewTokenDocumentUrlInput(
                                                    e,
                                                )
                                            }
                                        />
                                    </Form.Item>
                                </Form>
                            </AntdFormWrapper>
                            <SmartButton
                                onClick={() => setShowConfirmCreateToken(true)}
                                disabled={!tokenGenesisDataIsValid}
                            >
                                <PlusSquareOutlined />
                                &nbsp;Create Token
                            </SmartButton>
                        </Panel>
                    </TokenCollapse>
                </Spin>
            </>
        </>
    );
};

export default CreateTokenForm;
