import Image from 'next/image';
import Link from 'next/link';
import Layout from '/components/layout';
import VideoBackground from '/components/videobackground';
import GlitchText from '/components/glitch-text';
import { socials } from '/data/socials';
import { Hero, ButtonCtn } from '/styles/pages/homepage';
import Button from '/components/button';

export default function Home() {
    return (
        <Layout>
            <VideoBackground videoname="purple-abstract" />
            <Hero>
                <div className="container">
                    <h1>
                        <span>WEALTH</span>
                        <GlitchText text="REDEFINED" />
                    </h1>
                    <p>
                        Simple. Instant. Secure.
                        <br />
                        Experience the revolutionary new money powered by
                        Avalanche.
                    </p>
                    <ButtonCtn>
                        <Button
                            text="Avalanche Consensus"
                            link="https://avalanche.cash/"
                            color="white"
                            glow
                        />
                    </ButtonCtn>
                    <div className="social-ctn">
                        {socials.map(social => (
                            <Link
                                className="social-icon-ctn"
                                href={social.link}
                                target="_blank"
                                rel="noreferrer"
                                key={social.name}
                            >
                                <Image
                                    src={`/images/${social.name}.svg`}
                                    alt={social.name}
                                    fill
                                />
                            </Link>
                        ))}
                    </div>
                </div>
            </Hero>
        </Layout>
    );
}
