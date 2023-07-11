// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
/**
 *
 * @param {object} - an options object that contains various animation parameters
 * The default values will be used if none are passed
 * @returns {object} animationSettings - an object with the specified framer motion animation settings
 * @throws {error} if incorrect value types are passed
 */
export const getAnimationSettings = ({
    duration = 1,
    delay = 0,
    animateUp = true,
    onScroll = true,
    displacement = 200,
} = {}) => {
    if (
        typeof duration !== 'number' ||
        typeof delay !== 'number' ||
        typeof animateUp !== 'boolean' ||
        typeof onScroll !== 'boolean' ||
        typeof displacement !== 'number'
    ) {
        throw new Error('Invalid animation value');
    }
    const animationSettings = {
        initial: {
            opacity: 0,
            y: animateUp ? displacement : -displacement,
        },
        animate: onScroll ? {} : { opacity: 1, y: 0 },
        whileInView: onScroll ? { opacity: 1, y: 0 } : null,
        transition: {
            delay,
            duration,
            type: 'spring',
        },
        viewport: { once: true },
    };

    return animationSettings;
};
