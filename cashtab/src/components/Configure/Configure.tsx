// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useContext } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router';
import { Capacitor } from '@capacitor/core';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import {
    ThemedXIcon,
    ThemedFacebookIcon,
    SocialContainer,
    SocialLink,
    GithubIcon,
} from 'components/Common/CustomIcons';
import TokenIcon from 'components/Etokens/TokenIcon';
import appConfig from 'config/app';
import { hasEnoughToken } from 'wallet';
import { CurrencySelect } from 'components/Common/Inputs';
import SegmentedControl from 'components/Common/SegmentedControl';
import { ReactComponent as BackIconSvg } from 'assets/back.svg';
import { ReactComponent as RightIconSvg } from 'assets/right.svg';
import { toast } from 'react-toastify';
import { authenticateToEnableBiometricLock } from 'services/biometricLockService';
import {
    disablePushNotifications,
    isPushNotificationsSupported,
    registerPushNotifications,
} from 'services/pushNotificationService';

const VersionContainer = styled.div`
    color: ${props => props.theme.primaryText};
    font-size: var(--text-sm);
    margin-top: 60px;
    text-align: right;
    border-bottom: 1px solid ${props => props.theme.border};
    padding-bottom: 20px;
    margin-bottom: 40px;
`;

export const StyledConfigure = styled.div`
    margin-top: 20px;
    padding: 0 20px;
    @media (max-width: 768px) {
        padding: 0 14px;
    }
`;

export const SettingsPageHeaderLink = styled(Link)`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid ${props => props.theme.border};
    color: ${props => props.theme.primaryText};
    text-decoration: none;
    font-size: var(--text-2xl);
    font-weight: 700;
    :hover {
        color: ${props => props.theme.accent};
    }
`;

export const BackIcon = styled(BackIconSvg)`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    path {
        fill: currentColor;
    }
`;

const RightIcon = styled(RightIconSvg)`
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    path {
        fill: currentColor;
    }
`;

const SettingsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const SettingsRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    color: ${props => props.theme.primaryText};
    :last-child {
        border-bottom: none;
    }
`;

const SettingsRowLabel = styled.span`
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
`;

const SettingsRowControl = styled.div`
    display: flex;
    align-items: center;
`;

const SettingsLinkRow = styled(Link)`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    color: ${props => props.theme.primaryText};
    text-decoration: none;
    font-size: var(--text-base);
    :hover {
        color: ${props => props.theme.accent};
        span {
            color: ${props => props.theme.accent};
        }
    }
`;

const SettingsLinkChevron = styled.span`
    display: flex;
    align-items: center;
    color: ${props => props.theme.primaryText};
`;

const StyledSpacer = styled.div`
    height: 1px;
    width: 100%;
    background-color: ${props => props.theme.border};
    margin: 40px 0 24px;
`;

const HeadlineAndIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 12px 0;
`;
const Headline = styled.div`
    font-size: var(--text-xl);
    line-height: var(--text-xl--line-height);
    color: ${props => props.theme.primaryText};
    font-weight: bold;
`;

const Configure: React.FC = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const { updateCashtabState, cashtabState, ecashWallet } = ContextValue;
    const { settings, tokens } = cashtabState;
    const isNativeMobile =
        Capacitor.isNativePlatform() &&
        ['android', 'ios'].includes(Capacitor.getPlatform());
    const showPushNotifications =
        isPushNotificationsSupported() &&
        import.meta.env.VITE_BUILD_ENV !== 'extension';

    return (
        <StyledConfigure title="Settings">
            <SettingsPageHeaderLink to="/" aria-label="Back to home">
                <BackIcon aria-hidden="true" />
                Settings
            </SettingsPageHeaderLink>

            <SettingsList>
                <SettingsLinkRow to="/wallets">
                    <SettingsRowLabel>Wallets</SettingsRowLabel>
                    <SettingsLinkChevron aria-hidden="true">
                        <RightIcon />
                    </SettingsLinkChevron>
                </SettingsLinkRow>
                <SettingsLinkRow to="/backup">
                    <SettingsRowLabel>Wallet Backup</SettingsRowLabel>
                    <SettingsLinkChevron aria-hidden="true">
                        <RightIcon />
                    </SettingsLinkChevron>
                </SettingsLinkRow>
                <SettingsRow>
                    <SettingsRowLabel>Display Currency</SettingsRowLabel>
                    <SettingsRowControl>
                        <CurrencySelect
                            name="configure-fiat-select"
                            value={cashtabState.settings.fiatCurrency}
                            handleSelect={e => {
                                updateCashtabState({
                                    settings: {
                                        ...settings,
                                        fiatCurrency: e.target.value,
                                    },
                                });
                            }}
                        />
                    </SettingsRowControl>
                </SettingsRow>
                <SettingsRow>
                    <SettingsRowLabel>Send Confirmations</SettingsRowLabel>
                    <SettingsRowControl>
                        <SegmentedControl
                            name="Send Confirmations"
                            options={[
                                { value: 'on', label: 'On' },
                                { value: 'off', label: 'Off' },
                            ]}
                            value={settings.sendModal ? 'on' : 'off'}
                            onChange={v =>
                                updateCashtabState({
                                    settings: {
                                        ...settings,
                                        sendModal: v === 'on',
                                    },
                                })
                            }
                        />
                    </SettingsRowControl>
                </SettingsRow>
                {isNativeMobile && (
                    <SettingsRow>
                        <SettingsRowLabel>Biometric Unlock</SettingsRowLabel>
                        <SettingsRowControl>
                            <SegmentedControl
                                name="Biometric Unlock"
                                options={[
                                    { value: 'on', label: 'On' },
                                    { value: 'off', label: 'Off' },
                                ]}
                                value={
                                    settings.biometricLockEnabled ? 'on' : 'off'
                                }
                                onChange={async v => {
                                    const enabling = v === 'on';
                                    if (
                                        enabling &&
                                        !settings.biometricLockEnabled
                                    ) {
                                        const result =
                                            await authenticateToEnableBiometricLock();
                                        if (!result.ok) {
                                            if (
                                                !result.cancelled &&
                                                result.message
                                            ) {
                                                toast.error(result.message);
                                            }
                                            return;
                                        }
                                    }
                                    updateCashtabState({
                                        settings: {
                                            ...settings,
                                            biometricLockEnabled: enabling,
                                        },
                                    });
                                }}
                            />
                        </SettingsRowControl>
                    </SettingsRow>
                )}
                {showPushNotifications && (
                    <SettingsRow>
                        <SettingsRowLabel>Push Notifications</SettingsRowLabel>
                        <SettingsRowControl>
                            <SegmentedControl
                                name="Push Notifications"
                                options={[
                                    { value: 'on', label: 'On' },
                                    { value: 'off', label: 'Off' },
                                ]}
                                value={
                                    settings.pushNotificationsEnabled
                                        ? 'on'
                                        : 'off'
                                }
                                onChange={async v => {
                                    const enabling = v === 'on';
                                    if (!enabling) {
                                        try {
                                            await disablePushNotifications();
                                            updateCashtabState({
                                                settings: {
                                                    ...settings,
                                                    pushNotificationsEnabled: false,
                                                },
                                            });
                                        } catch (err) {
                                            toast.error(
                                                err instanceof Error
                                                    ? err.message
                                                    : 'Could not turn off push notifications.',
                                            );
                                        }
                                        return;
                                    }
                                    if (
                                        ecashWallet === null ||
                                        !ecashWallet.address ||
                                        !ecashWallet.sk
                                    ) {
                                        toast.error('Wallet not ready.');
                                        return;
                                    }
                                    try {
                                        const granted =
                                            await registerPushNotifications(
                                                ecashWallet.address,
                                                ecashWallet.sk,
                                            );
                                        if (!granted) {
                                            toast.error(
                                                'Notification permission was not granted. Enable notifications in device settings.',
                                            );
                                            return;
                                        }
                                        updateCashtabState({
                                            settings: {
                                                ...settings,
                                                pushNotificationsEnabled: true,
                                            },
                                        });
                                    } catch (err) {
                                        toast.error(
                                            err instanceof Error
                                                ? err.message
                                                : 'Could not enable push notifications.',
                                        );
                                    }
                                }}
                            />
                        </SettingsRowControl>
                    </SettingsRow>
                )}
            </SettingsList>

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
                        <Headline>Cashtab VIP 🏆</Headline>
                    </HeadlineAndIcon>
                </>
            )}

            {typeof import.meta.env.VITE_VERSION === 'string' && (
                <VersionContainer>
                    v{import.meta.env.VITE_VERSION}
                </VersionContainer>
            )}

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
        </StyledConfigure>
    );
};

export default Configure;
