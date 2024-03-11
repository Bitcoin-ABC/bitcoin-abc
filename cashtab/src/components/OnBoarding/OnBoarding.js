// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import { Input, Form } from 'antd';
import { AntdFormWrapper } from 'components/Common/EnhancedInputs';
import {
    PlusSquareOutlined,
    ImportOutlined,
    LockOutlined,
} from '@ant-design/icons';
import PrimaryButton, {
    SecondaryButton,
    SmartButton,
} from 'components/Common/PrimaryButton';
import { Event } from 'components/Common/GoogleAnalytics';
import { validateMnemonic } from 'validation';
import appConfig from 'config/app';
import { createCashtabWallet, generateMnemonic } from 'wallet';

export const WelcomeCtn = styled.div`
    margin-top: 20px;
    padding: 0px 30px;
    color: ${props => props.theme.contrast};
    h2 {
        color: ${props => props.theme.contrast};
    }
`;

export const WelcomeText = styled.p`
    width: 100%;
    font-size: 16px;
    margin-bottom: 60px;
    text-align: left;
`;

export const WelcomeLink = styled.a`
    text-decoration: underline;
    color: ${props => props.theme.eCashBlue};
    :hover {
        color: ${props => props.theme.eCashPurple} !important;
        text-decoration: underline !important;
    }
`;

const OnBoarding = () => {
    const ContextValue = React.useContext(WalletContext);
    const { updateCashtabState, cashtabState } = ContextValue;
    const { wallets } = cashtabState;
    const [formData, setFormData] = useState({
        mnemonic: '',
    });

    const [seedInput, openSeedInput] = useState(false);
    const [isValidMnemonic, setIsValidMnemonic] = useState(false);

    async function importWallet() {
        if (!formData.mnemonic) {
            return;
        }
        // Event("Category", "Action", "Label")
        // Track number of created wallets from onboarding
        Event('Onboarding.js', 'Create Wallet', 'Imported');
        const importedWallet = await createCashtabWallet(formData.mnemonic);
        updateCashtabState('wallets', [...wallets, importedWallet]);
    }

    async function createNewWallet() {
        // Event("Category", "Action", "Label")
        // Track number of created wallets from onboarding
        Event('Onboarding.js', 'Create Wallet', 'New');
        const newWallet = await createCashtabWallet(generateMnemonic());
        updateCashtabState('wallets', [...wallets, newWallet]);
    }

    const handleChange = e => {
        const { value, name } = e.target;

        // Validate mnemonic on change
        // Import button should be disabled unless mnemonic is valid
        setIsValidMnemonic(validateMnemonic(value));

        setFormData(p => ({ ...p, [name]: value }));
    };

    return (
        <WelcomeCtn>
            <h2>Welcome to Cashtab!</h2>
            <WelcomeText>
                Cashtab is an{' '}
                <WelcomeLink
                    href="https://github.com/bitcoin-abc/bitcoin-abc"
                    target="_blank"
                    rel="noreferrer"
                >
                    open source,
                </WelcomeLink>{' '}
                non-custodial web wallet for {appConfig.name}.
            </WelcomeText>

            <PrimaryButton onClick={() => createNewWallet()}>
                <PlusSquareOutlined /> New Wallet
            </PrimaryButton>

            <SecondaryButton onClick={() => openSeedInput(!seedInput)}>
                <ImportOutlined /> Import Wallet
            </SecondaryButton>
            {seedInput && (
                <AntdFormWrapper>
                    <Form style={{ width: 'auto' }}>
                        <Form.Item
                            validateStatus={
                                !isValidMnemonic && formData.mnemonic.length > 0
                                    ? 'error'
                                    : ''
                            }
                            help={
                                !isValidMnemonic && formData.mnemonic.length > 0
                                    ? 'invalid 12-word mnemonic'
                                    : ''
                            }
                        >
                            <Input
                                prefix={<LockOutlined />}
                                type="email"
                                placeholder="mnemonic (seed phrase)"
                                name="mnemonic"
                                autoComplete="off"
                                onChange={e => handleChange(e)}
                                required
                                title=""
                            />
                        </Form.Item>

                        <SmartButton
                            disabled={!isValidMnemonic}
                            onClick={() => importWallet()}
                        >
                            Import
                        </SmartButton>
                    </Form>
                </AntdFormWrapper>
            )}
        </WelcomeCtn>
    );
};

export default OnBoarding;
