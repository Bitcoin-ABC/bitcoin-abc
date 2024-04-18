// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import { Wrapper } from 'components/Rewards/styles';
import { WalletContext } from 'wallet/context';
import PrimaryButton from 'components/Common/Buttons';
import { toast } from 'react-toastify';
import { token as tokenConfig } from 'config/token';
import { InlineLoader } from 'components/Common/Spinner';

const Rewards = () => {
    const ContextValue = React.useContext(WalletContext);
    const { cashtabState } = ContextValue;
    const { wallets } = cashtabState;
    const address = wallets[0].paths.get(1899).address;
    const [isEligible, setIsEligible] = useState(null);
    const [eligibleAgainTimestamp, setEligibleAgainTimestamp] = useState(null);
    const [timeRemainingMs, setTimeRemainingMs] = useState(null);

    const getIsEligible = async address => {
        let serverResponse;
        try {
            serverResponse = await (
                await fetch(
                    `${tokenConfig.rewardsServerBaseUrl}/is-eligible/${address}`,
                )
            ).json();
            // Could help in debugging from user reports
            console.info(serverResponse);
            const { isEligible } = serverResponse;
            setIsEligible(isEligible);
            if (!isEligible) {
                const { becomesEligible } = serverResponse;
                setEligibleAgainTimestamp(becomesEligible);
            }
        } catch (err) {
            const errorMsg = `Error determining token reward eligibility for address ${address}: Token rewards server is not responding.`;
            console.error(errorMsg, err);
            return toast.error(errorMsg);
        }
    };
    const handleClaim = async () => {
        // Hit token-server API for rewards
        let claimResponse;
        try {
            claimResponse = await (
                await fetch(
                    `${tokenConfig.rewardsServerBaseUrl}/claim/${address}`,
                )
            ).json();
            // Could help in debugging from user reports
            console.info(claimResponse);
            if ('error' in claimResponse) {
                if (
                    claimResponse.error ===
                    'Address is not yet eligible for token rewards'
                ) {
                    throw new Error(
                        'Address is not eligible for token rewards. Try again 24 hours after your last claim.',
                    );
                }
                if (
                    'msg' in claimResponse &&
                    claimResponse.msg === 'Error: Insufficient token utxos'
                ) {
                    throw new Error(
                        'token-server is out of rewards to send. Contact admin.',
                    );
                }
                throw new Error(`${claimResponse.error}:${claimResponse.msg}`);
            }
            toast.success('Rewards claimed!');

            // Reset rewards eligibility
            getIsEligible(address);
        } catch (err) {
            console.error(err);
            toast.error(`${err}`);
        }
    };

    const getParsedTimeRemaining = timeRemainingMs => {
        if (timeRemainingMs === null) {
            return { hours: 0, minutes: 0, seconds: 0 };
        }
        // Note: Token rewards are available every 24 hrs, so we do not need days
        let hours = Math.floor(
            (timeRemainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        if (hours < 10) {
            hours = `0${hours}`;
        }
        let minutes = Math.floor(
            (timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60),
        );
        if (minutes < 10) {
            minutes = `0${minutes}`;
        }
        let seconds = Math.floor((timeRemainingMs % (1000 * 60)) / 1000);
        if (seconds < 10) {
            seconds = `0${seconds}`;
        }

        return { hours, minutes, seconds };
    };

    const { hours, minutes, seconds } =
        timeRemainingMs !== null
            ? getParsedTimeRemaining(timeRemainingMs)
            : { hours: 0, minutes: 0, seconds: 0 };

    useEffect(() => {
        // execute when address variable changes
        // i.e. on page load or when the user changes a wallet

        // Set iseligible to false (so user cannot click button before server response
        // when switching from an eligible wallet to an ineligible one)
        setIsEligible(false);
        if (typeof address === 'undefined') {
            // Should never happen as Cashtab renders Onboarding screen if no wallet has been created
            return;
        }

        // Hit token-server API to check eligibility of this address
        getIsEligible(address);
    }, [address]);

    useEffect(() => {
        if (eligibleAgainTimestamp === null) {
            return;
        }
        const interval = setInterval(() => {
            setTimeRemainingMs(
                1000 * eligibleAgainTimestamp - new Date().getTime(),
            );
        }, 1000);

        return () => clearInterval(interval);
    }, [eligibleAgainTimestamp]);

    return (
        <Wrapper title="Rewards">
            <PrimaryButton disabled={!isEligible} onClick={handleClaim}>
                {isEligible === null ? (
                    <center>
                        <InlineLoader />
                    </center>
                ) : isEligible ? (
                    'Claim Reward'
                ) : timeRemainingMs !== null ? (
                    `Come back in ${hours}:${minutes}:${seconds}`
                ) : (
                    <center>
                        <InlineLoader />
                    </center>
                )}
            </PrimaryButton>
        </Wrapper>
    );
};

export default Rewards;
