import Image from 'next/image';
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import { Container, CenterImage, GradientSpacer } from '/components/atoms';
import robothand from '/public/animations/robot-hand.json';
import logodiagram from '/public/images/logo-diagram.svg';
import logodiagram2 from '/public/images/logo-diagram-2.svg';
import logodiagram3 from '/public/images/logo-diagram-3.svg';
import { TextBlock } from '/styles/pages/ecash-brand.js';

export default function EcashBrand() {
    return (
        <Layout
            metaTitle="eCash Brand"
            metaDescription="We’ve created this guide to help you use some of our core brand elements and our logo. Definitely check it out before you get started."
        >
            <SubPageHero
                image={robothand}
                imagereverse
                imagespeed={0.7}
                h2subtext="eCash Brand"
                h2text="Introduction"
            >
                <p>
                    We’ve created this guide to help you use some of our core
                    brand elements and our logo. Definitely check it out before
                    you get started.
                </p>
            </SubPageHero>
            <GradientSpacer />
            <Container narrow>
                <TextBlock>
                    <H3 text="eCash Logo" />
                    <p>
                        Our logo identifies, expresses, and distinguishes us.
                        It’s one of the first things people see and one of the
                        first things people remember when they think about us.
                        It’s what enables us to stand out from the rest.
                    </p>
                    <p>
                        When we introduced the new logo, we wanted to make sure
                        it accurately represents the essence of eCash, showing
                        the world our boldness and dynamism.
                    </p>
                    <p>
                        The letters “e” & “c” are among the most recognizable
                        symbols in the world. Combined with the block and
                        hexagon elements, we created a logo that is instantly
                        recognizable in a way that identifies the project like
                        never before.
                    </p>
                    <CenterImage height="500px">
                        <Image src={logodiagram} alt="eCash" fill />
                    </CenterImage>
                </TextBlock>

                <TextBlock>
                    <H3 text="eCash Logo Construction" />
                    <p>
                        The eCash logo should always be afforded a predetermined
                        area of breathing space, referred to as clear space.
                        This ensures that the identity maintains its hierarchy
                        and is not overwhelmed by other visual elements.
                    </p>
                    <CenterImage height="400px">
                        <Image src={logodiagram2} alt="eCash logo" fill />
                    </CenterImage>
                    <CenterImage height="400px">
                        <Image src={logodiagram3} alt="eCash logo" fill />
                    </CenterImage>
                </TextBlock>
            </Container>
        </Layout>
    );
}
