// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    mockParseTxWallet,
    mockAliasWallet,
    mockParseTxWalletAirdrop,
    mockParseTxWalletEncryptedMsg,
    stakingRwd,
    incomingXec,
    outgoingXec,
    aliasRegistration,
    invalidAliasRegistration,
    incomingEtoken,
    outgoingEtoken,
    genesisTx,
    incomingEtokenNineDecimals,
    legacyAirdropTx,
    onSpecAirdropTxNoMsg,
    offSpecAirdropTx,
    outgoingEncryptedMsg,
    incomingEncryptedMsg,
    tokenBurn,
    tokenBurnDecimals,
    swapTx,
    mockSwapWallet,
    PayButtonNoDataYesNonce,
    PayButtonYesDataYesNonce,
    PayButtonBadVersion,
    PayButtonOffSpec,
    PayButtonEmpty,
    PayButtonYesDataNoNonce,
    NFToaAuthYesNonce,
    NFToaMsgNoNonce,
    NFToaOffSpec,
    MsgFromElectrum,
    MsgFromEcashChat,
    offSpecEcashChat,
    eCashChatAuthenticationTx,
    unknownAppTx,
    AlpTx,
    SlpV1Mint,
    SlpNftParentFanTx,
    SlpNftMint,
    SlpParentGenesisTxMock,
    oneOutputReceivedTx,
    agoraAdSetupTxSlpNft,
    agoraOneshotBuyTx,
    agoraOneshotSaleTx,
    AgoraOneshotCancelTx,
    agoraPartialCancelTx,
    agoraPartialBuxBuyTx,
    agoraPartialBuxSellTx,
    agoraPartialCancelTwo,
    SlpNftParentMintTx,
    partialBuyBull,
    partialSellBull,
    alpBurnTx,
    alpAgoraListingTx,
    paywallPaymentTx,
    offSpecPaywallPaymentTx,
    eCashChatArticleTx,
    offSpecEcashChatArticleTx,
    eCashChatArticleReplyTx,
    offSpecEcashChatArticleReplyTx,
    CashtabMsg,
    offSpecCashtabMsg,
    xecxTx,
    invalidXecxTx,
    firmaYieldTx,
    firmaRedeemTx,
} from './mocks';

export default {
    getTxNotificationMsg: {
        expectedReturns: [
            {
                description: 'NFToa Authentication TX (Proof of Access)',
                parsedTx: NFToaAuthYesNonce.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'NFToa | Received 5.50 XEC | Login to Gaudio App',
            },
            {
                description: 'NFToa Regular Message TX',
                parsedTx: NFToaMsgNoNonce.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'NFToa | Received 5.50 XEC | Hello World from NFToa',
            },
            {
                description: 'Off-spec NFToa TX',
                parsedTx: NFToaOffSpec.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'Received 5.50 XEC | Invalid NFToa',
            },
            {
                description: 'Staking rewards coinbase tx',
                parsedTx: stakingRwd.parsed,
                fiatPrice: 0.000033,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                returned: 'New staking reward: 625,008.97 XEC ($20.63 USD)',
            },
            {
                description: 'Handles missing fiat price',
                parsedTx: stakingRwd.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                returned: 'New staking reward: 625,008.97 XEC',
            },
            {
                description: 'Handles non-decimal locale',
                parsedTx: stakingRwd.parsed,
                fiatPrice: 0.000033,
                userLocale: 'fr-FR',
                selectedFiatTicker: 'EUR',
                returned: `New staking reward: ${`${(625008.97).toLocaleString(
                    'fr-FR',
                    {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                    },
                )} XEC${` (${`${new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }).format(20.63)} EUR`})`}`}`,
            },
            {
                description: 'Incoming XEC tx',
                parsedTx: incomingXec.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                returned: 'Received 42.00 XEC from qp8...gg6',
            },
            {
                description: 'Outgoing XEC tx',
                parsedTx: outgoingXec.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                returned: 'Sent 222.00 XEC to qp8...gg6',
            },
            {
                description: 'Incoming eToken',
                parsedTx: incomingEtoken.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                returned: 'Received 4bd14...0b0c3',
            },
            {
                description: 'Outgoing eToken',
                parsedTx: outgoingEtoken.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                returned: 'Sent 4bd14...0b0c3',
            },
            {
                description: 'Genesis tx',
                parsedTx: genesisTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                returned: '⚗️ Genesis | Created cf601...17c50',
            },
            {
                description: 'ALP agora listing',
                parsedTx: alpAgoraListingTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: alpAgoraListingTx.cache[0][1].genesisInfo,
                returned: undefined,
            },
            {
                description: 'ALP agora listing + we can handle no genesisInfo',
                parsedTx: alpAgoraListingTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: undefined,
            },
            {
                description: 'Token burn tx',
                parsedTx: tokenBurn.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: '🔥 Burned 4db25...6c875',
            },
            {
                description: 'We can parse a received ALP tx',
                parsedTx: AlpTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'Received cdcdc...2e145',
            },
            {
                description: 'SLP1 NFT Parent Fan-out tx',
                parsedTx: SlpNftParentFanTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: SlpNftParentFanTx.cache[0][1].genesisInfo,
                returned: 'Created 4 NFT mint inputs for 4HC',
            },
            {
                description: 'SLP1 NFT Mint',
                parsedTx: SlpNftMint.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: SlpNftMint.cache[0][1].genesisInfo,
                returned: 'NFT | 👨‍🎨 Minted 1 WFC',
            },
            {
                description: 'SLP1 Parent Genesis',
                parsedTx: SlpParentGenesisTxMock.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: SlpParentGenesisTxMock.cache[0][1].genesisInfo,
                returned: '⚗️ Genesis | Created 89 HSM',
            },
            {
                description: 'On spec airdrop tx no message',
                parsedTx: onSpecAirdropTxNoMsg.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned:
                    '🪂Airdrop: Sent 1,999.75 XEC to holders of fb423...f87aa | ATTENTION GRUMPY PEOPLE! 😾 You can now deposit $GRP to the eToken bot at t.me/eCashPlay to top up your Casino Credits! 1m $GRP = 1 Credit. Play Casino games and win XEC! ',
            },
            {
                description: 'Off spec airdrop tx',
                parsedTx: offSpecAirdropTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'Sent 1,999.75 XEC | Invalid 🪂Airdrop',
            },
            {
                description: 'PayButton tx with data and payment id',
                parsedTx: PayButtonYesDataYesNonce.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'PayButton: Sent 34,015.92 XEC | 😂👍',
            },
            {
                description: 'PayButton tx with unsupported version number',
                parsedTx: PayButtonBadVersion.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'Sent 34,015.92 XEC | Invalid PayButton',
            },
            {
                description: 'External msg received from Electrum',
                parsedTx: MsgFromElectrum.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned:
                    'Received 6.00 XEC | Unparsed OP_RETURN: testing a msg for error',
            },
            {
                description: 'Unknown app tx',
                parsedTx: unknownAppTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned:
                    'Sent 33.08 XEC | Unparsed OP_RETURN: 36ae3d-MERON-WIN"},{"name":"wala","message":"659fa11370e316f2ea36ae3d-WALA-WIN"}],"terms":[{"name":"refereePubKey","type":"bytes","value":"02188904278ebf33059093f596a2697cf3668b3bec9a3a0c6408a455147ab3db93"}]}}}}',
            },
            {
                description: 'eCash Chat authentication',
                parsedTx: eCashChatAuthenticationTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'Auth | Sent 5.50 XEC',
            },
            {
                description: 'External msg received from eCash Chat',
                parsedTx: MsgFromEcashChat.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned:
                    'eCashChat | Received 10.00 XEC | hello from eCash Chat 👍',
            },
            {
                description: 'Off spec eCashChat',
                parsedTx: offSpecEcashChat.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'Received 10.00 XEC | Invalid eCashChat',
            },
            {
                description: 'slp v1 mint tx',
                parsedTx: SlpV1Mint.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: '🔨 Minted aed86...53cb1',
            },
            {
                description: 'SLP ad setup tx, NFT',
                parsedTx: agoraAdSetupTxSlpNft.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: agoraAdSetupTxSlpNft.cache[0][1].genesisInfo,
                returned: undefined,
            },
            {
                description: 'Agora one-shot buy',
                parsedTx: agoraOneshotBuyTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: agoraOneshotBuyTx.cache[0][1].genesisInfo,
                returned: undefined,
            },
            {
                description: 'Agora one-shot sale',
                parsedTx: agoraOneshotSaleTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: agoraOneshotSaleTx.cache[0][1].genesisInfo,
                returned: 'Sold 1 NK for 720,668.78 XEC',
            },
            {
                description: 'Agora partial listing cancellation',
                parsedTx: agoraPartialCancelTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: agoraPartialCancelTx.cache[0][1].genesisInfo,
                returned: undefined,
            },
            {
                description: 'Another agora partial buy tx',
                parsedTx: partialBuyBull.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: partialBuyBull.cache[0][1].genesisInfo,
                returned: undefined,
            },
            {
                description: 'Another agora partial sell tx',
                parsedTx: partialSellBull.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: partialSellBull.cache[0][1].genesisInfo,
                returned: 'Sold 375 BULL for 28,126.72 XEC',
            },
            {
                description: 'Another agora partial cancel',
                parsedTx: agoraPartialCancelTwo.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: agoraPartialCancelTwo.cache[0][1].genesisInfo,
                returned: undefined,
            },
            {
                description: 'Agora one-shot listing cancellation',
                parsedTx: AgoraOneshotCancelTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: AgoraOneshotCancelTx.cache[0][1].genesisInfo,
                returned: undefined,
            },
            {
                description: 'Buy 14 bux is rendered as buy 14',
                parsedTx: agoraPartialBuxBuyTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: agoraPartialBuxBuyTx.cache[0][1].genesisInfo,
                returned: undefined,
            },
            {
                description: 'Sell 14 bux is rendered as sell 14',
                parsedTx: agoraPartialBuxSellTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: agoraPartialBuxSellTx.cache[0][1].genesisInfo,
                returned: 'Sold 14.0667 BUX for 431,445.79 XEC',
            },
            {
                description: 'SLP1 NFT Parent mint tx',
                parsedTx: SlpNftParentMintTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: SlpNftParentMintTx.cache[0][1].genesisInfo,
                returned: '🔨 Minted 1 MASCOTS',
            },
            {
                description: 'ALP burn tx',
                parsedTx: alpBurnTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: alpBurnTx.cache[0][1].genesisInfo,
                returned: '🔥 Burned 1 TB',
            },
            {
                description: 'ALP agora listing',
                parsedTx: alpAgoraListingTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: alpAgoraListingTx.cache[0][1].genesisInfo,
                returned: undefined,
            },
            {
                description: 'Paywall payment tx',
                parsedTx: paywallPaymentTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'Paywall | Received 0.00 XEC | 4d7a6...5ddc4',
            },
            {
                description: 'Off spec paywall payment tx',
                parsedTx: offSpecPaywallPaymentTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'Received 0.00 XEC | Invalid Paywall',
            },
            {
                description: 'eCashChat Article Reply',
                parsedTx: eCashChatArticleReplyTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'eCashChat Article Reply | Received 0.00 XEC',
            },
            {
                description: 'Off spec eCashChat Aricle Reply',
                parsedTx: offSpecEcashChatArticleReplyTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'Received 0.00 XEC | Invalid eCashChat Article Reply',
            },
            {
                description: 'eCashChat Article',
                parsedTx: eCashChatArticleTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'eCashChat Article | Received 0.00 XEC',
            },
            {
                description: 'off-spec eCashChat Article',
                parsedTx: offSpecEcashChatArticleTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'Received 0.00 XEC | Invalid eCashChat Article',
            },
            {
                description: 'Cashtab msg',
                parsedTx: CashtabMsg.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: `Cashtab Msg | Received 5.50 XEC | Merci pour le prix et bonne continuation dans vos projets de développeur... J'ai été censuré sûr télégramme jusqu'au 15 Avril 2024. Réparer le bug observé sur la page eToken Faucet?`,
            },
            {
                description: 'Off spec Cashtab msg',
                parsedTx: offSpecCashtabMsg.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'Received 5.50 XEC | Invalid Cashtab Msg',
            },
            {
                description: 'xecx tx',
                parsedTx: xecxTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'XECX | Received 312,503.71 XEC',
            },
            {
                description: 'invalid xecx tx',
                parsedTx: invalidXecxTx.parsed,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: undefined,
                returned: 'Received 312,503.71 XEC | Invalid XECX',
            },
            {
                description: 'Firma yield tx (send)',
                parsedTx: firmaYieldTx.parsedSend,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: {
                    tokenTicker: 'FIRMA',
                    tokenName: 'Firma',
                    url: 'firma.cash',
                    decimals: 4,
                    data: '',
                    authPubkey:
                        '03fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
                },
                returned: 'Sent 20.0481 FIRMA',
            },
            {
                description: 'Firma yield tx (receive)',
                parsedTx: firmaYieldTx.parsedReceive,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: {
                    tokenTicker: 'FIRMA',
                    tokenName: 'Firma',
                    url: 'firma.cash',
                    decimals: 4,
                    data: '',
                    authPubkey:
                        '03fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
                },
                returned: 'Received 0.0195 FIRMA',
            },
            {
                description: 'Firma redeem tx (send)',
                parsedTx: firmaRedeemTx.parsedSend,
                fiatPrice: null,
                userLocale: 'en-US',
                selectedFiatTicker: 'USD',
                genesisInfo: {
                    tokenTicker: 'FIRMA',
                    tokenName: 'Firma',
                    url: 'firma.cash',
                    decimals: 4,
                    data: '',
                    authPubkey:
                        '03fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
                },
                returned: 'Sent 1.0000 FIRMA',
            },
        ],
    },
    parseTx: {
        expectedReturns: [
            {
                description: 'NFToa Authentication TX (Proof of Access)',
                tx: NFToaAuthYesNonce.tx,
                hashes: ['c73d119dede21aca5b3f1d959634bb6fee878996'],
                parsed: NFToaAuthYesNonce.parsed,
            },
            {
                description: 'NFToa Regular Message TX (Proof of Access)',
                tx: NFToaMsgNoNonce.tx,
                hashes: ['c73d119dede21aca5b3f1d959634bb6fee878996'],
                parsed: NFToaMsgNoNonce.parsed,
            },
            {
                description: 'Off-spec NFToa TX',
                tx: NFToaOffSpec.tx,
                hashes: ['c73d119dede21aca5b3f1d959634bb6fee878996'],
                parsed: NFToaOffSpec.parsed,
            },
            {
                description: 'Staking rewards coinbase tx',
                tx: stakingRwd.tx,
                hashes: [
                    mockParseTxWallet.paths.find(p => p.path === 1899).hash,
                ],
                parsed: stakingRwd.parsed,
            },
            {
                description: 'Incoming XEC tx',
                tx: incomingXec.tx,
                hashes: [
                    mockParseTxWallet.paths.find(p => p.path === 1899).hash,
                ],
                parsed: incomingXec.parsed,
            },
            {
                description: 'Outgoing XEC tx',
                tx: outgoingXec.tx,
                hashes: [
                    mockParseTxWallet.paths.find(p => p.path === 1899).hash,
                ],
                parsed: outgoingXec.parsed,
            },
            {
                description: 'Alias registration',
                tx: aliasRegistration.tx,
                hashes: [mockAliasWallet.paths.find(p => p.path === 1899).hash],
                parsed: aliasRegistration.parsed,
            },
            {
                description: 'Invalid alias registration',
                tx: invalidAliasRegistration.tx,
                hashes: [mockAliasWallet.paths.find(p => p.path === 1899).hash],
                parsed: invalidAliasRegistration.parsed,
            },
            {
                description: 'Incoming eToken',
                tx: incomingEtoken.tx,
                hashes: [
                    mockParseTxWallet.paths.find(p => p.path === 1899).hash,
                ],
                parsed: incomingEtoken.parsed,
            },
            {
                description: 'Outgoing eToken',
                tx: outgoingEtoken.tx,
                hashes: [
                    mockParseTxWallet.paths.find(p => p.path === 1899).hash,
                ],
                parsed: outgoingEtoken.parsed,
            },
            {
                description: 'Genesis tx',
                tx: genesisTx.tx,
                hashes: [
                    mockParseTxWalletAirdrop.paths.find(p => p.path === 1899)
                        .hash,
                ],
                parsed: genesisTx.parsed,
            },
            {
                description: 'Incoming eToken tx with 9 decimals',
                tx: incomingEtokenNineDecimals.tx,
                hashes: [
                    mockParseTxWalletAirdrop.paths.find(p => p.path === 1899)
                        .hash,
                ],
                parsed: incomingEtokenNineDecimals.parsed,
            },
            {
                description: 'Legacy airdrop tx',
                tx: legacyAirdropTx.tx,
                hashes: [
                    mockParseTxWalletAirdrop.paths.find(p => p.path === 1899)
                        .hash,
                ],
                parsed: legacyAirdropTx.parsed,
            },
            {
                description: 'On spec airdrop tx no message',
                tx: onSpecAirdropTxNoMsg.tx,
                hashes: [onSpecAirdropTxNoMsg.sendingHash],
                parsed: onSpecAirdropTxNoMsg.parsed,
            },
            {
                description: 'Off spec airdrop tx',
                tx: offSpecAirdropTx.tx,
                hashes: [offSpecAirdropTx.sendingHash],
                parsed: offSpecAirdropTx.parsed,
            },
            {
                description: 'Outgoing encrypted msg (deprecated)',
                tx: outgoingEncryptedMsg.tx,
                hashes: [
                    mockParseTxWalletEncryptedMsg.paths.find(
                        p => p.path === 1899,
                    ).hash,
                ],
                parsed: outgoingEncryptedMsg.parsed,
            },
            {
                description: 'Incoming encrypted msg (deprecated)',
                tx: incomingEncryptedMsg.tx,
                hashes: [
                    mockParseTxWalletEncryptedMsg.paths.find(
                        p => p.path === 1899,
                    ).hash,
                ],
                parsed: incomingEncryptedMsg.parsed,
            },
            {
                description: 'Token burn tx',
                tx: tokenBurn.tx,
                hashes: [
                    mockParseTxWalletAirdrop.paths.find(p => p.path === 1899)
                        .hash,
                ],
                parsed: tokenBurn.parsed,
            },
            {
                description: 'Token burn tx with decimals',
                tx: tokenBurnDecimals.tx,
                hashes: [
                    mockParseTxWalletAirdrop.paths.find(p => p.path === 1899)
                        .hash,
                ],
                parsed: tokenBurnDecimals.parsed,
            },
            {
                description: 'SWaP tx',
                tx: swapTx.tx,
                hashes: [mockSwapWallet.paths.find(p => p.path === 1899).hash],
                parsed: swapTx.parsed,
            },
            {
                description: 'PayButton tx with no data and payment id',
                tx: PayButtonNoDataYesNonce.tx,
                hashes: ['f66d2760b20dc7a47d9cf1a2b2f49749bf7093f6'],
                parsed: PayButtonNoDataYesNonce.parsed,
            },
            {
                description: 'PayButton tx with data and payment id',
                tx: PayButtonYesDataYesNonce.tx,
                hashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
                parsed: PayButtonYesDataYesNonce.parsed,
            },
            {
                description: 'PayButton tx with no data and no payment id',
                tx: PayButtonEmpty.tx,
                hashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
                parsed: PayButtonEmpty.parsed,
            },
            {
                description: 'PayButton tx with data and no payment id',
                tx: PayButtonYesDataNoNonce.tx,
                hashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
                parsed: PayButtonYesDataNoNonce.parsed,
            },
            {
                description:
                    'Paybutton tx that does not have spec number of pushes',
                tx: PayButtonOffSpec.tx,
                hashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
                parsed: PayButtonOffSpec.parsed,
            },
            {
                description: 'PayButton tx with unsupported version number',
                tx: PayButtonBadVersion.tx,
                hashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
                parsed: PayButtonBadVersion.parsed,
            },
            {
                description: 'External msg received from Electrum',
                tx: MsgFromElectrum.tx,
                hashes: ['4e532257c01b310b3b5c1fd947c79a72addf8523'],
                parsed: MsgFromElectrum.parsed,
            },
            {
                description: 'Unknown app tx',
                tx: unknownAppTx.tx,
                hashes: ['d18b7b500f17c5db64303fec630f9dbb85aa9596'],
                parsed: unknownAppTx.parsed,
            },
            {
                description: 'We can parse a received ALP tx',
                tx: AlpTx.tx,
                // Mock this as a received tx
                hashes: [AlpTx.tx.outputs[1].outputScript],
                parsed: AlpTx.parsed,
            },
            {
                description: 'SLP1 NFT Parent Fan-out tx',
                tx: SlpNftParentFanTx.tx,
                // Mock this as a received tx
                hashes: [SlpNftParentFanTx.tx.outputs[1].outputScript],
                parsed: SlpNftParentFanTx.parsed,
            },
            {
                description: 'SLP1 NFT Mint',
                tx: SlpNftMint.tx,
                // Mock this as a received tx
                hashes: [SlpNftMint.tx.outputs[1].outputScript],
                parsed: SlpNftMint.parsed,
            },
            {
                description: 'SLP1 Parent Genesis',
                tx: SlpParentGenesisTxMock.tx,
                hashes: [SlpParentGenesisTxMock.tx.outputs[1].outputScript],
                parsed: SlpParentGenesisTxMock.parsed,
            },
            {
                description: 'received xec tx with no change',
                tx: oneOutputReceivedTx.tx,
                hashes: ['601efc2aa406fe9eaedd41d2b5d95d1f4db9041d'],
                parsed: oneOutputReceivedTx.parsed,
            },
            {
                description: 'eCash Chat authentication',
                tx: eCashChatAuthenticationTx.tx,
                hashes: [eCashChatAuthenticationTx.sendingHash],
                parsed: eCashChatAuthenticationTx.parsed,
            },
            {
                description: 'External msg received from eCash Chat',
                tx: MsgFromEcashChat.tx,
                hashes: ['0b7d35fda03544a08e65464d54cfae4257eb6db7'],
                parsed: MsgFromEcashChat.parsed,
            },
            {
                description: 'Off spec eCashChat',
                tx: offSpecEcashChat.tx,
                hashes: ['0b7d35fda03544a08e65464d54cfae4257eb6db7'],
                parsed: offSpecEcashChat.parsed,
            },
            {
                description: 'slp v1 mint tx',
                tx: SlpV1Mint.tx,
                hashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
                parsed: SlpV1Mint.parsed,
            },
            {
                description: 'SLP ad setup tx, NFT',
                tx: agoraAdSetupTxSlpNft.tx,
                // Cashtab alpha one sent hash
                hashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
                parsed: agoraAdSetupTxSlpNft.parsed,
            },
            {
                description: 'Agora one-shot buy',
                tx: agoraOneshotBuyTx.tx,
                hashes: [agoraOneshotBuyTx.sendingHash],
                parsed: agoraOneshotBuyTx.parsed,
            },
            {
                description: 'Agora one-shot sale',
                tx: agoraOneshotSaleTx.tx,
                hashes: [agoraOneshotSaleTx.sendingHash],
                parsed: agoraOneshotSaleTx.parsed,
            },
            {
                description: 'Agora partial listing cancellation',
                tx: agoraPartialCancelTx.tx,
                hashes: ['7847fe7070bec8567b3e810f543f2f80cc3e03be'],
                parsed: agoraPartialCancelTx.parsed,
            },
            {
                description: 'Another agora partial buy tx',
                tx: partialBuyBull.tx,
                hashes: [partialBuyBull.sendingHash],
                parsed: partialBuyBull.parsed,
            },
            {
                description: 'Another agora partial sell tx',
                tx: partialSellBull.tx,
                hashes: [partialSellBull.sendingHash],
                parsed: partialSellBull.parsed,
            },
            {
                description: 'Another agora partial cancel',
                tx: agoraPartialCancelTwo.tx,
                hashes: [agoraPartialCancelTwo.hash],
                parsed: agoraPartialCancelTwo.parsed,
            },
            {
                description: 'Agora one-shot listing cancellation',
                tx: AgoraOneshotCancelTx.tx,
                hashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
                parsed: AgoraOneshotCancelTx.parsed,
            },
            {
                description: 'Buy 14 bux is rendered as buy 14',
                tx: agoraPartialBuxBuyTx.tx,
                hashes: [agoraPartialBuxBuyTx.sendingHash],
                parsed: agoraPartialBuxBuyTx.parsed,
            },
            {
                description: 'Sell 14 bux is rendered as sell 14',
                tx: agoraPartialBuxSellTx.tx,
                hashes: [agoraPartialBuxSellTx.sendingHash],
                parsed: agoraPartialBuxSellTx.parsed,
            },
            {
                description: 'SLP1 NFT Parent mint tx',
                tx: SlpNftParentMintTx.tx,
                hashes: [SlpNftParentMintTx.sendingHash],
                parsed: SlpNftParentMintTx.parsed,
            },
            {
                description: 'ALP burn tx',
                tx: alpBurnTx.tx,
                hashes: [alpBurnTx.sendingHash],
                parsed: alpBurnTx.parsed,
            },
            {
                description: 'ALP agora listing',
                tx: alpAgoraListingTx.tx,
                hashes: [alpAgoraListingTx.sendingHash],
                parsed: alpAgoraListingTx.parsed,
            },
            {
                description: 'Paywall payment tx',
                tx: paywallPaymentTx.tx,
                hashes: [paywallPaymentTx.sendingHash],
                parsed: paywallPaymentTx.parsed,
            },
            {
                description: 'Off spec paywall payment tx',
                tx: offSpecPaywallPaymentTx.tx,
                hashes: [paywallPaymentTx.sendingHash],
                parsed: offSpecPaywallPaymentTx.parsed,
            },
            {
                description: 'eCashChat Article Reply',
                tx: eCashChatArticleReplyTx.tx,
                hashes: [
                    mockParseTxWallet.paths.find(p => p.path === 1899).hash,
                ],
                parsed: eCashChatArticleReplyTx.parsed,
            },
            {
                description: 'Off spec eCashChat Aricle Reply',
                tx: offSpecEcashChatArticleReplyTx.tx,
                hashes: [
                    mockParseTxWallet.paths.find(p => p.path === 1899).hash,
                ],
                parsed: offSpecEcashChatArticleReplyTx.parsed,
            },
            {
                description: 'eCashChat Article',
                tx: eCashChatArticleTx.tx,
                hashes: [
                    mockParseTxWallet.paths.find(p => p.path === 1899).hash,
                ],
                parsed: eCashChatArticleTx.parsed,
            },
            {
                description: 'off-spec eCashChat Article',
                tx: offSpecEcashChatArticleTx.tx,
                hashes: [
                    mockParseTxWallet.paths.find(p => p.path === 1899).hash,
                ],
                parsed: offSpecEcashChatArticleTx.parsed,
            },
            {
                description: 'Cashtab msg',
                tx: CashtabMsg.tx,
                hashes: [offSpecCashtabMsg.sendingHash],
                parsed: CashtabMsg.parsed,
            },
            {
                description: 'Off spec Cashtab msg',
                tx: offSpecCashtabMsg.tx,
                hashes: [offSpecCashtabMsg.sendingHash],
                parsed: offSpecCashtabMsg.parsed,
            },
            {
                description: 'xecx tx',
                tx: xecxTx.tx,
                hashes: [xecxTx.sendingHash],
                parsed: xecxTx.parsed,
            },
            {
                description: 'invalid xecx tx',
                tx: invalidXecxTx.tx,
                hashes: [invalidXecxTx.sendingHash],
                parsed: invalidXecxTx.parsed,
            },
            {
                description: 'Firma yield tx (send)',
                tx: firmaYieldTx.tx,
                hashes: [firmaYieldTx.sendingHash],
                parsed: firmaYieldTx.parsedSend,
            },
            {
                description: 'Firma yield tx (receive)',
                tx: firmaYieldTx.tx,
                hashes: [firmaYieldTx.receivingHash],
                parsed: firmaYieldTx.parsedReceive,
            },
            {
                description: 'Firma redeem tx (send)',
                tx: firmaRedeemTx.tx,
                hashes: [firmaRedeemTx.sendingHash],
                parsed: firmaRedeemTx.parsedSend,
            },
        ],
    },
    getTokenGenesisInfo: {
        expectedReturns: [
            {
                description: 'slpv1 token with no minting batons',
                tokenId:
                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                tokenInfo: {
                    tokenId:
                        'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'ABC',
                        tokenName: 'ABC',
                        url: 'https://cashtab.com/',
                        decimals: 0,
                        hash: '',
                    },
                    block: {
                        height: 832725,
                        hash: '000000000000000016d97961a24ac3460160bbc439810cd2af684264ae15083b',
                        timestamp: 1708607039,
                    },
                },
                genesisTx: {
                    txid: 'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                    version: 2,
                    inputs: [
                        {
                            prevOut: {
                                txid: '9866faa3294afc3f4dd5669c67ee4d0ded42db25d08728fe07166e9cda9ee8f9',
                                outIdx: 3,
                            },
                            inputScript:
                                '483045022100fb14b5f82605972478186c91ff6fab2051b46abd2a8aa9774b3e9276715daf39022046a62933cc3acf59129fbf373ef05480342312bc33aaa8bf7fb5a0495b5dc80e412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                            sats: 1617n,
                            sequenceNo: 4294967295,
                            outputScript:
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        },
                    ],
                    outputs: [
                        {
                            sats: 0n,
                            outputScript:
                                '6a04534c500001010747454e4553495303414243034142431468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000000c',
                        },
                        {
                            sats: 546n,
                            outputScript:
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                            token: {
                                tokenId:
                                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                    number: 1,
                                },
                                atoms: 12n,
                                isMintBaton: false,
                                entryIdx: 0,
                            },
                            spentBy: {
                                txid: '41fd4cb3ce0162e44cfd5a446b389afa6b35461d466d55321be412a518c56d63',
                                outIdx: 0,
                            },
                        },
                    ],
                    lockTime: 0,
                    timeFirstSeen: 0,
                    size: 261,
                    isCoinbase: false,
                    tokenEntries: [
                        {
                            tokenId:
                                'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            txType: 'GENESIS',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAtoms: 0n,
                            intentionalBurnAtoms: 0n,
                            burnsMintBatons: false,
                        },
                    ],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                    block: {
                        height: 832725,
                        hash: '000000000000000016d97961a24ac3460160bbc439810cd2af684264ae15083b',
                        timestamp: 1708607039,
                    },
                },
                returned: {
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'ABC',
                        tokenName: 'ABC',
                        url: 'https://cashtab.com/',
                        decimals: 0,
                        hash: '',
                    },
                    block: {
                        height: 832725,
                        hash: '000000000000000016d97961a24ac3460160bbc439810cd2af684264ae15083b',
                        timestamp: 1708607039,
                    },
                    genesisMintBatons: 0,
                    genesisOutputScripts: [
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    ],
                    genesisSupply: '12',
                },
            },
            {
                description:
                    'slpv1 token with no minting batons unconfirmed genesis tx',
                tokenId:
                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                tokenInfo: {
                    tokenId:
                        'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'ABC',
                        tokenName: 'ABC',
                        url: 'https://cashtab.com/',
                        decimals: 0,
                        hash: '',
                    },
                },
                genesisTx: {
                    txid: 'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                    version: 2,
                    inputs: [
                        {
                            prevOut: {
                                txid: '9866faa3294afc3f4dd5669c67ee4d0ded42db25d08728fe07166e9cda9ee8f9',
                                outIdx: 3,
                            },
                            inputScript:
                                '483045022100fb14b5f82605972478186c91ff6fab2051b46abd2a8aa9774b3e9276715daf39022046a62933cc3acf59129fbf373ef05480342312bc33aaa8bf7fb5a0495b5dc80e412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                            sats: 1617n,
                            sequenceNo: 4294967295,
                            outputScript:
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        },
                    ],
                    outputs: [
                        {
                            sats: 0n,
                            outputScript:
                                '6a04534c500001010747454e4553495303414243034142431468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000000c',
                        },
                        {
                            sats: 546n,
                            outputScript:
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                            token: {
                                tokenId:
                                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                    number: 1,
                                },
                                atoms: 12n,
                                isMintBaton: false,
                                entryIdx: 0,
                            },
                            spentBy: {
                                txid: '41fd4cb3ce0162e44cfd5a446b389afa6b35461d466d55321be412a518c56d63',
                                outIdx: 0,
                            },
                        },
                    ],
                    lockTime: 0,
                    timeFirstSeen: 0,
                    size: 261,
                    isCoinbase: false,
                    tokenEntries: [
                        {
                            tokenId:
                                'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            txType: 'GENESIS',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAtoms: 0n,
                            intentionalBurnAtoms: 0n,
                            burnsMintBatons: false,
                        },
                    ],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                },
                returned: {
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'ABC',
                        tokenName: 'ABC',
                        url: 'https://cashtab.com/',
                        decimals: 0,
                        hash: '',
                    },
                    genesisMintBatons: 0,
                    genesisOutputScripts: [
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    ],
                    genesisSupply: '12',
                },
            },
            {
                description: 'slpv1 token with minting baton',
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenInfo: {
                    tokenId:
                        '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'TBC',
                        tokenName: 'tabcash',
                        url: 'https://cashtabapp.com/',
                        decimals: 0,
                        hash: '',
                    },
                    block: {
                        height: 674143,
                        hash: '000000000000000034c77993a35c74fe2dddace27198681ca1e89e928d0c2fff',
                        timestamp: 1613859311,
                    },
                },
                genesisTx: {
                    txid: '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                    version: 2,
                    inputs: [
                        {
                            prevOut: {
                                txid: 'be38b0488679e25823b7a72b925ac695a7b486e7f78122994b913f3079b0b939',
                                outIdx: 2,
                            },
                            inputScript:
                                '483045022100e28006843eb071ec6d8dd105284f2ca625a28f4dc85418910b59a5ab13fc6c2002205921fb12b541d1cd1a63e7e012aca5735df3398525f64bac04337d21029413614121034509251caa5f01e2787c436949eb94d71dcc451bcde5791ae5b7109255f5f0a3',
                            sats: 91048n,
                            sequenceNo: 4294967295,
                            outputScript:
                                '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                        },
                    ],
                    outputs: [
                        {
                            sats: 0n,
                            outputScript:
                                '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001000102080000000000000064',
                        },
                        {
                            sats: 546n,
                            outputScript:
                                '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                            token: {
                                tokenId:
                                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                    number: 1,
                                },
                                atoms: 100n,
                                isMintBaton: false,
                                entryIdx: 0,
                            },
                            spentBy: {
                                txid: '618d0dd8c0c5fa5a34c6515c865dd72bb76f8311cd6ee9aef153bab20dabc0e6',
                                outIdx: 1,
                            },
                        },
                        {
                            sats: 546n,
                            outputScript:
                                '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                            token: {
                                tokenId:
                                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                    number: 1,
                                },
                                atoms: 0n,
                                isMintBaton: true,
                                entryIdx: 0,
                            },
                        },
                        {
                            sats: 89406n,
                            outputScript:
                                '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                            spentBy: {
                                txid: '618d0dd8c0c5fa5a34c6515c865dd72bb76f8311cd6ee9aef153bab20dabc0e6',
                                outIdx: 0,
                            },
                        },
                    ],
                    lockTime: 0,
                    timeFirstSeen: 0,
                    size: 336,
                    isCoinbase: false,
                    tokenEntries: [
                        {
                            tokenId:
                                '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            txType: 'GENESIS',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAtoms: 0n,
                            intentionalBurnAtoms: 0n,
                            burnsMintBatons: false,
                        },
                    ],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                    block: {
                        height: 674143,
                        hash: '000000000000000034c77993a35c74fe2dddace27198681ca1e89e928d0c2fff',
                        timestamp: 1613859311,
                    },
                },
                returned: {
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'TBC',
                        tokenName: 'tabcash',
                        url: 'https://cashtabapp.com/',
                        decimals: 0,
                        hash: '',
                    },
                    block: {
                        height: 674143,
                        hash: '000000000000000034c77993a35c74fe2dddace27198681ca1e89e928d0c2fff',
                        timestamp: 1613859311,
                    },
                    genesisMintBatons: 1,
                    genesisOutputScripts: [
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    ],
                    genesisSupply: '100',
                },
            },
            {
                description: 'ALP token with a minting baton',
                tokenId:
                    'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                tokenInfo: {
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'CRD',
                        tokenName: 'Credo In Unum Deo',
                        url: 'https://crd.network/token',
                        decimals: 4,
                        data: {},
                        authPubkey:
                            '0334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10',
                    },
                    block: {
                        height: 795680,
                        hash: '00000000000000000b7e89959ee52ca1cd691e1fc3b4891c1888f84261c83e73',
                        timestamp: 1686305735,
                    },
                },
                genesisTx: {
                    txid: 'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    version: 1,
                    inputs: [
                        {
                            prevOut: {
                                txid: 'dd2020be54ad3dccf98548512e6f735cac002434bbddb61f19cbe6f3f1de04da',
                                outIdx: 0,
                            },
                            inputScript:
                                '4130ef71df9d2daacf48d05a0361e103e087b636f4d68af8decd769227caf198003991629bf7057fa1572fc0dd3581115a1b06b5c0eafc88555e58521956fe5cbc410768999600fc71a024752102d8cb55aaf01f84335130bf7b3751267e5cf3398a60e5162ff93ec8d77f14850fac',
                            sats: 4000n,
                            sequenceNo: 4294967295,
                            outputScript:
                                'a91464275fca443d169d23d077c85ad1bb7a31b6e05987',
                        },
                    ],
                    outputs: [
                        {
                            sats: 0n,
                            outputScript:
                                '6a504c63534c5032000747454e455349530343524411437265646f20496e20556e756d2044656f1968747470733a2f2f6372642e6e6574776f726b2f746f6b656e00210334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10040001',
                        },
                        {
                            sats: 546n,
                            outputScript:
                                '76a914bbb6c4fecc56ecce35958f87c2367cd3f5e88c2788ac',
                            token: {
                                tokenId:
                                    'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                                tokenType: {
                                    protocol: 'ALP',
                                    type: 'ALP_TOKEN_TYPE_STANDARD',
                                    number: 0,
                                },
                                atoms: 0n,
                                isMintBaton: true,
                                entryIdx: 0,
                            },
                            spentBy: {
                                txid: 'ff06c312bef229f6f27989326d9be7e0e142aaa84538967b104b262af69f7f00',
                                outIdx: 0,
                            },
                        },
                    ],
                    lockTime: 777777,
                    timeFirstSeen: 0,
                    size: 308,
                    isCoinbase: false,
                    tokenEntries: [
                        {
                            tokenId:
                                'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            txType: 'GENESIS',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAtoms: 0n,
                            intentionalBurnAtoms: 0n,
                            burnsMintBatons: false,
                        },
                    ],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                    block: {
                        height: 795680,
                        hash: '00000000000000000b7e89959ee52ca1cd691e1fc3b4891c1888f84261c83e73',
                        timestamp: 1686305735,
                    },
                },
                returned: {
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'CRD',
                        tokenName: 'Credo In Unum Deo',
                        url: 'https://crd.network/token',
                        decimals: 4,
                        data: {},
                        authPubkey:
                            '0334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10',
                    },
                    block: {
                        height: 795680,
                        hash: '00000000000000000b7e89959ee52ca1cd691e1fc3b4891c1888f84261c83e73',
                        timestamp: 1686305735,
                    },
                    genesisMintBatons: 1,
                    genesisOutputScripts: [
                        '76a914bbb6c4fecc56ecce35958f87c2367cd3f5e88c2788ac',
                    ],
                    genesisSupply: '0.0000',
                },
            },
            {
                description: 'slpv2 genesis tx',
                tokenId:
                    '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5', // BUX
                tokenInfo: {
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'BUX',
                        tokenName: 'Badger Universal Token',
                        url: 'https://bux.digital',
                        decimals: 4,
                        hash: '',
                    },
                    block: {
                        height: 726564,
                        hash: '000000000000000010ea35897b2b7373261fdfbca3d02e4f9a6eeb79dc914315',
                        timestamp: 1644797123,
                    },
                },
                genesisTx: {
                    txid: '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    version: 1,
                    inputs: [
                        {
                            prevOut: {
                                txid: 'b5605cdda8e5cc5f475f2473f34ad01b29fa0995bac5d37dcb54b858f76db61f',
                                outIdx: 0,
                            },
                            inputScript:
                                '41614bc7f35d66b30c017e111c98ad22086730435bea6cf0ec54188ca425863f2a60ee808a11564258d0defc2bfa1505953e18a8108409fb048cfa39bdacc82fce4121027e6cf8229495afadcb5a7e40365bbc82afcf145eacca3193151e68a61fc81743',
                            sats: 3200n,
                            sequenceNo: 4294967295,
                            outputScript:
                                '76a914502ee2f475081f2031861f3a275c52722199280e88ac',
                        },
                    ],
                    outputs: [
                        {
                            sats: 0n,
                            outputScript:
                                '6a04534c500001010747454e45534953034255581642616467657220556e6976657273616c20546f6b656e1368747470733a2f2f6275782e6469676974616c4c0001040102080000000000000000',
                        },
                        {
                            sats: 2300n,
                            outputScript:
                                'a9144d80de3cda49fd1bd98eb535da0f2e4880935ea987',
                            spentBy: {
                                txid: '459a8dbf3b31750ddaaed4d2c6a12fb42ef1b83fc0f67175f43332962932aa7d',
                                outIdx: 0,
                            },
                        },
                        {
                            sats: 546n,
                            outputScript:
                                'a91420d151c5ab4ca4154407626069eaafd8ce6306fc87',
                            token: {
                                tokenId:
                                    '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                    number: 1,
                                },
                                atoms: 0n,
                                isMintBaton: true,
                                entryIdx: 0,
                            },
                            spentBy: {
                                txid: '459a8dbf3b31750ddaaed4d2c6a12fb42ef1b83fc0f67175f43332962932aa7d',
                                outIdx: 1,
                            },
                        },
                    ],
                    lockTime: 0,
                    timeFirstSeen: 0,
                    size: 302,
                    isCoinbase: false,
                    tokenEntries: [
                        {
                            tokenId:
                                '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            txType: 'GENESIS',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAtoms: 0n,
                            intentionalBurnAtoms: 0n,
                            burnsMintBatons: false,
                        },
                    ],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                    block: {
                        height: 726564,
                        hash: '000000000000000010ea35897b2b7373261fdfbca3d02e4f9a6eeb79dc914315',
                        timestamp: 1644797123,
                    },
                },
                returned: {
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'BUX',
                        tokenName: 'Badger Universal Token',
                        url: 'https://bux.digital',
                        decimals: 4,
                        hash: '',
                    },
                    block: {
                        height: 726564,
                        hash: '000000000000000010ea35897b2b7373261fdfbca3d02e4f9a6eeb79dc914315',
                        timestamp: 1644797123,
                    },
                    genesisMintBatons: 1,
                    genesisOutputScripts: [
                        'a91420d151c5ab4ca4154407626069eaafd8ce6306fc87',
                    ],
                    genesisSupply: '0.0000',
                },
            },
            {
                description: 'Slp type 2 token (BUX)',
                tokenId:
                    '52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6',
                tokenInfo: {
                    tokenId:
                        '52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_MINT_VAULT',
                        number: 2,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'BUX',
                        tokenName: 'Badger Universal Token',
                        url: 'https://bux.digital',
                        decimals: 4,
                        mintVaultScripthash:
                            '08d6edf91c7b93d18306d3b8244587e43f11df4b',
                        hash: '',
                    },
                    block: {
                        height: 811408,
                        hash: '000000000000000016d3b567884f11f44592ce7cd2642e74014b1c65bc6a5c81',
                        timestamp: 1695700586,
                    },
                },
                genesisTx: {
                    txid: '52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6',
                    version: 1,
                    inputs: [
                        {
                            prevOut: {
                                txid: '8586a0e6dc08653dc5b88afe751efbb97d78246482985d01802c98b75f873fba',
                                outIdx: 10,
                            },
                            inputScript:
                                '473044022040b7bb9093b092003b5c41090f4b7560a7bcfed35278fd05d2f1083653529ea902205a11af8aea5d16a01dc7648397eb6b04369dda9e3e9ecc4a9efe3f5b4a41a1dd412102fafcdb1f5f0d2e49909fbafc18f339bcfc2b765b3def934d501eb798e626c7b3',
                            sats: 3851630n,
                            sequenceNo: 4294967294,
                            outputScript:
                                '76a91452558a0640aae72592c3b336a3a4959ce97906b488ac',
                        },
                    ],
                    outputs: [
                        {
                            sats: 0n,
                            outputScript:
                                '6a04534c500001020747454e45534953034255581642616467657220556e6976657273616c20546f6b656e1368747470733a2f2f6275782e6469676974616c4c0001041408d6edf91c7b93d18306d3b8244587e43f11df4b080000000000000000',
                        },
                        {
                            sats: 546n,
                            outputScript:
                                '76a91452558a0640aae72592c3b336a3a4959ce97906b488ac',
                        },
                        {
                            sats: 3850752n,
                            outputScript:
                                '76a914f4592a09e8da1a2157916963bc0fb7fe682df73e88ac',
                        },
                    ],
                    lockTime: 811407,
                    timeFirstSeen: 0,
                    size: 331,
                    isCoinbase: false,
                    tokenEntries: [
                        {
                            tokenId:
                                '52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_MINT_VAULT',
                                number: 2,
                            },
                            txType: 'GENESIS',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAtoms: 0n,
                            intentionalBurnAtoms: 0n,
                            burnsMintBatons: false,
                        },
                    ],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                    block: {
                        height: 811408,
                        hash: '000000000000000016d3b567884f11f44592ce7cd2642e74014b1c65bc6a5c81',
                        timestamp: 1695700586,
                    },
                },
                returned: {
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_MINT_VAULT',
                        number: 2,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'BUX',
                        tokenName: 'Badger Universal Token',
                        url: 'https://bux.digital',
                        decimals: 4,
                        mintVaultScripthash:
                            '08d6edf91c7b93d18306d3b8244587e43f11df4b',
                        hash: '',
                    },
                    block: {
                        height: 811408,
                        hash: '000000000000000016d3b567884f11f44592ce7cd2642e74014b1c65bc6a5c81',
                        timestamp: 1695700586,
                    },
                    genesisMintBatons: 0,
                    genesisOutputScripts: [],
                    genesisSupply: '0.0000',
                },
            },
            {
                description: 'slpv1 NFT child',
                tokenId:
                    '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                tokenInfo: {
                    tokenId:
                        '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    timeFirstSeen: 1713910791,
                    genesisInfo: {
                        tokenTicker: 'GC',
                        tokenName: 'Gordon Chen',
                        url: 'https://en.wikipedia.org/wiki/Tai-Pan_(novel)',
                        decimals: 0,
                        hash: '8247001da3bf5680011e26628228761b994a9e0a4ba3f1fdd826ddbf044e5d72',
                    },
                    block: {
                        height: 841509,
                        hash: '000000000000000003f0e8a3f0a4de0689311c5708d26b25851bb24a44027753',
                        timestamp: 1713913313,
                    },
                },
                genesisTx: {
                    txid: '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                    version: 2,
                    inputs: [
                        {
                            prevOut: {
                                txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
                                outIdx: 3,
                            },
                            inputScript:
                                '483045022100e394332d19812c6b78ac39484dd755473348cc11920ceaea00c9185dc36cac9302203f04fbb661cd9137d5536667f03f89f2096b487a95b7a9eddbf2a33c7fb12d93412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                            sats: 546n,
                            sequenceNo: 4294967295,
                            token: {
                                tokenId:
                                    '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                    number: 129,
                                },
                                atoms: 1n,
                                isMintBaton: false,
                                entryIdx: 1,
                            },
                            outputScript:
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        },
                        {
                            prevOut: {
                                txid: '5478bbf6ebe4a0f0ac05994608b4b980264ba1225259f7f6c0f573e998be98e6',
                                outIdx: 2,
                            },
                            inputScript:
                                '47304402200dd2615f8545e57157d0cba016db42d4e25688a265155c7c332cf049eec4300202206cc96ee2f25141302f5e2aaade959ef9d972739f054585cf5dedb6bfec2f5928412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                            sats: 32767046n,
                            sequenceNo: 4294967295,
                            outputScript:
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        },
                    ],
                    outputs: [
                        {
                            sats: 0n,
                            outputScript:
                                '6a04534c500001410747454e455349530247430b476f72646f6e204368656e2d68747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f5461692d50616e5f286e6f76656c29208247001da3bf5680011e26628228761b994a9e0a4ba3f1fdd826ddbf044e5d7201004c00080000000000000001',
                        },
                        {
                            sats: 546n,
                            outputScript:
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                            token: {
                                tokenId:
                                    '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                                    number: 65,
                                },
                                atoms: 1n,
                                isMintBaton: false,
                                entryIdx: 0,
                            },
                        },
                        {
                            sats: 32766028n,
                            outputScript:
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        },
                    ],
                    lockTime: 0,
                    timeFirstSeen: 1713910791,
                    size: 505,
                    isCoinbase: false,
                    tokenEntries: [
                        {
                            tokenId:
                                '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                                number: 65,
                            },
                            txType: 'GENESIS',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAtoms: 0n,
                            intentionalBurnAtoms: 0n,
                            burnsMintBatons: false,
                            groupTokenId:
                                '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        },
                        {
                            tokenId:
                                '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                number: 129,
                            },
                            txType: 'NONE',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAtoms: 0n,
                            intentionalBurnAtoms: 0n,
                            burnsMintBatons: false,
                        },
                    ],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                    block: {
                        height: 841509,
                        hash: '000000000000000003f0e8a3f0a4de0689311c5708d26b25851bb24a44027753',
                        timestamp: 1713913313,
                    },
                },
                returned: {
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    timeFirstSeen: 1713910791,
                    genesisInfo: {
                        tokenTicker: 'GC',
                        tokenName: 'Gordon Chen',
                        url: 'https://en.wikipedia.org/wiki/Tai-Pan_(novel)',
                        decimals: 0,
                        hash: '8247001da3bf5680011e26628228761b994a9e0a4ba3f1fdd826ddbf044e5d72',
                    },
                    groupTokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    block: {
                        height: 841509,
                        hash: '000000000000000003f0e8a3f0a4de0689311c5708d26b25851bb24a44027753',
                        timestamp: 1713913313,
                    },
                    genesisMintBatons: 0,
                    genesisOutputScripts: [
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    ],
                    genesisSupply: '1',
                },
            },
        ],
        expectedErrors: [
            {
                description:
                    'Error is thrown if 1st chronik API call not completed successfully',
                tokenId:
                    '1111111111111111111111111111111111111111111111111111111111111111',
                tokenInfo: new Error(
                    'Bad response from chronik.token(tokenId)',
                ),
                genesisTx: {}, // non-error response
                msg: new Error('Bad response from chronik.token(tokenId)'),
            },
            {
                description:
                    'Error is thrown if 2nd chronik API call not completed successfully',
                tokenId:
                    '1111111111111111111111111111111111111111111111111111111111111111',
                tokenInfo: {}, // non-error response
                genesisTx: new Error('Bad response from chronik.tx(tokenId)'),
                msg: new Error('Bad response from chronik.tx(tokenId)'),
            },
        ],
    },
};
