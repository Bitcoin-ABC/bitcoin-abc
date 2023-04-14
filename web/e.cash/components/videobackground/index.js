import s from './videobackground.module.css';

export default function Video({ videoname }) {
    return (
        <div className={s.video_ctn}>
            <video autoPlay loop muted poster={`/videos/${videoname}.jpg`}>
                <source src={`/videos/${videoname}.mp4`} type="video/mp4" />
            </video>
            <div className={s.video_gradient} />
        </div>
    );
}
