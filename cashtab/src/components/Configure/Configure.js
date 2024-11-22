// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import {
    DollarIcon,
    SettingsIcon,
    ThemedXIcon,
    ThemedFacebookIcon,
    SocialContainer,
    SocialLink,
    GithubIcon,
} from 'components/Common/CustomIcons';
import TokenIcon from 'components/Etokens/TokenIcon';
import { getWalletState } from 'utils/cashMethods';
import appConfig from 'config/app';
import { isMobile } from 'helpers';
import { hasEnoughToken } from 'wallet';
import { CurrencySelect } from 'components/Common/Inputs';
import Switch from 'components/Common/Switch';
import { PageHeader } from 'components/Common/Atoms';

const VersionContainer = styled.div`
    color: ${props => props.theme.contrast};
`;

const ConfigIconWrapper = styled.div`
    svg {
        height: 42px;
        width: 42px;
        fill: ${props => props.theme.eCashBlue};
    }
`;
const StyledConfigure = styled.div`
    margin: 12px 0;
    background: ${props => props.theme.primaryBackground};
    padding: 20px;
    border-radius: 10px;
    @media (max-width: 768px) {
        border-radius: 0;
        margin: 0;
    }
    h2 {
        margin-bottom: 30px;
    }
`;

const HeadlineAndIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 12px 0;
`;
const Headline = styled.div`
    font-size: 20px;
    color: ${props => props.theme.contrast};
    font-weight: bold;
`;

const StyledSpacer = styled.div`
    height: 1px;
    width: 100%;
    background-color: ${props => props.theme.border};
    margin: 60px 0 50px;
`;

const SettingsLabel = styled.div`
    text-align: left;
    display: flex;
    gap: 9px;
    color: ${props => props.theme.contrast};
`;

const Switches = styled.div`
    flex-direction: column;
    display: flex;
    gap: 12px;
`;
const GeneralSettingsItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: ${props => props.theme.lightWhite};
`;

const Configure = () => {
    const ContextValue = React.useContext(WalletContext);
    const { updateCashtabState, cashtabState } = ContextValue;
    const { settings, wallets } = cashtabState;

    const wallet = wallets.length > 0 ? wallets[0] : false;

    // TODO deprecate getWalletState function
    const walletState = getWalletState(wallet);

    const { tokens } = walletState;

    const handleSendModalToggle = e => {
        updateCashtabState('settings', {
            ...settings,
            sendModal: e.target.checked,
        });
    };

    const handleMinFeesToggle = e => {
        updateCashtabState('settings', {
            ...settings,
            minFeeSends: e.target.checked,
        });
    };

    const handleCameraOverride = e => {
        updateCashtabState('settings', {
            ...settings,
            autoCameraOn: e.target.checked,
        });
    };

    return (
        <StyledConfigure title="Settings">
            <PageHeader>
                Settings <SettingsIcon />
            </PageHeader>
            <HeadlineAndIcon>
                <ConfigIconWrapper>
                    <DollarIcon />
                </ConfigIconWrapper>{' '}
                <Headline>Fiat Currency</Headline>
            </HeadlineAndIcon>
            <CurrencySelect
                name="configure-fiat-select"
                value={cashtabState.settings.fiatCurrency}
                handleSelect={e => {
                    updateCashtabState('settings', {
                        ...settings,
                        fiatCurrency: e.target.value,
                    });
                }}
            />
            <StyledSpacer />
            <HeadlineAndIcon>
                <ConfigIconWrapper>
                    <SettingsIcon />
                </ConfigIconWrapper>{' '}
                <Headline>General Settings</Headline>
            </HeadlineAndIcon>
            <Switches>
                <GeneralSettingsItem>
                    <Switch
                        name="Toggle Send Confirmations"
                        checked={settings.sendModal}
                        handleToggle={handleSendModalToggle}
                    />
                    <SettingsLabel>Send Confirmations</SettingsLabel>
                </GeneralSettingsItem>
                {isMobile(navigator) && (
                    <GeneralSettingsItem>
                        <Switch
                            name="Toggle QR Code Scanner Auto-open"
                            checked={settings.autoCameraOn}
                            handleToggle={handleCameraOverride}
                        />
                        <SettingsLabel>Auto-open camera on send</SettingsLabel>
                    </GeneralSettingsItem>
                )}
            </Switches>

            {(hasEnoughToken(
                tokens,
                appConfig.vipTokens.grumpy.tokenId,
                appConfig.vipTokens.grumpy.vipBalance,
            ) ||
                hasEnoughToken(
                    tokens,
                    appConfig.vipTokens.cachet.tokenId,
                    appConfig.vipTokens.cachet.vipBalance,
                )) && (
                <>
                    <StyledSpacer />
                    <HeadlineAndIcon>
                        {' '}
                        {hasEnoughToken(
                            tokens,
                            appConfig.vipTokens.grumpy.tokenId,
                            appConfig.vipTokens.grumpy.vipBalance,
                        ) && (
                            <TokenIcon
                                size={64}
                                tokenId={appConfig.vipTokens.grumpy.tokenId}
                            />
                        )}
                        {hasEnoughToken(
                            tokens,
                            appConfig.vipTokens.cachet.tokenId,
                            appConfig.vipTokens.cachet.vipBalance,
                        ) && (
                            <TokenIcon
                                size={64}
                                tokenId={appConfig.vipTokens.cachet.tokenId}
                            />
                        )}
                        <Headline>VIP Settings</Headline>
                    </HeadlineAndIcon>
                    <GeneralSettingsItem>
                        <Switch
                            name="Toggle minimum fee sends"
                            checked={settings.minFeeSends}
                            handleToggle={handleMinFeesToggle}
                        />
                        <SettingsLabel> ABSOLUTE MINIMUM fees</SettingsLabel>
                    </GeneralSettingsItem>
                </>
            )}

            <StyledSpacer />
            <SocialContainer>
                <SocialLink
                    href="https://x.com/cashtabwallet"
                    target="_blank"
                    rel="noreferrer"
                >
                    <ThemedXIcon />
                </SocialLink>{' '}
                <SocialLink
                    href="https://www.facebook.com/Cashtab"
                    target="_blank"
                    rel="noreferrer"
                >
                    <ThemedFacebookIcon />
                </SocialLink>
                <SocialLink
                    href="https://github.com/Bitcoin-ABC/bitcoin-abc/tree/master/cashtab"
                    target="_blank"
                    rel="noreferrer"
                >
                    <GithubIcon />
                </SocialLink>
            </SocialContainer>

            {typeof process.env.REACT_APP_VERSION === 'string' && (
                <>
                    <StyledSpacer />
                    <VersionContainer>
                        v{process.env.REACT_APP_VERSION}
                    </VersionContainer>
                </>
            )}
        </StyledConfigure>
    );
};

export default Configure;
