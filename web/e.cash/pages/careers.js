// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import Link from 'next/link';
import Image from 'next/image';
import mappin from '/public/images/map-pin.png';
import H2 from '/components/h2';
import H3 from '/components/h3';
import { Container } from '/components/atoms';
import { CareersCtn, CardCtn, Card, Location } from '/styles/pages/careers.js';
import { careers } from '/data/careers.js';

function Careers() {
    const applyText = (
        <p>
            If you think you could be a fit, please send your resume (or
            LinkedIn URL) along with something you’ve built to{' '}
            <Link href="mailto:careers@e.cash">careers@e.cash</Link>
        </p>
    );
    return (
        <Layout>
            <CareersCtn>
                <Container narrow>
                    <H2 subtext="Jobs" text="Career Opportunities" />
                    <p>
                        Are you ready to apply your tech skills to applied
                        monetary theory? We&apos;d love to hear from you.
                    </p>
                    <CardCtn>
                        {careers.map((job, index) => (
                            <Card key={index}>
                                <H3 text={job.title} />
                                <Location>
                                    <Image
                                        src={mappin}
                                        alt="location"
                                        height={25}
                                    />
                                    <div>{job.location}</div>
                                </Location>
                                <p>{job.description}</p>
                                {applyText}
                            </Card>
                        ))}
                    </CardCtn>
                </Container>
            </CareersCtn>
        </Layout>
    );
}

export default Careers;
