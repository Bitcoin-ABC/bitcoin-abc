// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { getAnimationSettings } from '../index.js';

describe('getAnimationSettings', () => {
    it('should return an animationSettings object with the default values if it is called with no parameters', () => {
        const animationSettings = {
            initial: { opacity: 0, y: 200 },
            animate: {},
            whileInView: { opacity: 1, y: 0 },
            transition: {
                delay: 0,
                duration: 1,
                type: 'spring',
            },
            viewport: { once: true },
        };
        const result = getAnimationSettings();
        expect(result).toEqual(animationSettings);
    });

    it('should return an animationSettings object with any specified object property values that are passed', () => {
        const animationSettings = {
            initial: { opacity: 0, y: -100 },
            animate: { opacity: 1, y: 0 },
            whileInView: null,
            transition: {
                delay: 2,
                duration: 2,
                type: 'spring',
            },
            viewport: { once: true },
        };
        const result = getAnimationSettings({
            duration: 2,
            delay: 2,
            animateUp: false,
            onScroll: false,
            displacement: 100,
        });
        expect(result).toEqual(animationSettings);
    });

    it('should throw an error if an invalid property type is passed', () => {
        expect(() => {
            getAnimationSettings({
                duration: 'notanumber',
            });
        }).toThrow('Invalid animation value');

        expect(() => {
            getAnimationSettings({
                duration: 1,
                animateUp: 'notaboolean',
            });
        }).toThrow('Invalid animation value');
    });
});
