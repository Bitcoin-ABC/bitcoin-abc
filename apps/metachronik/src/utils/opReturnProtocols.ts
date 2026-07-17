// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { Script, fromHex, parseEmppScript } from 'ecash-lib';

/** CashFusion LOKAD ID: "FUZ\0" */
export const FUSION_LOKAD_ID = '46555a00';

const LEGACY_LOKAD_PREFIX = '6a04';
const LEGACY_FUSION_PREFIX = '6a0446555a00';

export const scriptToHex = (outputScript: string | Uint8Array): string => {
    if (typeof outputScript === 'string') {
        return outputScript;
    }
    return Buffer.from(outputScript).toString('hex');
};

const getEmppPushLokadIds = (scriptHex: string): string[] => {
    if (!scriptHex.startsWith('6a50')) {
        return [];
    }
    try {
        const pushes = parseEmppScript(new Script(fromHex(scriptHex)));
        if (!pushes) {
            return [];
        }
        return pushes
            .filter((push: Uint8Array) => push.length >= 4)
            .map((push: Uint8Array) =>
                Buffer.from(push.slice(0, 4)).toString('hex'),
            );
    } catch {
        return [];
    }
};

export const outputHasLegacyLokad = (scriptHex: string): boolean => {
    return scriptHex.startsWith(LEGACY_LOKAD_PREFIX) && scriptHex.length >= 12;
};

export const outputHasLokadProtocol = (scriptHex: string): boolean => {
    if (outputHasLegacyLokad(scriptHex)) {
        return true;
    }
    return getEmppPushLokadIds(scriptHex).length > 0;
};

export const outputHasFusionProtocol = (scriptHex: string): boolean => {
    if (scriptHex.startsWith(LEGACY_FUSION_PREFIX)) {
        return true;
    }
    return getEmppPushLokadIds(scriptHex).includes(FUSION_LOKAD_ID);
};

export const txUsesLokadProtocol = (tx: {
    outputs?: Array<{ outputScript?: string | Uint8Array }>;
}): boolean => {
    if (!tx.outputs) {
        return false;
    }
    for (const output of tx.outputs) {
        if (!output.outputScript) {
            continue;
        }
        if (outputHasLokadProtocol(scriptToHex(output.outputScript))) {
            return true;
        }
    }
    return false;
};

export const txUsesFusionProtocol = (tx: {
    outputs?: Array<{ outputScript?: string | Uint8Array }>;
}): boolean => {
    if (!tx.outputs) {
        return false;
    }
    for (const output of tx.outputs) {
        if (!output.outputScript) {
            continue;
        }
        if (outputHasFusionProtocol(scriptToHex(output.outputScript))) {
            return true;
        }
    }
    return false;
};
