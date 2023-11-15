// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { AnnouncementBarCtn } from './styles';
import ExternalLink from '/components/external-link';

/**
 * Component to render navbar announcement bar
 * Can render as a link or just text
 * @param {string} href - url to pass to the link (optional)
 * @param {string} text - text to display
 * @param {boolean} navBackground - boolean based on window height to control the visibility of the bar
 */
export default function AnnouncementBar({ href, children, navBackground }) {
    return (
        <AnnouncementBarCtn navBackground={navBackground}>
            {href ? (
                <ExternalLink href={href}>{children}</ExternalLink>
            ) : (
                <div>{children}</div>
            )}
        </AnnouncementBarCtn>
    );
}
