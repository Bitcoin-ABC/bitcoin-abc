import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import { GradientSpacer } from '/components/atoms';
import coinupdown from '/public/animations/coin-up-down.json';

function GeteCash() {
    return (
        <Layout>
            <SubPageHero
                image={coinupdown}
                h2subtext="Get eCash"
                h2text="Start Today"
            >
                <p>
                    Get started today by getting your first eCash. It's simple
                    and there are several ways to do it. You can find out how
                    below.
                </p>
            </SubPageHero>
            <GradientSpacer />
        </Layout>
    );
}

export default GeteCash;
