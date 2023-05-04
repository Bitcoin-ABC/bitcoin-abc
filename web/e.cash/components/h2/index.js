import GlitchText from '/components/glitch-text';
import Image from 'next/image';
import h2graphic from '/public/images/h2-graphic.svg';
import { StyledH3, StyledH2, H2Image } from './styles';

export default function H2({ subtext, text }) {
    return (
        <>
            <StyledH3>{subtext}</StyledH3>
            <StyledH2>
                <H2Image>
                    <Image src={h2graphic} alt="eCash" fill />
                </H2Image>
                <GlitchText text={text} />
            </StyledH2>
        </>
    );
}
