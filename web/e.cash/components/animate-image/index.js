import { useEffect, useRef, useContext } from 'react';
import Lottie from 'lottie-react';
import { ThemeContext } from 'styled-components';

// image | lottie json file to be rendered
// speed | optional number value to set the speed of the animation. Lower number is slower. Adjust to get the desired frame rate.
export default function AnimateImage({ image, speed }) {
    const themeContext = useContext(ThemeContext);
    const lottieRef = useRef();
    useEffect(() => {
        lottieRef.current.setSpeed(
            speed ? speed : themeContext.filters.animationspeed,
        );
    }, [speed, themeContext.filters.animationspeed]);
    return (
        <Lottie
            lottieRef={lottieRef}
            animationData={image}
            loop={true}
            style={{ height: '100%' }}
        />
    );
}
