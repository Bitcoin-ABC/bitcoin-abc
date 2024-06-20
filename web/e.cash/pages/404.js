// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import faqhand from '/public/animations/faq.json';
import Button from '/components/button';

export default function PageNotFound() {
    return (
        <Layout metaTitle="Page Not Found | eCash">
            <SubPageHero
                image={faqhand}
                imagespeed={0.5}
                h2subtext="404"
                h2text="Page Not Found"
            >
                <p>Sorry, we couldn&apos;t find that page</p>
                <Button text="Homepage" link="/" corner="bottomRight" />
            </SubPageHero>
        </Layout>
    );
}
