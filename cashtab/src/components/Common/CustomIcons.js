// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import styled from 'styled-components';
import PayButton from 'assets/paybutton.webp';
import { ReactComponent as QRCode } from 'assets/qrcode.svg';
import { ReactComponent as Send } from 'assets/send.svg';
import { ReactComponent as CopyPaste } from 'assets/copypaste.svg';
import { ReactComponent as AddContact } from 'assets/addcontact.svg';
import { ReactComponent as Unknown } from 'assets/unknown.svg';
import { ReactComponent as Reply } from 'assets/reply.svg';
import { ReactComponent as Mint } from 'assets/mint.svg';
import { ReactComponent as CashtabMsg } from 'assets/cashtab-msg.svg';
import { ReactComponent as Chat } from 'assets/chat.svg';
import { ReactComponent as Mined } from 'assets/pickaxe.svg';
import { ReactComponent as CashtabEncrypted } from 'assets/cashtab-encrypted.svg';
import { ReactComponent as TokenBurn } from 'assets/tokenburn.svg';
import { ReactComponent as Swap } from 'assets/swap.svg';
import { ReactComponent as Alias } from 'assets/alias.svg';
import { ReactComponent as Receive } from 'assets/receive.svg';
import { ReactComponent as Genesis } from 'assets/flask.svg';
import { ReactComponent as Unparsed } from 'assets/alert-circle.svg';
import { ReactComponent as Home } from 'assets/home.svg';
import { ReactComponent as LinkSolid } from 'assets/external-link-square-alt.svg';
import { ReactComponent as Airdrop } from 'assets/airdrop-icon.svg';
import { ReactComponent as Pdf } from 'assets/file-pdf.svg';
import { ReactComponent as Edit } from 'assets/edit.svg';
import { ReactComponent as Trashcan } from 'assets/trashcan.svg';
import { ReactComponent as Audit } from 'assets/audit.svg';
import { ReactComponent as Dollar } from 'assets/dollar.svg';
import { ReactComponent as User } from 'assets/user.svg';
import { ReactComponent as XLogo } from 'assets/xlogo.svg';
import { ReactComponent as Facebook } from 'assets/Facebook_Logo.svg';
import { ReactComponent as Wallet } from 'assets/wallet.svg';
import { ReactComponent as Bank } from 'assets/bank.svg';
import { ReactComponent as Settings } from 'assets/settings.svg';
import { ReactComponent as Contacts } from 'assets/contacts.svg';
import { ReactComponent as Tokens } from 'assets/tokens.svg';
import { ReactComponent as Github } from 'assets/github.svg';
import { ReactComponent as Question } from 'assets/question.svg';
import { ReactComponent as Reward } from 'assets/reward.svg';
import { ReactComponent as SelfSend } from 'assets/selfsend.svg';
import { ReactComponent as FanOut } from 'assets/fanout.svg';
import { ReactComponent as MintNft } from 'assets/mintnft.svg';
import { ReactComponent as Nft } from 'assets/nft.svg';
import { ReactComponent as AgoraOffer } from 'assets/agora-offer.svg';
import { ReactComponent as AgoraTx } from 'assets/agora-tx.svg';

import appConfig from 'config/app';

export const CashReceivedNotificationIcon = () => (
    <img height={'24px'} width={'24px'} src={appConfig.logo} />
);
export const TokenNotificationIcon = () => (
    <img src={appConfig.tokenLogo} height={'24px'} width={'24px'} />
);

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

export const ThemedSignAndVerifyMsg = styled(Audit)`
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
const Rotate = styled.div`
    transform: rotate(-45deg);
`;
const MineRotate = styled.div`
    transform: rotate(45deg);
`;
export const SendIcon = () => (
    <Rotate>
        <Send title="tx-sent" />
    </Rotate>
);

export const MinedIcon = () => (
    <MineRotate>
        <Mined title="tx-mined" />
    </MineRotate>
);
const PayButtonImg = styled.img`
    color: transparent;
    filter: brightness(0) invert(1);
`;
export const EncryptedMsgIcon = () => (
    <CashtabEncrypted title="tx-encrypted-msg" />
);
export const TokenBurnIcon = () => <TokenBurn title="tx-token-burn" />;
export const PayButtonIcon = () => (
    <PayButtonImg src={PayButton} alt="tx-paybutton" />
);
const PaywallPaymentIconWrapper = styled.div`
    svg,
    g,
    path {
        fill: ${props => props.theme.eCashBlue};
    }
    fill: ${props => props.theme.eCashBlue};
`;
export const PaywallPaymentIcon = () => (
    <PaywallPaymentIconWrapper>
        <Audit title="tx-paywall" />
    </PaywallPaymentIconWrapper>
);
export const ChatIcon = () => <Chat title="tx-chat" />;
export const MintIcon = () => <Mint title="tx-mint" />;
export const CopyPasteIcon = () => <CopyPaste title="copy-paste" />;
export const AddContactIcon = () => <AddContact title="add-contact" />;
const TrashCanWrapper = styled.div`
    stroke: ${props => props.theme.eCashBlue};
    fill: ${props => props.theme.eCashBlue};
    cursor: pointer;
`;
export const TrashcanIcon = () => (
    <TrashCanWrapper>
        <Trashcan title="trashcan" />
    </TrashCanWrapper>
);
const EditWrapper = styled.div`
    stroke: ${props => props.theme.eCashBlue};
    fill: ${props => props.theme.eCashBlue};
    cursor: pointer;
`;
export const EditIcon = () => (
    <EditWrapper>
        <Edit title="edit" />
    </EditWrapper>
);
export const ReplyIcon = () => <Reply title="reply" />;
export const UnknownIcon = () => <Unknown title="tx-unknown" />;
export const CashtabMsgIcon = () => <CashtabMsg title="tx-cashtab-msg" />;
export const AliasIconTx = () => <Alias title="tx-alias-registration" />;
export const GenesisIcon = () => <Genesis title="tx-genesis" />;
export const ReceiveIcon = () => <Receive title="tx-received" />;
export const AirdropIcon = () => <Airdrop title="tx-airdrop" />;
export const SwapIcon = () => <Swap title="swap" />;
export const DollarIcon = () => <Dollar title="dollar sign" />;
export const WalletIcon = () => <Wallet title="wallet" />;
export const BankIcon = () => <Bank title="wallets" />;
export const SettingsIcon = () => <Settings title="settings" />;
export const ContactsIcon = () => <Contacts title="Contact List" />;
export const TokensIcon = () => <Tokens title="Tokens" />;
export const QuestionIcon = () => <Question title="More Info" />;
export const RewardIcon = () => <Reward title="Cashtab Rewards" />;
export const SelfSendIcon = () => <SelfSend title="Self Send" />;
export const FanOutIcon = () => <FanOut title="Fan Out" />;
export const MintNftIcon = () => <MintNft title="Mint NFT" />;
export const NftIcon = () => <Nft title="NFT" />;
export const AgoraOfferIcon = () => <AgoraOffer title="Agora Offer" />;
export const AgoraTxIcon = () => <AgoraTx title="Agora Tx" />;

const GithubIconWrapper = styled.div`
    svg {
        height: 42px;
        width: 42px;
    }
    svg,
    g,
    path {
        fill: ${props => props.theme.contrast};
    }
    fill: ${props => props.theme.contrast};
`;
export const GithubIcon = () => (
    <GithubIconWrapper>
        <Github height="142px" width="142px" title="Github" />
    </GithubIconWrapper>
);
export const QRCodeIcon = () => <QRCode />;
export const UnparsedIcon = () => <Unparsed />;
export const HomeIcon = () => <Home />;
export const AliasIcon = styled(User)``;
