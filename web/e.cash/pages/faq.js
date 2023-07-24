// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import { Container, GradientSpacer } from '/components/atoms';
import faqhand from '/public/animations/faq.json';
import { faqs } from '/data/faqs.js';
import { ContentCtn, Blob, QuestionBlock } from '/styles/pages/faq.js';

export default function FAQ() {
    return (
        <Layout
            metaTitle="FAQ"
            metaDescription="Excited about eCash? So are we! Below, you will find answers to the most frequently asked eCash questions."
        >
            <SubPageHero
                image={faqhand}
                imagespeed={0.5}
                h2subtext="FAQ"
                h2text="Frequently Asked Questions"
            >
                <p>
                    Excited about eCash? So are we! Below, you will find answers
                    to the most frequently asked eCash questions.
                </p>
            </SubPageHero>
            <GradientSpacer />
            <ContentCtn>
                <Blob left="0" top="5%" />
                <Blob left="30%" top="30%" />
                <Blob left="60%" top="60%" />
                <Blob left="0" top="90%" />
                <Container narrow>
                    {faqs.map((faq, index) => (
                        <QuestionBlock key={`faq_${index}`}>
                            <H3 text={faq.question} id={index + 1} />
                            {faq.answer}
                        </QuestionBlock>
                    ))}
                </Container>
            </ContentCtn>
        </Layout>
    );
}
