import { GlitchCtn } from './styles';

export default function GlitchText({ text }) {
    return (
        <GlitchCtn>
            <div className="glitch" data-text={text}>
                {text}
            </div>
        </GlitchCtn>
    );
}
