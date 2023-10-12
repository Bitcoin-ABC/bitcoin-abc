// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { AnnouncementBarCtn, Timer } from './styles';
import CustomLink from '/components/custom-link';
import Countdown, { zeroPad } from 'react-countdown';

const activationTime = 1700049600000;
// The upgrade usually happens 1h after the time (due to being based on MTP).
// However it can take a bit more time due to variance. Let's be pessimistic
// and add a safety margin of 3h. Worst case the message is updated a bit
// late, and otherwise it's enough time for some dev to update this page
// manually after the update completed.
const switchTime = activationTime + 3 * 3600000;

/**
 * CountdownClock renderer
 * The weglot-ignore classname here is used to tell weglot not to transalate that element.
 * It is configured in the weglot portal.
 * @param {number} days, hours, minutes, seconds - values from the Countdown package
 * @param {string} text - text to display
 * @param {boolean} completed - boolean based on the time left in the countdown
 */
const CountdownClock = ({ days, hours, minutes, seconds, completed, text }) => {
    return (
        <span suppressHydrationWarning>
            <span>{completed ? 'eCash network upgrade complete!' : text}</span>
            {!completed && (
                <Timer
                    className="weglot-ignore"
                    suppressHydrationWarning={true}
                >
                    {zeroPad(days, 2)} Days {zeroPad(hours, 2)}:
                    {zeroPad(minutes, 2)}:{zeroPad(seconds, 2)}
                </Timer>
            )}
        </span>
    );
};

/**
 * Component to render navbar announcement bar
 * Can render as a link or just text
 * @param {string} href - url to pass to the link (optional)
 * @param {string} text - text to display
 * @param {boolean} navBackground - boolean based on window height to control the visibility of the bar
 */
export default function AnnouncementBar({ href, text, navBackground }) {
    return (
        <AnnouncementBarCtn navBackground={navBackground}>
            {href ? (
                <CustomLink href={href}>
                    <Countdown
                        date={switchTime}
                        renderer={props => (
                            <CountdownClock {...props} text={text} />
                        )}
                    />
                </CustomLink>
            ) : (
                <div>{text}</div>
            )}
        </AnnouncementBarCtn>
    );
}
