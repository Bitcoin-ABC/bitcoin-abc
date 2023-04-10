import Head from 'next/head';

const Layout = ({
    metaTitle = 'eCash | Wealth Redefined',
    metaDescription = 'Derived from one of the most trusted names in the cryptocurrency space, what was once known as BCHA is now eCash. eCash is the natural continuation of the Bitcoin Cash project. Realizing the vision of the legendary Milton Friedman, eCash follows through on key promises such as the innovative Avalanche consensus layer while also introducing concepts never before seen in a Bitcoin project such as staking, fork-free network upgrades, and subchains. Look for the ticker symbol XEC on exchanges, wallets, or price charts, and take your first step towards true financial freedom.',
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
            <main>{children}</main>
        </>
    );
};

export default Layout;
