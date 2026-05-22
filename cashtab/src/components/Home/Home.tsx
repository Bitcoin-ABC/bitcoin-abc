// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useContext } from 'react';
import styled from 'styled-components';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import { Link } from 'react-router';
import TxHistory from './TxHistory';
import ApiError from 'components/Common/ApiError';
import { Info } from 'components/Common/Atoms';
import PrimaryButton, {
    SecondaryButton,
    PrimaryLink,
    SecondaryLink,
} from 'components/Common/Buttons';
import { toast } from 'react-toastify';
import { token as tokenConfig } from 'config/token';
import { InlineLoader } from 'components/Common/Spinner';
import ReCAPTCHA from 'react-google-recaptcha';
import {
    isRecaptchaV3Configured,
    TOKEN_REWARD_RECAPTCHA_ACTION,
    RECAPTCHA_V3_VERIFICATION_ERROR,
} from 'constants/recaptcha';
import {
    buildTokenRewardClaimBody,
    useRecaptchaV3Execute,
} from 'services/recaptchaService';
import { ReactComponent as WarningIcon } from 'assets/warning.svg';
import ActionButtonRow from 'components/Common/ActionButtonRow';
import { ReactComponent as GiftIcon } from 'assets/gift-icon.svg';

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
    color: ${props => props.theme.primaryText};
    @media (max-width: 768px) {
        padding: 0 10px;
    }
`;

const BackupWalletAlert = styled(Link)`
    text-decoration: none;
    background-color: #454111;
    color: ${props => props.theme.primaryText};
    border-radius: 10px;
    padding: 20px;
    display: flex;
    align-items: center;
    width: 100%;
    margin: 0 auto;
    gap: 10px;
    margin-bottom: 10px;
    svg {
        flex-shrink: 0;
        width: 50px;
        height: 50px;
        fill: #ffc400;
    }
    > div {
        text-align: left;
        > p {
            margin: 0;
        }
    }
    em {
        font-weight: 700;
        color: #ffc400;
    }
    :hover {
        background-color: #8d7f0f;
        color: ${props => props.theme.primaryText};
    }
    @media (max-width: 768px) {
        padding: 10px;
        gap: 5px;
        svg {
            width: 30px;
            height: 30px;
        }
        > div {
            > p {
                font-size: var(--text-sm);
                line-height: var(--text-sm--line-height);
            }
        }
    }
`;

export const AlertHeader = styled.h2`
    color: ${props => props.theme.primaryText};
    font-size: var(--text-lg);
    font-weight: 600;
    line-height: var(--text-lg--line-height);
    margin: 0;
    text-decoration: underline;
    @media (max-width: 768px) {
        font-size: var(--text-base);
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

export const ClaimRewardsButton = styled.button<{ disabled?: boolean }>`
    width: 100%;
    display: flex;
    border: none;
    outline: none;
    color: ${props => props.theme.primaryText};
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    opacity: ${props => (props.disabled ? 0.5 : 1)};
    padding: 30px 20px;
    background: linear-gradient(180deg, #764aa7, #4f178c);
    border-radius: 10px;
    cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
    margin: 0 auto;
    :hover {
        background-color: #8d7f0f;
    }
    @media (max-width: 768px) {
        padding: 15px 10px;
    }
    > div {
        display: flex;
        align-items: center;
        text-align: left;
        gap: 14px;
        font-size: var(--text-lg);
        font-weight: 700;
        line-height: 1.2em;
        @media (max-width: 768px) {
            font-size: var(--text-base);
            gap: 10px;
        }
    }
    svg {
        width: 30px;
        height: 30px;
        @media (max-width: 768px) {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }
    }
    span {
        background: #fff;
        color: ${props => props.theme.primaryBackground};
        padding: 6px 16px;
        border-radius: 8px;
        font-size: var(--text-sm);
        font-weight: 700;
        opacity: ${props => (props.disabled ? 0.5 : 1)};
        @media (max-width: 768px) {
            font-size: 12px;
            flex-shrink: 0;
        }
    }
`;

const Home: React.FC = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const { apiError, cashtabState, transactionHistory, ecashWallet } =
        ContextValue;
    // Show ApiError even if wallet isn't loaded yet
    if (apiError && !ecashWallet) {
        return <ApiError />;
    }
    if (!ecashWallet) {
        return null;
    }
    const hasHistory =
        transactionHistory && transactionHistory.firstPageTxs.length > 0;

    // Want to show a msg to users who have just claimed a free XEC reward, or users who have just received
    // a few txs
    const isNewishWallet =
        hasHistory &&
        transactionHistory &&
        transactionHistory.firstPageTxs.length < 3 &&
        Number(ecashWallet.balanceSats) > 0;

    const [airdropPending, setAirdropPending] = useState(false);
    const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
    const recaptchaRef = React.useRef<ReCAPTCHA>(null);

    const claimAirdropForNewWallet = async () => {
        if (typeof import.meta.env.VITE_RECAPTCHA_SITE_KEY === 'undefined') {
            // Recaptcha env var must be set to claimAirdropForNewWallet
            return;
        }
        if (!recaptchaToken) {
            toast.error('Please complete the reCAPTCHA verification');
            return;
        }
        // Disable the button to prevent double claims
        setAirdropPending(true);

        // Claim rewards
        // We only show this option if wallet has no tx history. Such a wallet is always
        // expected to be eligible.
        let claimResponse;
        try {
            claimResponse = await (
                await fetch(
                    `${tokenConfig.rewardsServerBaseUrl}/claimxec/${ecashWallet.address}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ token: recaptchaToken }),
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
            setRecaptchaToken(null);
            if (recaptchaRef.current) {
                recaptchaRef.current.reset();
            }
        } catch (err) {
            setAirdropPending(false);
            console.error(err);
            toast.error(`${err}`);
            setRecaptchaToken(null);
            if (recaptchaRef.current) {
                recaptchaRef.current.reset();
            }
        }
    };

    const handleRecaptchaChange = (token: string | null) => {
        setRecaptchaToken(token);
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
                        <ActionButtonRow variant="homepage" />
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
                                <BackupWalletAlert to="/backup">
                                    <WarningIcon
                                        title="Warning"
                                        aria-hidden="true"
                                    />
                                    <div>
                                        <AlertHeader>
                                            Backup your wallet
                                        </AlertHeader>
                                        <p>
                                            Write down your 12-word seed and
                                            keep it in a safe place.
                                            <br />
                                            <em>
                                                Do not share your backup with
                                                anyone.
                                            </em>
                                        </p>
                                    </div>
                                </BackupWalletAlert>
                                {import.meta.env.VITE_BUILD_ENV !==
                                    'extension' &&
                                    import.meta.env.VITE_TESTNET !== 'true' && (
                                        <>
                                            {cashtabState.wallets.length ===
                                            1 ? (
                                                <>
                                                    <ClaimRewardsButton
                                                        onClick={
                                                            claimAirdropForNewWallet
                                                        }
                                                        disabled={
                                                            airdropPending ||
                                                            !recaptchaToken
                                                        }
                                                    >
                                                        <div>
                                                            <GiftIcon /> Free
                                                            XEC Welcome Bonus!
                                                        </div>
                                                        <span>
                                                            {airdropPending ? (
                                                                <InlineLoader />
                                                            ) : (
                                                                'Claim Now!'
                                                            )}
                                                        </span>
                                                    </ClaimRewardsButton>
                                                    <div
                                                        style={{
                                                            marginTop: '12px',
                                                            display: 'flex',
                                                            justifyContent:
                                                                'center',
                                                        }}
                                                    >
                                                        <ReCAPTCHA
                                                            ref={recaptchaRef}
                                                            sitekey={
                                                                import.meta.env
                                                                    .VITE_RECAPTCHA_SITE_KEY ||
                                                                ''
                                                            }
                                                            onChange={
                                                                handleRecaptchaChange
                                                            }
                                                        />
                                                    </div>
                                                </>
                                            ) : isRecaptchaV3Configured() ? (
                                                <NewWalletTokenRewardsClaimButton
                                                    address={
                                                        ecashWallet.address
                                                    }
                                                />
                                            ) : null}
                                        </>
                                    )}
                            </>
                        )}
                    </>
                )}
            </TxHistoryCtn>
        </>
    );
};

interface NewWalletTokenRewardsClaimButtonProps {
    address: string;
}

const NewWalletTokenRewardsClaimButton: React.FC<
    NewWalletTokenRewardsClaimButtonProps
> = ({ address }) => {
    const [tokenRewardsPending, setTokenRewardsPending] = useState(false);
    const [claimSucceeded, setClaimSucceeded] = useState(false);
    const { executeRecaptchaV3 } = useRecaptchaV3Execute();

    const claimTokenRewardsForNewWallet = async () => {
        const tokenRewardRecaptchaToken = await executeRecaptchaV3(
            TOKEN_REWARD_RECAPTCHA_ACTION,
        );
        if (!tokenRewardRecaptchaToken) {
            toast.error(RECAPTCHA_V3_VERIFICATION_ERROR);
            return;
        }
        setTokenRewardsPending(true);
        let claimResponse;
        try {
            claimResponse = await (
                await fetch(
                    `${tokenConfig.rewardsServerBaseUrl}/claim/${address}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(
                            buildTokenRewardClaimBody(
                                tokenRewardRecaptchaToken,
                            ),
                        ),
                    },
                )
            ).json();
            console.info(claimResponse);
            if ('error' in claimResponse) {
                throw new Error(`${claimResponse.error}:${claimResponse.msg}`);
            }
            toast.success(
                'Token rewards claimed! Check "Rewards" menu option for more.',
            );
            setClaimSucceeded(true);
        } catch (err) {
            setTokenRewardsPending(false);
            console.error(err);
            toast.error(`${err}`);
        }
    };

    if (claimSucceeded) {
        return null;
    }

    return (
        <ClaimRewardsButton
            onClick={claimTokenRewardsForNewWallet}
            disabled={tokenRewardsPending}
        >
            <div>
                <GiftIcon /> You've earned Token Rewards!
            </div>
            <span>{tokenRewardsPending ? <InlineLoader /> : 'Claim Now!'}</span>
        </ClaimRewardsButton>
    );
};

export default Home;
