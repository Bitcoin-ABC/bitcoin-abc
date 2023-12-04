import * as React from 'react';
import styled from 'styled-components';
import {
    CopyOutlined,
    DollarOutlined,
    LoadingOutlined,
    WalletOutlined,
    QrcodeOutlined,
    SettingOutlined,
    LockOutlined,
    ContactsOutlined,
    FireOutlined,
    UserAddOutlined,
    WarningOutlined,
    SwapOutlined,
} from '@ant-design/icons';
import { Image } from 'antd';
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
import { ReactComponent as EyeSVG } from 'assets/eye.svg';
import { ReactComponent as EyeInvisibleSVG } from 'assets/eye-invisible.svg';
import { ReactComponent as Audit } from 'assets/audit.svg';
import { ReactComponent as Mail } from 'assets/mail.svg';
export const CashLoadingIcon = <LoadingOutlined className="cashLoadingIcon" />;
import { ReactComponent as User } from 'assets/user.svg';
import appConfig from 'config/app';

export const CashReceivedNotificationIcon = () => (
    <Image
        height={'33px'}
        width={'30px'}
        src={appConfig.logo}
        preview={false}
    />
);
export const TokenReceivedNotificationIcon = () => (
    <Image
        src={appConfig.tokenLogo}
        height={'33px'}
        width={'30px'}
        preview={false}
    />
);

export const MessageSignedNotificationIcon = () => (
    <Image
        src={appConfig.tokenLogo}
        height={'33px'}
        width={'30px'}
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
export const ThemedQrcodeOutlined = styled(QrcodeOutlined)`
    color: ${props => props.theme.walletBackground} !important;
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

export const ThemedMailOutlined = styled(Mail)`
    stroke: ${props => props.theme.eCashBlue};
    fill: ${props => props.theme.eCashBlue};
    width: 20px;
    height: 20px;
    cursor: pointer;
`;

export const ThemedEyeSVG = styled(EyeSVG)`
    fill: ${props => props.theme.buttons.primary.color};
    width: 15px;
    height: 15px;
    cursor: pointer;
`;
export const ThemedInvisibleEyeSVG = styled(EyeInvisibleSVG)`
    fill: ${props => props.theme.buttons.primary.color};
    width: 15px;
    height: 15px;
    cursor: pointer;
`;

export const ThemedSignAndVerifyMsg = styled(Audit)`
    min-width: 24px;
`;

export const ThemedUserProfileIcon = styled(User)`
    height: 33px;
    width: 30px;
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
        <LoadingOutlined />
    </LoadingBlock>
);

export const ReceiveIcon = () => <Receive />;
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
export const SendIcon = styled(Send)`
    transform: rotate(-35deg);
`;
export const AliasRegisterIcon = () => (
    <UserAddOutlined style={{ fontSize: 20 }} />
);
export const AliasIcon = styled(User)``;
export const CustomSpinner = <LoadingOutlined style={{ fontSize: 24 }} spin />;
