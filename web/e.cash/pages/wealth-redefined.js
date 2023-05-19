import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import spiningcoin from '/public/animations/spiningcoin.json';

export default function WealthRedefined() {
    return (
        <Layout>
            <SubPageHero
                image={spiningcoin}
                h2subtext="Wealth Redefined"
                h2text="Introduction"
            >
                <p>
                    Derived from one of the most trusted names in the
                    cryptocurrency space, what was once known as BCHA is now
                    eCash. Realizing the vision of the legendary Milton
                    Friedman, eCash is taking financial freedom to a level never
                    before seen.
                </p>
                <p>
                    With eCash, sending money is now as simple as sending an
                    email.
                </p>
                <p>
                    Look for the ticker symbol XEC on exchanges, wallets, or
                    price charts, and take your first step towards true
                    financial freedom.
                </p>
            </SubPageHero>
        </Layout>
    );
}
