// Copyright (c) 2024-2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import styled from 'styled-components';
import PayButton from 'assets/paybutton.webp';
import XecxSrc from 'assets/xecx-logomark.png';
import SolSrc from 'assets/solanaLogoMark.png';
import TetherSrc from 'assets/tether.png';
import FirmaSrc from 'assets/firma-icon.png';
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
import { ReactComponent as AgoraBuy } from 'assets/agora-buy.svg';
import { ReactComponent as AgoraSale } from 'assets/agora-sale.svg';
import { ReactComponent as AgoraCancel } from 'assets/agora-cancel.svg';
import { ReactComponent as Doge } from 'assets/doge.svg';
import { ReactComponent as CollapseDown } from 'assets/collapse-down.svg';
import { ReactComponent as TokenSend } from 'assets/tokensend.svg';
import { ReactComponent as IsMintAddress } from 'assets/is-mint-address.svg';
import { ReactComponent as NFToa } from 'assets/nftoa.svg';
import { ReactComponent as Dice } from 'assets/dice.svg';
import { ReactComponent as PayoutWin } from 'assets/payout-win.svg';
import { ReactComponent as BlitsPayout } from 'assets/blits-payout.svg';

import appConfig from 'config/app';

export const CashReceivedNotificationIcon: React.FC = () => (
    <img height={'24px'} width={'24px'} src={appConfig.logo} />
);
export const TokenNotificationIcon: React.FC = () => (
    <img src={appConfig.tokenLogo} height={'24px'} width={'24px'} />
);

export const ThemedLinkSolid = styled(LinkSolid)`
    fill: ${props => props.theme.primaryText};
    padding: 0.15rem 0rem 0.18rem 0rem;
    height: 1.3em;
    width: 1.3em;
`;

export const ThemedPdfSolid = styled(Pdf)`
    fill: ${props => props.theme.primaryText};
    padding: 0.15rem 0rem 0.18rem 0rem;
    height: 1.3em;
    width: 1.3em;
`;

export const ThemedSignAndVerifyMsg = styled(Audit)`
    min-width: 24px;
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
                fill: ${props => props.theme.secondaryAccent};
                path:not(#F) {
                    fill: ${props => props.theme.secondaryAccent};
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
        fill: ${props => props.theme.accent};
    }
`;

const MineRotate = styled.div`
    transform: rotate(45deg);
`;
export const SendIcon: React.FC = () => <Send title="tx-sent" />;

export const MinedIcon: React.FC = () => (
    <MineRotate>
        <Mined title="tx-mined" />
    </MineRotate>
);
const PayButtonImg = styled.img`
    color: transparent;
    filter: brightness(0) invert(1);
`;
export const EncryptedMsgIcon: React.FC = () => (
    <CashtabEncrypted title="tx-encrypted-msg" />
);
export const TokenBurnIcon: React.FC = () => (
    <TokenBurn title="tx-token-burn" />
);
export const TokenSendIcon: React.FC = () => <TokenSend title="Token Send" />;
export const PayButtonIcon: React.FC = () => (
    <PayButtonImg src={PayButton} alt="tx-paybutton" />
);
export const XecxIcon: React.FC = () => <img src={XecxSrc} alt="XECX reward" />;
export const FirmaIcon: React.FC = () => (
    <img src={FirmaSrc} alt="Firma reward" />
);
export const SolIcon: React.FC = () => <img src={SolSrc} alt="SOL logo" />;
export const TetherIcon: React.FC = () => (
    <img src={TetherSrc} alt="USDT Tether logo" />
);

const PaywallPaymentIconWrapper = styled.div`
    svg,
    g,
    path {
        fill: ${props => props.theme.accent};
    }
    fill: ${props => props.theme.accent};
`;
export const PaywallPaymentIcon: React.FC = () => (
    <PaywallPaymentIconWrapper>
        <Audit title="tx-paywall" />
    </PaywallPaymentIconWrapper>
);
export const ChatIcon: React.FC = () => <Chat title="tx-chat" />;
export const MintIcon: React.FC = () => <Mint title="tx-mint" />;
export const IsMintAddressIcon: React.FC = () => (
    <IsMintAddress title="Listed by token creator" />
);
export const CopyPasteIcon: React.FC = () => <CopyPaste title="copy-paste" />;
export const AddContactIcon: React.FC = () => (
    <AddContact title="add-contact" />
);
const TrashCanWrapper = styled.div`
    stroke: ${props => props.theme.accent};
    fill: ${props => props.theme.accent};
    cursor: pointer;
`;
export const TrashcanIcon: React.FC = () => (
    <TrashCanWrapper>
        <Trashcan title="trashcan" />
    </TrashCanWrapper>
);
const EditWrapper = styled.div`
    stroke: ${props => props.theme.accent};
    fill: ${props => props.theme.accent};
    cursor: pointer;
`;
export const EditIcon: React.FC = () => (
    <EditWrapper>
        <Edit title="edit" />
    </EditWrapper>
);
export const ReplyIcon: React.FC = () => <Reply title="reply" />;
export const UnknownIcon: React.FC = () => <Unknown title="tx-unknown" />;
export const CashtabMsgIcon: React.FC = () => (
    <CashtabMsg title="tx-cashtab-msg" />
);
export const AliasIconTx: React.FC = () => (
    <Alias title="tx-alias-registration" />
);
export const GenesisIcon: React.FC = () => <Genesis title="tx-genesis" />;
export const ReceiveIcon: React.FC = () => <Receive title="tx-received" />;
export const AirdropIcon: React.FC = () => <Airdrop title="tx-airdrop" />;
export const SwapIcon: React.FC = () => <Swap title="swap" />;
export const DollarIcon: React.FC = () => <Dollar title="dollar sign" />;
export const WalletIcon: React.FC = () => <Wallet title="wallet" />;
export const BankIcon: React.FC = () => <Bank title="wallets" />;
export const SettingsIcon: React.FC = () => <Settings title="settings" />;
export const ContactsIcon: React.FC = () => <Contacts title="Contact List" />;
export const TokensIcon: React.FC = () => <Tokens title="Tokens" />;
export const QuestionIcon: React.FC = () => <Question title="More Info" />;
export const RewardIcon: React.FC = () => <Reward title="Cashtab Rewards" />;
export const SelfSendIcon: React.FC = () => <SelfSend title="Self Send" />;
export const FanOutIcon: React.FC = () => <FanOut title="Fan Out" />;
export const MintNftIcon: React.FC = () => <MintNft title="Mint NFT" />;
export const NftIcon: React.FC = () => <Nft title="NFT" />;
export const AgoraOfferIcon: React.FC = () => (
    <AgoraOffer title="Agora Offer" />
);
export const AgoraBuyIcon: React.FC = () => <AgoraBuy title="Agora Purchase" />;
export const AgoraSaleIcon: React.FC = () => <AgoraSale title="Agora Sale" />;
export const AgoraCancelIcon: React.FC = () => (
    <AgoraCancel title="Agora Cancel" />
);
export const DogeIcon: React.FC = () => <Doge title="Meme Agora" />;
export const CollapseDownIcon: React.FC = () => <CollapseDown title="Expand" />;

const GithubIconWrapper = styled.div`
    svg {
        height: 42px;
        width: 42px;
    }
    svg,
    g,
    path {
        fill: ${props => props.theme.primaryText};
    }
    fill: ${props => props.theme.primaryText};
`;
export const GithubIcon: React.FC = () => (
    <GithubIconWrapper>
        <Github height="142px" width="142px" title="Github" />
    </GithubIconWrapper>
);
export const QRCodeIcon: React.FC = () => <QRCode />;
export const UnparsedIcon: React.FC = () => <Unparsed />;
export const HomeIcon: React.FC = () => <Home />;
export const AliasIcon = styled(User)``;
export const NFToaIcon: React.FC = () => <NFToa title="tx-nftoa" />;
export const DiceIcon: React.FC = () => <Dice title="Blitzchips Bet" />;
export const PayoutWinIcon: React.FC = () => (
    <PayoutWin title="Blitzchips Payout Win" />
);
export const BlitsPayoutIcon: React.FC = () => (
    <BlitsPayout title="Blitzchips Payout Loss" />
);
