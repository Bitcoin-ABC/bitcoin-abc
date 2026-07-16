// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { useState, useContext } from 'react';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import styled from 'styled-components';
import Seed from 'components/Common/Seed';
import Switch from 'components/Common/Switch';
import { getUserLocale } from 'helpers';
import { Alert, Info } from 'components/Common/Atoms';
import { ReactComponent as WarningIcon } from 'assets/warning.svg';
import {
    SettingsPageHeaderLink,
    BackIcon,
} from 'components/Configure/Configure';

const BackupFlex = styled.div`
    color: ${props => props.theme.primaryText};
    padding: 20px;
    padding-bottom: 60px;
    width: 100%;
`;
const FlexRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 40px 0 0px;
    background: ${props => props.theme.inputBackground};
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

const AlertContent = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    svg {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        margin-top: 2px;
        fill: #d8c705;
    }
`;

const BackupWallet = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const { ecashWallet, getWalletByAddress } = ContextValue;
    if (!ecashWallet) {
        return null;
    }

    const userLocale = getUserLocale(navigator);
    const [showSeed, setShowSeed] = useState(false);

    const storedActiveWallet = getWalletByAddress(ecashWallet.address);
    if (!storedActiveWallet) {
        return null;
    }

    return (
        <BackupFlex>
            <SettingsPageHeaderLink
                to="/configure"
                aria-label="Back to settings"
            >
                <BackIcon aria-hidden="true" />
                Wallet Backup
            </SettingsPageHeaderLink>
            <Info>
                ℹ️ Your seed phrase is the only way to restore your wallet.
                Write it down. Keep it safe.
            </Info>

            <Alert className="notranslate">
                <AlertContent>
                    <WarningIcon title="Warning" aria-hidden="true" />
                    <b>
                        NEVER SHARE YOUR SEED PHRASE
                        {!userLocale.includes('en-') && (
                            <>
                                <br />
                                <br />
                                STORE YOUR SEED PHRASE IN ENGLISH
                            </>
                        )}
                    </b>
                </AlertContent>
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
                    <Seed mnemonic={storedActiveWallet.mnemonic} />
                </FlexRow>
            )}
        </BackupFlex>
    );
};

export default BackupWallet;
