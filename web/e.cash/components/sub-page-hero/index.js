// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import VideoBackground from '/components/videobackground';
import AnimateImage from '/components/animate-image';
import H2 from '/components/h2';
import { Container } from '/components/atoms';
import { HeroCtn, ImgCtn, TextCtn, OuterHeroCtn } from './styles';

export default function SubPageHero({
    image, // lottie json file to use in the AnimateImage component
    imagespeed, // optional number value to adjust animation speed
    imagereverse, // optional boolean value to allow animation to play forwards and back instead of a loop
    h2subtext, // h2 subheadline string
    h2text, // h2 text string
    children, // any children
    noLoop = false, // Only play the animation one time
}) {
    return (
        <OuterHeroCtn>
            <VideoBackground videoname="blue-abstract" />
            <Container>
                <HeroCtn>
                    <ImgCtn>
                        <AnimateImage
                            image={image}
                            speed={imagespeed}
                            reverse={imagereverse}
                            noLoop={noLoop}
                        />
                    </ImgCtn>
                    <TextCtn>
                        <H2 subtext={h2subtext} text={h2text} />
                        {children}
                    </TextCtn>
                </HeroCtn>
            </Container>
        </OuterHeroCtn>
    );
}
