import Head from 'next/head';
import Nav from './navbar';

const Layout = ({
    metaTitle = 'eCash | Wealth Redefined',
    metaDescription = 'Introducing eCash: the new battle-tested cryptocurrency forged from centuries of economic theory and over a decade of real-world crypto experience. eCash is the implementation of the tech-secured sound money envisioned by luminaries in monetary philosophy like Milton Friedman. eCash follows through on key promises such as the innovative Avalanche consensus layer while also introducing concepts never before seen in a Bitcoin project such as staking, fork-free network upgrades, and subchains. Look for the ticker symbol XEC on exchanges, wallets, or price charts, and take your first step towards true financial freedom.',
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
                <meta property="og:type" content="website" />
            </Head>
            <Nav
                announcementbar={{
                    link: 'https://avalanche.cash/',
                    text: 'Avalanche Consensus is live!',
                }}
            />
            <main>{children}</main>
        </>
    );
};

export default Layout;
