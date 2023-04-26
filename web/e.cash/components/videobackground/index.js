import { VideoCtn } from './styles';

export default function Video({ videoname }) {
    return (
        <VideoCtn>
            <video autoPlay loop muted poster={`/videos/${videoname}.jpg`}>
                <source src={`/videos/${videoname}.mp4`} type="video/mp4" />
            </video>
            <div className="video_gradient" />
        </VideoCtn>
    );
}
