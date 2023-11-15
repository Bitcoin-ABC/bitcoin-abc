// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AnnouncementBarCtn, Timer } from './styles';
import Countdown, { zeroPad } from 'react-countdown';

/**
 * Second stage countdown render
 * uses the passed blocksUntilUpgrade value from the api to display the remaining blocks for MTB
 * Once this is less than 0 it will display the network upgrade as complete
 * If it is greater than 0 will display the remaining blocks
 * @param {number} blocksUntilCountdown - value from the API that shows how many blocks left for the MTB
 */
const CountdownSecondStage = ({ blocksUntilUpgrade }) => {
    if (blocksUntilUpgrade < 0) {
        return (
            <span>
                <span>The network upgrade has activated!</span>
                <span>Click here for more details</span>
            </span>
        );
    } else if (blocksUntilUpgrade > 0) {
        return (
            <span>
                <span>Network upgrade will go live in</span>
                <Timer>
                    {blocksUntilUpgrade} more block
                    {blocksUntilUpgrade >= 2 ? 's' : ''}!
                </Timer>
            </span>
        );
    } else if (blocksUntilUpgrade === 0) {
        return (
            <span>
                <span>The network upgrade has activated!</span>
                <span>Staking reward Payouts begin next block...</span>
            </span>
        );
    }
};

/**
 * Component to render first stage countdown
 * Once complete (based on the fetched timestamp) will render the second stage countdown
 * Note the suppressHydrationWarning prop here. This is needed to avoid Next.js errors
 * See https://nextjs.org/docs/messages/react-hydration-error#solution-3-using-suppresshydrationwarning
 * @param {react-countdown props} days, hours, minutes, seconds, completed
 * @param {number} blocksUntilCountdown - value from the API that shows how many blocks left for the MTB
 */
const CountdownFirstStage = ({
    days,
    hours,
    minutes,
    seconds,
    completed,
    blocksUntilUpgrade,
}) => {
    if (completed) {
        return <CountdownSecondStage blocksUntilUpgrade={blocksUntilUpgrade} />;
    } else {
        return (
            <span suppressHydrationWarning>
                <span>Prepare for the eCash network upgrade!</span>
                <Timer
                    className="weglot-ignore"
                    suppressHydrationWarning={true}
                >
                    {zeroPad(days, 2)} Day{days !== 1 ? 's' : ''}{' '}
                    {zeroPad(hours, 2)}:{zeroPad(minutes, 2)}:
                    {zeroPad(seconds, 2)}
                </Timer>
            </span>
        );
    }
};

/**
 * Component to render network upgrade countdown banner
 * @param {boolean} navBackground - boolean based on window height to control the visibility of the bar
 */
export default function UpgradeNotice({ navBackground }) {
    const countDownInfoAPI = 'https://avalanche.cash/api/info/XEC';
    const [blocksUntilUpgrade, setBlocksUntilUpgrade] = useState(6);
    const [firstStageCompleted, setFirstStageCompleted] = useState(false);
    const [timestamp, setTimestamp] = useState(0);
    const [loading, setLoading] = useState(true);

    const handleFirstStageComplete = () => {
        setFirstStageCompleted(true);
    };

    // if the time on page load is past the timestamp and there is value for blocksUntilUpgrade
    // start polling the api for the new blockuntilupgrade every minute
    // start running this after the firststage is complete
    useEffect(() => {
        if (Date.now() > timestamp && blocksUntilUpgrade >= 0) {
            const fetchBlocksUntilUpgrade = async () => {
                try {
                    const response = await fetch(countDownInfoAPI);
                    const data = await response.json();
                    const newBlocksUntilUpgrade = data.blocksUntilUpgrade;

                    if (
                        newBlocksUntilUpgrade !== blocksUntilUpgrade &&
                        newBlocksUntilUpgrade !== null
                    ) {
                        setBlocksUntilUpgrade(newBlocksUntilUpgrade);
                    }
                } catch (error) {
                    console.error('Error fetching data:', error);
                }
            };

            // Poll the API every 10 seconds
            const pollingInterval = 10000;
            const intervalId = setInterval(
                fetchBlocksUntilUpgrade,
                pollingInterval,
            );

            // Cleanup the interval on component unmount
            return () => clearInterval(intervalId);
        }
    }, [blocksUntilUpgrade, timestamp, firstStageCompleted]);

    // on page load fetch the countdown info api and set the
    // timestamp, blocksUntilUpgrade, and loading state
    // if this inital call fails the banner will not appear
    useEffect(() => {
        fetch(countDownInfoAPI)
            .then(response => {
                return response.json();
            })
            .then(data => {
                setTimestamp(data.upgradeTimeStamp * 1000);
                if (data.blocksUntilUpgrade !== null) {
                    setBlocksUntilUpgrade(data.blocksUntilUpgrade);
                }
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    }, []);

    if (loading) {
        return null;
    } else
        return (
            <AnnouncementBarCtn navBackground={navBackground}>
                <Link href="/upgrade">
                    <Countdown
                        date={timestamp}
                        onComplete={handleFirstStageComplete}
                        renderer={props => (
                            <CountdownFirstStage
                                {...props}
                                blocksUntilUpgrade={blocksUntilUpgrade}
                            />
                        )}
                    />
                </Link>
            </AnnouncementBarCtn>
        );
}
