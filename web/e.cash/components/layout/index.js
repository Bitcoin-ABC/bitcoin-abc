// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Head from 'next/head';
import Nav from '/components/navbar';
import Footer from '/components/footer';

const Layout = ({
    metaTitle = 'eCash | Cash for the Internet',
    metaDescription = 'eCash is a fast, secure, and scalable cryptocurrency designed for the internet. Offering staking, non-custodial solutions, fixed supply, and support for NFTs and etokens, eCash is the future of decentralized digital cash. Look for the ticker symbol XEC, and take your first step towards true financial freedom.',
    children,
}) => {
    return (
        <>
            <Head>
                <meta
                    content="width=device-width, initial-scale=1"
                    name="viewport"
                />
                <link rel="icon" href="/favicon.png" />
                <title>{metaTitle}</title>
                <meta name="description" content={metaDescription} />
                <meta name="og:title" content={metaTitle} />
                <meta property="og:description" content={metaDescription} />
                <meta name="twitter:title" content={metaTitle} />
                <meta
                    property="twitter:description"
                    content={metaDescription}
                />
                <meta name="twitter:card" content="summary_large_image" />
                <meta
                    name="twitter:image"
                    content="https://e.cash/images/ecash-twitter-card.jpg"
                ></meta>
                <meta
                    property="og:image"
                    content="https://e.cash/images/ecash-twitter-card.jpg"
                ></meta>
                <meta property="og:type" content="website" />
            </Head>
            <Nav />
            <main>{children}</main>
            <Footer />
        </>
    );
};

export default Layout;
