// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { useEffect, useState } from 'react';
import { VideoCtn } from './styles';

export default function Video({ videoname }) {
    const [windowWidth, setWindowWidth] = useState(undefined);

    useEffect(() => {
        function handleResize() {
            setWindowWidth(window.innerWidth);
        }

        handleResize();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <VideoCtn>
            {windowWidth > 920 ? (
                <video autoPlay loop muted poster={`/videos/${videoname}.jpg`}>
                    <source src={`/videos/${videoname}.mp4`} type="video/mp4" />
                </video>
            ) : (
                <div
                    className="static_frame_mobile"
                    style={{
                        backgroundImage: `url('/videos/${videoname}.jpg')`,
                    }}
                />
            )}
            <div className="video_gradient" />
        </VideoCtn>
    );
}
