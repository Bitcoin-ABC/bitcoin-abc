// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useContext } from 'react';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import styled from 'styled-components';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import Seed from 'components/Common/Seed';
import Switch from 'components/Common/Switch';
import { getUserLocale } from 'helpers';
import { Alert, Info, PageHeader } from 'components/Common/Atoms';
import { WalletIcon } from 'components/Common/CustomIcons';

const BackupFlex = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: ${props => props.theme.primaryText};
    background: ${props => props.theme.primaryBackground};
    padding: 20px;
    padding-bottom: 60px;
    border-radius: 10px;
    @media (max-width: 768px) {
        border-radius: 0px;
    }
`;
const FlexRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 40px 0 0px;
    background: ${props => props.theme.secondaryBackground};
    padding: 20px;
    border-radius: 10px;
    border: 1px solid ${props => props.theme.border};
`;
const SwitchRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: 12px;
    margin-top: 20px;
`;
const SwitchLabel = styled.div``;

const BackupWallet = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const { cashtabState } = ContextValue;
    const { activeWallet } = cashtabState;

    if (!activeWallet) {
        return null;
    }

    const userLocale = getUserLocale(navigator);
    const [showSeed, setShowSeed] = useState(false);

    const wallet = activeWallet;

    return (
        <BackupFlex>
            <PageHeader>
                Wallet Backup <WalletIcon />
            </PageHeader>
            <Info>
                ℹ️ Your seed phrase is the only way to restore your wallet.
                Write it down. Keep it safe.
            </Info>

            <Alert className="notranslate">
                <b>
                    ⚠️ NEVER SHARE YOUR SEED PHRASE
                    {!userLocale.includes('en-') && (
                        <>
                            <br />
                            <br />
                            ⚠️ STORE YOUR SEED PHRASE IN ENGLISH
                        </>
                    )}
                </b>
            </Alert>

            <SwitchRow>
                <Switch
                    name="send-confirmations-switch"
                    checked={showSeed}
                    handleToggle={() => setShowSeed(!showSeed)}
                />
                <SwitchLabel>Show seed phrase</SwitchLabel>
            </SwitchRow>

            {showSeed && (
                <FlexRow>
                    <CopyToClipboard
                        data={wallet.mnemonic}
                        showToast
                        customMsg={'Copied seed phrase'}
                    >
                        <Seed mnemonic={wallet.mnemonic} />
                    </CopyToClipboard>
                </FlexRow>
            )}
        </BackupFlex>
    );
};

export default BackupWallet;
