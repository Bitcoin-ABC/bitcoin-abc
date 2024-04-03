// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import styled from 'styled-components';
import {
    CopyOutlined,
    DollarOutlined,
    LoadingOutlined,
    WalletOutlined,
    SettingOutlined,
    LockOutlined,
    ContactsOutlined,
    FireOutlined,
    UserAddOutlined,
    WarningOutlined,
    SwapOutlined,
    AppstoreAddOutlined,
    GithubOutlined,
} from '@ant-design/icons';
import { Image } from 'antd';
import { ReactComponent as QRCode } from 'assets/qrcode.svg';
import { ReactComponent as Send } from 'assets/send.svg';
import { ReactComponent as Receive } from 'assets/receive.svg';
import { ReactComponent as Genesis } from 'assets/flask.svg';
import { ReactComponent as Unparsed } from 'assets/alert-circle.svg';
import { ReactComponent as Home } from 'assets/home.svg';
import { ReactComponent as Settings } from 'assets/cog.svg';
import { ReactComponent as CopySolid } from 'assets/copy.svg';
import { ReactComponent as LinkSolid } from 'assets/external-link-square-alt.svg';
import { ReactComponent as Airdrop } from 'assets/airdrop-icon.svg';
import { ReactComponent as Pdf } from 'assets/file-pdf.svg';
import { ReactComponent as Plus } from 'assets/plus.svg';
import { ReactComponent as Download } from 'assets/download.svg';
import { ReactComponent as Edit } from 'assets/edit.svg';
import { ReactComponent as Trashcan } from 'assets/trashcan.svg';
import { ReactComponent as Audit } from 'assets/audit.svg';
export const CashLoadingIcon = <LoadingOutlined className="cashLoadingIcon" />;
import { ReactComponent as User } from 'assets/user.svg';
import { ReactComponent as XLogo } from 'assets/xlogo.svg';
import { ReactComponent as Facebook } from 'assets/Facebook_Logo.svg';
import appConfig from 'config/app';

export const CashReceivedNotificationIcon = () => (
    <Image
        height={'24px'}
        width={'24px'}
        src={appConfig.logo}
        preview={false}
    />
);
export const TokenNotificationIcon = () => (
    <Image
        src={appConfig.tokenLogo}
        height={'24px'}
        width={'24px'}
        preview={false}
    />
);
export const ThemedBurnOutlined = styled(FireOutlined)`
    color: ${props => props.theme.eCashPurple} !important;
`;
export const ThemedCopyOutlined = styled(CopyOutlined)`
    color: ${props => props.theme.icons.outlined} !important;
`;
export const ThemedDollarOutlined = styled(DollarOutlined)`
    color: ${props => props.theme.icons.outlined} !important;
`;
export const ThemedWalletOutlined = styled(WalletOutlined)`
    color: ${props => props.theme.icons.outlined} !important;
`;
export const ThemedSettingOutlined = styled(SettingOutlined)`
    color: ${props => props.theme.icons.outlined} !important;
`;
export const ThemedLockOutlined = styled(LockOutlined)`
    color: ${props => props.theme.icons.outlined} !important;
`;
export const ThemedContactsOutlined = styled(ContactsOutlined)`
    color: ${props => props.theme.icons.outlined} !important;
`;
export const ThemedContactSendOutlined = styled(Send)`
    color: ${props => props.theme.icons.outlined} !important;
    transform: rotate(-35deg);
    padding: 0.15rem 0rem 0.18rem 0rem;
    height: 1.3em;
    width: 1.3em;
`;
export const ThemedCopySolid = styled(CopySolid)`
    fill: ${props => props.theme.contrast};
    padding: 0rem 0rem 0.27rem 0rem;
    height: 1.3em;
    width: 1.3em;
    cursor: pointer;
`;

export const ThemedLinkSolid = styled(LinkSolid)`
    fill: ${props => props.theme.contrast};
    padding: 0.15rem 0rem 0.18rem 0rem;
    height: 1.3em;
    width: 1.3em;
`;

export const ThemedPdfSolid = styled(Pdf)`
    fill: ${props => props.theme.contrast};
    padding: 0.15rem 0rem 0.18rem 0rem;
    height: 1.3em;
    width: 1.3em;
`;

export const ThemedPlusOutlined = styled(Plus)`
    fill: ${props => props.theme.contrast};
    padding: 0.15rem 0rem 0.18rem 0rem;
    height: 1.3em;
    width: 1.3em;
`;

export const ThemedDownloadOutlined = styled(Download)`
    fill: ${props => props.theme.contrast};
    padding: 0.15rem 0rem 0.18rem 0rem;
    height: 1.3em;
    width: 1.3em;
`;

export const ThemedEditOutlined = styled(Edit)`
    stroke: ${props => props.theme.eCashBlue};
    fill: ${props => props.theme.eCashBlue};
    width: 20px;
    height: 20px;
    cursor: pointer;
`;

export const ThemedTrashcanOutlined = styled(Trashcan)`
    stroke: ${props => props.theme.eCashBlue};
    fill: ${props => props.theme.eCashBlue};
    width: 20px;
    height: 20px;
    cursor: pointer;
`;

export const ThemedSignAndVerifyMsg = styled(Audit)`
    min-width: 24px;
`;
export const WalletIcon = styled(ThemedWalletOutlined)`
    min-width: 24px;
`;

export const ThemedUserProfileIcon = styled(User)`
    height: 33px;
    width: 30px;
`;
export const SocialContainer = styled.div`
    margin: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 220px;
    height: 42px;
`;

// The :not(#F) is so the F in the Facebook logo is not filled on hover
export const SocialLink = styled.a`
    width: 100%;
    height: 100%;
    @media (hover: hover) {
        :hover {
            svg {
                fill: ${props => props.theme.eCashPurple};
                path:not(#F) {
                    fill: ${props => props.theme.eCashPurple};
                }
            }
        }
    }
`;
export const ThemedXIcon = styled(XLogo)`
    height: 42px;
    width: 100%;
`;
export const ThemedFacebookIcon = styled(Facebook)`
    height: 42px;
    width: 100%;
`;
export const ThemedGithubIcon = styled(GithubOutlined)`
    svg {
        fill: ${props => props.theme.contrast} !important;
    }
    font-size: 42px;
    @media (hover: hover) {
        :hover {
            svg {
                fill: ${props => props.theme.eCashPurple} !important;
            }
        }
    }
`;
export const ThemedAliasOutlined = styled(User)`
    fill: ${props => props.theme.icons.outlined} !important;
    height: 12px;
    width: 12px;
`;

export const LoadingBlock = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    flex-direction: column;
    svg {
        width: 50px;
        height: 50px;
        fill: ${props => props.theme.eCashBlue};
    }
`;

export const CashLoader = () => (
    <LoadingBlock>
        <LoadingOutlined data-testid="cash-loader" />
    </LoadingBlock>
);

export const ReceiveIcon = () => <Receive />;
export const QRCodeIcon = () => <QRCode />;
export const GenesisIcon = () => <Genesis />;
export const UnparsedIcon = () => <Unparsed />;
export const HomeIcon = () => <Home />;
export const SettingsIcon = () => <Settings height={'33px'} width={'30px'} />;
export const PendingAliasWarningIcon = () => (
    <WarningOutlined style={{ fontSize: 25 }} />
);

export const WarningIcon = () => <WarningOutlined style={{ fontSize: 45 }} />;
export const AirdropIcon = () => <Airdrop height={'33px'} width={'30px'} />;
export const SwapIcon = () => <SwapOutlined style={{ fontSize: 24 }} />;
export const EtokensIcon = () => (
    <AppstoreAddOutlined style={{ fontSize: 24 }} />
);
export const SendIcon = styled(Send)`
    transform: rotate(-35deg);
`;
export const AliasRegisterIcon = () => (
    <UserAddOutlined style={{ fontSize: 20 }} />
);
export const AliasIcon = styled(User)``;
export const CustomSpinner = <LoadingOutlined style={{ fontSize: 24 }} spin />;
