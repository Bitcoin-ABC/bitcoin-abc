// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { useEffect, useRef, useContext, useState } from 'react';
import dynamic from 'next/dynamic';
import { ThemeContext } from 'styled-components';

// Dynamically import Lottie to avoid SSR issues with lottie-web
const Lottie = dynamic(() => import('lottie-react'), {
    ssr: false,
    loading: () => <div style={{ height: '100%', width: '100%' }} />,
});

// image | lottie json file to be rendered
// speed | optional number value to set the speed of the animation. Lower number is slower. Adjust to get the desired frame rate.
// reverse | loop animation front to back, then back to front, etc
// noLoop | only play the animation one time
export default function AnimateImage({
    image,
    speed,
    reverse,
    noLoop = false,
}) {
    const [direction, setDirection] = useState(1);
    const themeContext = useContext(ThemeContext);
    const lottieRef = useRef();
    useEffect(() => {
        if (lottieRef.current) {
            lottieRef.current.setSpeed(
                speed ? speed : themeContext.filters.animationspeed,
            );
        }
    }, [speed, themeContext.filters.animationspeed]);

    const Reverse = () => {
        if (lottieRef.current) {
            lottieRef.current.setDirection(direction === 1 ? -1 : 1);
            lottieRef.current.play();
            setDirection(direction === 1 ? -1 : 1);
        }
    };
    return (
        <Lottie
            lottieRef={lottieRef}
            animationData={image}
            loop={!reverse && !noLoop}
            style={{ height: '100%' }}
            onComplete={reverse && !noLoop ? Reverse : null}
        />
    );
}
