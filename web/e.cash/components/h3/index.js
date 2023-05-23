import GlitchText from '/components/glitch-text';
import { StyledH3 } from './styles';

export default function H3({ text }) {
    return (
        <StyledH3>
            <GlitchText text={text} />
        </StyledH3>
    );
}
