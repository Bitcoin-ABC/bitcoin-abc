// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getAnalyticsClientId,
    setAnalyticsUserProperty,
    trackEvent,
} from 'components/Common/GoogleAnalytics';

export interface ExperimentVariant {
    name: string;
    /** Relative weight; weights need not sum to 100 */
    weight: number;
}

/**
 * Client-side A/B experiments. Each install is bucketed by its random
 * analytics client id, so the variant is stable across launches.
 *
 * To ship a winner, give it all the weight (e.g. control: 0).
 * To force a variant while testing, set localStorage
 * `cashtab.exp.<experiment>` to the variant name.
 */
export const experiments: Record<string, ExperimentVariant[]> = {
    // e.g. home_layout: [
    //     { name: 'control', weight: 50 },
    //     { name: 'compact', weight: 50 },
    // ],
};

/** FNV-1a; good enough to spread client ids evenly over buckets. */
export const hashToUnit = (input: string): number => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) / 2 ** 32;
};

/**
 * Pick a variant for a given unit in [0, 1). Exported for tests.
 */
export const pickVariant = (
    variants: ExperimentVariant[],
    unit: number,
): string => {
    const total = variants.reduce((sum, v) => sum + Math.max(0, v.weight), 0);
    if (total <= 0) {
        return variants[0].name;
    }
    let cursor = unit * total;
    for (const variant of variants) {
        cursor -= Math.max(0, variant.weight);
        if (cursor < 0) {
            return variant.name;
        }
    }
    return variants[variants.length - 1].name;
};

const exposed = new Set<string>();

/**
 * Variant for this install. The first call per session records an
 * `experiment_exposure` event and sets the `exp_<name>` user property, so
 * every later event can be split by variant in GA4.
 */
export const getExperimentVariant = (name: string): string => {
    const variants = experiments[name];
    if (variants === undefined || variants.length === 0) {
        throw new Error(`Unknown experiment: ${name}`);
    }
    let variant: string | null = null;
    try {
        const forced = window.localStorage.getItem(`cashtab.exp.${name}`);
        if (forced !== null && variants.some(v => v.name === forced)) {
            variant = forced;
        }
    } catch {
        // No override
    }
    if (variant === null) {
        variant = pickVariant(
            variants,
            hashToUnit(`${getAnalyticsClientId()}:${name}`),
        );
    }
    if (!exposed.has(name)) {
        exposed.add(name);
        setAnalyticsUserProperty(`exp_${name}`, variant);
        trackEvent('experiment_exposure', {
            experiment: name,
            variant,
        });
    }
    return variant;
};
