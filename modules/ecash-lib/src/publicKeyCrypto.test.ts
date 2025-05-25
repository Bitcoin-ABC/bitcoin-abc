// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { readFileSync } from 'node:fs';

import { asn1 } from './payment';
import { fromHex, toHex } from './io/hex.js';
import { PkcAlgo } from './publicKeyCrypto.js';
import {
    OID_ECDSA_WITH_SHA256,
    OID_ECDSA_WITH_SHA384,
    OID_PRIME256V1,
    OID_RSA_SHA256,
    OID_RSA_SHA384,
    OID_RSA_SHA512,
    OID_SECP384R1,
} from './payment/x509.js';
import { strToBytes } from './io/str.js';
import './initNodeJs.js';

const TESTKEYS_PATH = './testkeys/';

function readTestString(filepath: string): string {
    return readFileSync(TESTKEYS_PATH + filepath, { encoding: 'ascii' });
}

function readTestBytes(filepath: string): Uint8Array {
    return readFileSync(TESTKEYS_PATH + filepath);
}

const MSG = readTestString('msg.txt');

describe('PkcAlgo', () => {
    it('PkcAlgo.fromOid', () => {
        expect(() => PkcAlgo.fromOid('1.2.840.10040.4.1')).to.throw(
            'Insecure algorithm: dsa',
        );
        expect(() => PkcAlgo.fromOid('1.2.840.10040.4.2')).to.throw(
            'Insecure algorithm: dsaMatch',
        );
        expect(() => PkcAlgo.fromOid('1.2.840.10040.4.3')).to.throw(
            'Insecure algorithm: dsaWithSha1',
        );
        expect(() => PkcAlgo.fromOid('1.2.840.10040.4.3')).to.throw(
            'Insecure algorithm: dsaWithSha1',
        );
        expect(() => PkcAlgo.fromOid('1.2.840.113549.1.1.1')).to.throw(
            'Algorithm not supported: rsaEncryption',
        );
        expect(() => PkcAlgo.fromOid('1.2.840.113549.1.1.2')).to.throw(
            'Insecure algorithm: md2WithRSAEncryption',
        );
        expect(() => PkcAlgo.fromOid('1.2.840.113549.1.1.3')).to.throw(
            'Insecure algorithm: md4WithRSAEncryption',
        );
        expect(() => PkcAlgo.fromOid('1.2.840.113549.1.1.4')).to.throw(
            'Insecure algorithm: md5WithRSAEncryption',
        );
        PkcAlgo.fromOid('1.2.840.113549.1.1.5');
        PkcAlgo.fromOid('1.2.840.113549.1.1.11');
        PkcAlgo.fromOid('1.2.840.113549.1.1.12');
        PkcAlgo.fromOid('1.2.840.113549.1.1.13');
        expect(() => PkcAlgo.fromOid('1.2.840.113549.1.1.14')).to.throw(
            'sha224WithRSAEncryption',
        );
        expect(() => PkcAlgo.fromOid('2.16.840.1.101.3.4.2.8')).to.throw(
            'Algorithm not supported: sha3-256',
        );
        expect(() => PkcAlgo.fromOid('2.16.840.1.101.3.4.2.9')).to.throw(
            'Algorithm not supported: sha3-384',
        );
        expect(() => PkcAlgo.fromOid('2.16.840.1.101.3.4.2.10')).to.throw(
            'Algorithm not supported: sha3-512',
        );
        expect(() => PkcAlgo.fromOid('1.2.840.10045.2.1')).to.throw(
            'Algorithm not supported: ecPublicKey',
        );
        expect(() => PkcAlgo.fromOid('1.2.840.10045.4.1')).to.throw(
            'Insecure algorithm: ecdsaWithSHA1',
        );
        expect(() => PkcAlgo.fromOid('1.2.840.10045.4.3.1')).to.throw(
            'Algorithm not supported: ecdsaWithSHA224',
        );

        for (const oid of [OID_ECDSA_WITH_SHA256, OID_ECDSA_WITH_SHA384]) {
            expect(() => PkcAlgo.fromOid(oid)).to.throw(
                'Missing params for EC',
            );
            expect(() => PkcAlgo.fromOid(oid, '1.3.132.0.33')).to.throw(
                'Algorithm not supported: ansip224r1',
            );
            PkcAlgo.fromOid(oid, OID_PRIME256V1);
            PkcAlgo.fromOid(oid, OID_SECP384R1);
            expect(() => PkcAlgo.fromOid(oid, '1.3.132.0.35')).to.throw(
                'Algorithm not supported: ansip521r1',
            );
        }

        expect(() => PkcAlgo.fromOid('1.2.840.10045.4.3.4')).to.throw(
            'Algorithm not supported: ecdsaWithSHA512',
        );
    });

    for (const [curveName, curveOid] of [
        ['prime256v1', OID_PRIME256V1],
        ['secp384r1', OID_SECP384R1],
    ]) {
        const pkHex = readTestString(`${curveName}-pk.hex`);
        const pk = fromHex(pkHex);
        for (const [algoName, algoOid] of [
            ['sha256', OID_ECDSA_WITH_SHA256],
            ['sha384', OID_ECDSA_WITH_SHA384],
        ]) {
            const sigHex = readTestString(`${curveName}-sig-${algoName}.hex`);
            const certPem = readTestString(`${curveName}-cert-${algoName}.pem`);
            const sig = fromHex(sigHex);
            const algo = PkcAlgo.fromOid(algoOid, curveOid);
            it(`PkcAlgo.verify ${curveName} ${algoName} signature`, () => {
                expect(() =>
                    algo.verify(sig, strToBytes(MSG), fromHex(pkHex + '00')),
                ).to.throw('Invalid signature or public key');
                expect(() =>
                    algo.verify(fromHex(sigHex + '00'), strToBytes(MSG), pk),
                ).to.throw('Invalid signature or public key');
                algo.verify(sig, strToBytes(MSG), pk);
            });
            it(`PkcAlgo.verify ${curveName} ${algoName} certificate`, () => {
                const cert = asn1.parseCertPem(certPem);
                const algo = PkcAlgo.fromOid(
                    cert.sigAlg.oid,
                    cert.tbs.pubkey.alg.params,
                );
                algo.verify(cert.sig, cert.tbs.raw, cert.tbs.pubkey.data);
            });
        }
    }

    for (const keySize of [2048, 3072, 4096, 8192]) {
        const pk = readTestBytes(`rsa${keySize}-pk.der`);
        const pkHex = toHex(pk);
        for (const [algoName, algoOid] of [
            ['sha256', OID_RSA_SHA256],
            ['sha384', OID_RSA_SHA384],
            ['sha512', OID_RSA_SHA512],
        ]) {
            const sigHex = readTestString(`rsa${keySize}-sig-${algoName}.hex`);
            const certPem = readTestString(
                `rsa${keySize}-cert-${algoName}.pem`,
            );
            const sig = fromHex(sigHex);
            const algo = PkcAlgo.fromOid(algoOid);
            it(`PkcAlgo.verify RSA-${keySize} ${algoName} signature`, () => {
                expect(() =>
                    algo.verify(sig, strToBytes(MSG), fromHex(pkHex + '00')),
                ).to.throw('Invalid signature or public key');
                expect(() =>
                    algo.verify(fromHex(sigHex + '00'), strToBytes(MSG), pk),
                ).to.throw('Invalid signature or public key');
                algo.verify(sig, strToBytes(MSG), pk);
            });
            it(`PkcAlgo.verify RSA-${keySize} ${algoName} certificate`, () => {
                const cert = asn1.parseCertPem(certPem);
                const algo = PkcAlgo.fromOid(
                    cert.sigAlg.oid,
                    cert.tbs.pubkey.alg.params,
                );
                algo.verify(cert.sig, cert.tbs.raw, cert.tbs.pubkey.data);
            });
        }
    }
});
