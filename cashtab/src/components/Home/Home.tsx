// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useContext } from 'react';
import styled from 'styled-components';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import { Link } from 'react-router-dom';
import TxHistory from './TxHistory';
import ApiError from 'components/Common/ApiError';
import Receive from 'components/Receive/Receive';
import { Alert, Info } from 'components/Common/Atoms';
import PrimaryButton, {
    SecondaryButton,
    PrimaryLink,
    SecondaryLink,
} from 'components/Common/Buttons';
import { toast } from 'react-toastify';
import { token as tokenConfig } from 'config/token';
import { InlineLoader } from 'components/Common/Spinner';
import { load } from 'recaptcha-v3';

export const Tabs = styled.div`
    margin: auto;
    display: inline-block;
    text-align: center;
    width: 100%;
    margin: 20px 0;
`;

export const TxHistoryCtn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: ${props => props.theme.primaryText};
    background-color: ${props => props.theme.primaryBackground};
    padding: 20px;
    border-radius: 10px;
    @media (max-width: 768px) {
        border-radius: 0;
        padding: 10px;
    }
`;

export const AlertLink = styled(Link)`
    color: red;
    :hover {
        color: #000;
    }
`;

export const AddrSwitchContainer = styled.div`
    text-align: center;
    padding: 6px 0 12px 0;
`;

export const AirdropButton = styled(PrimaryButton)`
    margin-bottom: 0;
    div {
        margin: auto;
    }
`;
export const TokenRewardButton = styled(SecondaryButton)`
    margin-bottom: 0;
    div {
        margin: auto;
    }
`;

const Home: React.FC = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const { apiError, cashtabState, transactionHistory } = ContextValue;
    const { wallets, activeWallet } = cashtabState;
    if (!activeWallet) {
        return null;
    }
    const wallet = activeWallet;
    const hasHistory =
        transactionHistory && transactionHistory.firstPageTxs.length > 0;

    // Want to show a msg to users who have just claimed a free XEC reward, or users who have just received
    // a few txs
    const isNewishWallet =
        hasHistory &&
        transactionHistory &&
        transactionHistory.firstPageTxs.length < 3 &&
        wallet.state.balanceSats > 0;

    const [airdropPending, setAirdropPending] = useState(false);
    const [tokenRewardsPending, setTokenRewardsPending] = useState(false);

    const claimAirdropForNewWallet = async () => {
        if (typeof process.env.REACT_APP_RECAPTCHA_SITE_KEY === 'undefined') {
            // Recaptcha env var must be set to claimAirdropForNewWallet
            return;
        }
        // Disable the button to prevent double claims
        setAirdropPending(true);
        const recaptcha = await load(process.env.REACT_APP_RECAPTCHA_SITE_KEY);
        const token = await recaptcha.execute('claimxec');

        // Claim rewards
        // We only show this option if wallet has no tx history. Such a wallet is always
        // expected to be eligible.
        let claimResponse;
        try {
            claimResponse = await (
                await fetch(
                    `${tokenConfig.rewardsServerBaseUrl}/claimxec/${wallet.address}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ token }),
                    },
                )
            ).json();
            // Could help in debugging from user reports
            console.info(claimResponse);
            if ('error' in claimResponse) {
                throw new Error(`${claimResponse.error}:${claimResponse.msg}`);
            }
            toast.success('Free eCash claimed!');
            // Note we do not setAirdropPending(false) on a successful claim
            // The button will disappear when the tx is seen by the wallet
            // We do not want the button to be enabled before this
        } catch (err) {
            setAirdropPending(false);
            console.error(err);
            toast.error(`${err}`);
        }
    };

    const claimTokenRewardsForNewWallet = async () => {
        // Disable the button to prevent double claims
        setTokenRewardsPending(true);
        // Claim rewards
        // We only show this option if wallet has no tx history. Such a wallet is always
        // expected to be eligible.
        let claimResponse;
        try {
            claimResponse = await (
                await fetch(
                    `${tokenConfig.rewardsServerBaseUrl}/claim/${wallet.address}`,
                )
            ).json();
            // Could help in debugging from user reports
            console.info(claimResponse);
            if ('error' in claimResponse) {
                throw new Error(`${claimResponse.error}:${claimResponse.msg}`);
            }
            toast.success(
                'Token rewards claimed! Check "Rewards" menu option for more.',
            );
            // Note we do not setTokenRewardsPending(false) on a successful claim
            // The button will disappear when the tx is seen by the wallet
            // We do not want the button to be enabled before this
        } catch (err) {
            setTokenRewardsPending(false);
            console.error(err);
            toast.error(`${err}`);
        }
    };

    return (
        <>
            {apiError && <ApiError />}
            <TxHistoryCtn data-testid="tx-history">
                {transactionHistory === null ? (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <InlineLoader />
                    </div>
                ) : (
                    <>
                        <TxHistory />
                        {isNewishWallet && (
                            <>
                                <Info style={{ marginBottom: '20px' }}>
                                    ℹ️ Nice, you have some eCash. What can you
                                    do?
                                </Info>
                                <PrimaryLink to="/create-token">
                                    Create a token
                                </PrimaryLink>
                                <SecondaryLink to="/create-nft-collection">
                                    Mint an NFT
                                </SecondaryLink>
                                <Info>
                                    Check out{' '}
                                    <a
                                        href="https://e.cash/use-ecash"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        more uses for XEC
                                    </a>
                                </Info>
                            </>
                        )}
                        {!hasHistory && (
                            <>
                                <Alert>
                                    <p>
                                        <b>
                                            <AlertLink to="/backup">
                                                Backup your wallet
                                            </AlertLink>
                                        </b>
                                    </p>
                                    <p>
                                        Write down your 12-word seed and keep it
                                        in a safe place.{' '}
                                        <em>
                                            Do not share your backup with
                                            anyone.
                                        </em>
                                    </p>
                                </Alert>
                                {process.env.REACT_APP_BUILD_ENV !==
                                    'extension' &&
                                    process.env.REACT_APP_TESTNET !==
                                        'true' && (
                                        <>
                                            {wallets.length === 1 ? (
                                                <AirdropButton
                                                    onClick={
                                                        claimAirdropForNewWallet
                                                    }
                                                    disabled={airdropPending}
                                                >
                                                    {airdropPending ? (
                                                        <InlineLoader />
                                                    ) : (
                                                        'Claim Free XEC'
                                                    )}
                                                </AirdropButton>
                                            ) : (
                                                <TokenRewardButton
                                                    onClick={
                                                        claimTokenRewardsForNewWallet
                                                    }
                                                    disabled={
                                                        tokenRewardsPending
                                                    }
                                                >
                                                    {tokenRewardsPending ? (
                                                        <InlineLoader />
                                                    ) : (
                                                        'Claim Token Rewards'
                                                    )}
                                                </TokenRewardButton>
                                            )}
                                        </>
                                    )}

                                <Receive />
                            </>
                        )}
                    </>
                )}
            </TxHistoryCtn>
        </>
    );
};

export default Home;
