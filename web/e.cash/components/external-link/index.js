// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Link from 'next/link';

export const ExternalLink = ({ href, children }) => {
    return href.startsWith('https') ? (
        <Link href={href} target="_blank" rel="noreferrer">
            {children}
        </Link>
    ) : (
        <Link href={href}>{children}</Link>
    );
};

export default ExternalLink;
