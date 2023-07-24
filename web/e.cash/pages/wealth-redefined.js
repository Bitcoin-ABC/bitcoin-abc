// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Image from 'next/image';
import Link from 'next/link';
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import { Container, CenterImage, GradientSpacer } from '/components/atoms';
import spiningcoin from '/public/animations/spiningcoin.json';
import handslogo from '/public/images/hands-logo.png';
import rocket from '/public/images/rocket.png';
import bitcoinabc from '/public/images/bitcoinabc-logo.png';
import { TextBlock } from '/styles/pages/wealth-redefined.js';
import QuoteCarousel from '/components/quote-carousel';

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
            <GradientSpacer />
            <Container narrow>
                <TextBlock>
                    <H3 text="Wealth Redefined" id="wealth-redefined" />
                    <p>
                        In today&rsquo;s age of change and innovation,
                        it&rsquo;s time to expand our understanding of wealth.
                        It&rsquo;s not just about dollars. It&rsquo;s about
                        time. It&rsquo;s about control. It&rsquo;s about
                        adventure.
                    </p>
                    <p>
                        Wealth enables freedom, privacy, and the power to sound
                        a different voice than the unthinking majority.
                    </p>
                    <p>
                        Enter eCash. Sound money enables wealth. Join us and
                        take your first step on the path to financial and
                        personal freedom. Let&rsquo;s redefine wealth together.
                    </p>
                    <CenterImage height="500px">
                        <Image src={handslogo} alt="eCash" fill />
                    </CenterImage>
                </TextBlock>

                <TextBlock>
                    <H3 text="Our Why" id="our-why" />
                    <p>
                        The truth is not always popular. Especially today, where
                        facts and opinions are easily mixed and manipulated.
                        <br />
                        <br />
                        We have paid the price for this in the past. We have
                        celebrated success, briefly eclipsing Ethereum&rsquo;s
                        market cap with Bitcoin Cash, but have also wandered in
                        the desert of prolonged popular defeat.
                        <br />
                        <br />
                        But we&rsquo;re not ready to throw in the towel.
                        We&rsquo;ve chosen a long and difficult path. But we
                        learn from our mistakes. We will never stop making money
                        better.
                    </p>
                </TextBlock>
                <TextBlock>
                    <H3 text="Our Inspiration" id="our-inspiration" />
                    <QuoteCarousel />
                    <CenterImage height="500px">
                        <Image src={rocket} alt="eCash" fill />
                    </CenterImage>
                </TextBlock>

                <TextBlock>
                    <H3 text="Project Development" id="project-development" />
                    <p>
                        eCash is developed and maintained by{' '}
                        <Link
                            href="https://www.bitcoinabc.org/"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Bitcoin ABC
                        </Link>
                        , a team of professional industry-leading bitcoin
                        developers.
                    </p>
                    <CenterImage height="300px">
                        <Image src={bitcoinabc} alt="Bitcoin ABC" fill />
                    </CenterImage>
                </TextBlock>
            </Container>
        </Layout>
    );
}
