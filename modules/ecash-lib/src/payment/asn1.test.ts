// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import * as tls from 'node:tls';

import { asn1, x509 } from '.';
import { Ecc } from '../ecc.js';
import { toHex } from '../io/hex.js';
import { sha256 } from '../hash.js';
import '../initNodeJs.js';

/*
key.pem:
openssl ecparam -genkey -out key.pem -name secp256k1

-----BEGIN EC PARAMETERS-----
BgUrgQQACg==
-----END EC PARAMETERS-----
-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIFzOgjk70LwSfTAWNAzwm2tZedMM30pwyMsaK8KkJAEHoAcGBSuBBAAK
oUQDQgAE23jFaVYo7rulgXbZ5WaADFaKCzn8Lk6ZubOqabsXrqfM3JaKRrrPwyrk
aXzvoFu5D28kF7OXDsomtTWH9h5Slg==
-----END EC PRIVATE KEY-----

cert.pem:
openssl req -x509 -new \
            -key key.pem \
            -out cert.pem \
            -sha256 \
            -days 36500 \
            -nodes \
            -subj "/C=CA/ST=British Columbia/L=Vancouver/O=eCash Palace/OU=Software/CN=example.e.cash/emailAddress=example@e.cash"
*/
const CERT_PEM = `
-----BEGIN CERTIFICATE-----
MIICkTCCAjigAwIBAgIUTWHooPqrdMM/kO1CNMYN7m3P6CswCgYIKoZIzj0EAwIw
gZ4xCzAJBgNVBAYTAkNBMRkwFwYDVQQIDBBCcml0aXNoIENvbHVtYmlhMRIwEAYD
VQQHDAlWYW5jb3V2ZXIxFTATBgNVBAoMDGVDYXNoIFBhbGFjZTERMA8GA1UECwwI
U29mdHdhcmUxFzAVBgNVBAMMDmV4YW1wbGUuZS5jYXNoMR0wGwYJKoZIhvcNAQkB
Fg5leGFtcGxlQGUuY2FzaDAgFw0yNTAzMDIyMDMyNDNaGA8yMTI1MDIwNjIwMzI0
M1owgZ4xCzAJBgNVBAYTAkNBMRkwFwYDVQQIDBBCcml0aXNoIENvbHVtYmlhMRIw
EAYDVQQHDAlWYW5jb3V2ZXIxFTATBgNVBAoMDGVDYXNoIFBhbGFjZTERMA8GA1UE
CwwIU29mdHdhcmUxFzAVBgNVBAMMDmV4YW1wbGUuZS5jYXNoMR0wGwYJKoZIhvcN
AQkBFg5leGFtcGxlQGUuY2FzaDBWMBAGByqGSM49AgEGBSuBBAAKA0IABNt4xWlW
KO67pYF22eVmgAxWigs5/C5Ombmzqmm7F66nzNyWika6z8Mq5Gl876BbuQ9vJBez
lw7KJrU1h/YeUpajUzBRMB0GA1UdDgQWBBQKzjEN/xneEG0oc/OgW/w7/imk4TAf
BgNVHSMEGDAWgBQKzjEN/xneEG0oc/OgW/w7/imk4TAPBgNVHRMBAf8EBTADAQH/
MAoGCCqGSM49BAMCA0cAMEQCIDOPA89LS1r0/3nm8i4hT/VhHHEYPh3Mf42COhRP
bpoDAiA2Mf29zeOXOxZ7B021KAJUpsSFtMEvBnllMQjQqsoaog==
-----END CERTIFICATE-----
`;

describe('ASN1', () => {
    const ecc = new Ecc();
    it('asn1.parseCertPem self-signed secp256k1', () => {
        const cert = asn1.parseCertPem(CERT_PEM);

        expect(cert.sigAlg).to.deep.equal({
            oid: x509.OID_ECDSA_WITH_SHA256,
            params: undefined,
        });
        const subject = [
            {
                oid: x509.OID_COUNTRY_NAME,
                value: 'CA',
            },
            {
                oid: x509.OID_STATE_OR_PROVINCE_NAME,
                value: 'British Columbia',
            },
            {
                oid: x509.OID_LOCALITY_NAME,
                value: 'Vancouver',
            },
            {
                oid: x509.OID_ORGANIZATION_NAME,
                value: 'eCash Palace',
            },
            {
                oid: x509.OID_ORGANIZATIONAL_UNIT_NAME,
                value: 'Software',
            },
            {
                oid: x509.OID_COMMON_NAME,
                value: 'example.e.cash',
            },
            {
                oid: x509.OID_EMAIL_ADDRESS,
                value: 'example@e.cash',
            },
        ];

        expect(cert.tbs.version).to.equal(2);
        expect(cert.tbs.sigAlg).to.deep.equal({
            oid: x509.OID_ECDSA_WITH_SHA256,
            params: undefined,
        });
        expect(toHex(cert.tbs.serial)).to.equal(
            '4d61e8a0faab74c33f90ed4234c60dee6dcfe82b',
        );
        expect(cert.tbs.issuer).to.deep.equal(subject);
        expect(cert.tbs.validity).to.deep.equal({
            notBefore: 1740947563,
            notAfter: 4894547563,
        });
        expect(cert.tbs.subject).to.deep.equal(subject);
        expect(cert.tbs.pubkey.alg).to.deep.equal({
            oid: x509.OID_EC_PUBLIC_KEY,
            params: x509.OID_ANSIP256K1,
        });
        expect(toHex(cert.tbs.pubkey.data)).to.equal(
            '04db78c5695628eebba58176d9e566800c568a0b39fc2e4e99b9b3aa69bb17aea7ccdc968a46bacfc32ae4697cefa05bb90f6f2417b3970eca26b53587f61e5296',
        );

        // Self-signed certificate is valid
        ecc.ecdsaVerify(
            cert.sig,
            sha256(cert.tbs.raw),
            ecc.compressPk(cert.tbs.pubkey.data),
        );
    });

    it('asn1.parseCertPem built-in root certs', () => {
        // Try parsing all built in root certificates
        for (const certPem of tls.rootCertificates) {
            // Throws an error if one cert failed
            const cert = asn1.parseCertPem(certPem);
            // Cert has at least one entry in subject
            expect(cert.tbs.subject.length).to.be.greaterThan(0);
        }
    });
});
