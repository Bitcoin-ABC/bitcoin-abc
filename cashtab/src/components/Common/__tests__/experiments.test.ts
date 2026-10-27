// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    experiments,
    getExperimentVariant,
    hashToUnit,
    pickVariant,
} from 'components/Common/experiments';
import * as GA from 'components/Common/GoogleAnalytics';

describe('experiments', () => {
    beforeEach(() => {
        window.localStorage.clear();
        experiments.test_exp = [
            { name: 'control', weight: 50 },
            { name: 'variant_b', weight: 50 },
        ];
    });
    afterEach(() => {
        delete experiments.test_exp;
    });

    it('picks variants by weight', () => {
        const variants = [
            { name: 'control', weight: 50 },
            { name: 'convert', weight: 50 },
        ];
        expect(pickVariant(variants, 0)).toBe('control');
        expect(pickVariant(variants, 0.49)).toBe('control');
        expect(pickVariant(variants, 0.5)).toBe('convert');
        expect(pickVariant(variants, 0.999)).toBe('convert');
        // A shipped winner gets every install
        expect(
            pickVariant(
                [
                    { name: 'control', weight: 0 },
                    { name: 'convert', weight: 100 },
                ],
                0,
            ),
        ).toBe('convert');
        // Degenerate weights fall back to the first variant
        expect(
            pickVariant(
                [
                    { name: 'control', weight: 0 },
                    { name: 'convert', weight: 0 },
                ],
                0.7,
            ),
        ).toBe('control');
    });

    it('splits installs roughly evenly', () => {
        const variants = [
            { name: 'control', weight: 50 },
            { name: 'convert', weight: 50 },
        ];
        let convert = 0;
        for (let i = 0; i < 2000; i += 1) {
            if (
                pickVariant(variants, hashToUnit(`${i}.1700000000`)) ===
                'convert'
            ) {
                convert += 1;
            }
        }
        expect(convert).toBeGreaterThan(900);
        expect(convert).toBeLessThan(1100);
    });

    it('honors a localStorage override and records exposure once', () => {
        const trackSpy = jest.spyOn(GA, 'trackEvent');
        const propSpy = jest.spyOn(GA, 'setAnalyticsUserProperty');
        window.localStorage.setItem('cashtab.exp.test_exp', 'variant_b');
        expect(getExperimentVariant('test_exp')).toBe('variant_b');
        expect(getExperimentVariant('test_exp')).toBe('variant_b');
        expect(trackSpy).toHaveBeenCalledTimes(1);
        expect(trackSpy).toHaveBeenCalledWith('experiment_exposure', {
            experiment: 'test_exp',
            variant: 'variant_b',
        });
        expect(propSpy).toHaveBeenCalledWith('exp_test_exp', 'variant_b');
        trackSpy.mockRestore();
        propSpy.mockRestore();
    });

    it('ignores an override that is not a variant', () => {
        window.localStorage.setItem('cashtab.exp.test_exp', 'nope');
        expect(['control', 'variant_b']).toContain(
            getExperimentVariant('test_exp'),
        );
    });

    it('throws for an experiment that is not configured', () => {
        expect(() => getExperimentVariant('missing')).toThrow(
            'Unknown experiment: missing',
        );
    });
});
