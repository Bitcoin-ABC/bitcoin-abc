// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { bytesToStr } from '../io/str.js';
import { Bytes } from '../io/bytes.js';

interface Tag {
    type: number;
    isPrimitive: boolean;
    size: number;
}

/** Identifier of a signature algorithm */
export interface AlgIdent {
    /** OID of the algorithm */
    oid: string;
    /** OID of the params */
    params: string | undefined;
}

/** Entry of an issuer/subject */
export interface Entry {
    /** OID of the entry */
    oid: string;
    /** Value of the entry */
    value: string;
}

/** Time range of the validity of the certificate */
export interface Validity {
    /** Certificate is not valid before this UNIX timestamp */
    notBefore: number;
    /** Certificate is not valid after this UNIX timestamp */
    notAfter: number;
}

/** Public key of a certificate */
export interface PubKey {
    /** Signature algorithm of the public key */
    alg: AlgIdent;
    /** Bytes of the public key */
    data: Uint8Array;
}

/** To-be-signed data of the certificate */
export interface TBS {
    /** Version of the certificate data */
    version: number | undefined;
    /** Serial number of the certificate */
    serial: Uint8Array;
    /** Signature algorithm used by the certificate */
    sigAlg: AlgIdent;
    /** Fields of the issuer of the certificate */
    issuer: Entry[];
    /** Time range the certificate is valid */
    validity: Validity;
    /** Fields of the subject of the certificate */
    subject: Entry[];
    /** Public key of the certificate */
    pubkey: PubKey;
    /** Raw bytes of the data to be signed */
    raw: Uint8Array;
}

export interface Cert {
    /** Data to be signed by the signature */
    tbs: TBS;
    /** Algorithm used for the signature */
    sigAlg: AlgIdent;
    /** Signature signing `tbs` */
    sig: Uint8Array;
    /** Raw bytes of the certificate */
    raw: Uint8Array;
}

const TAG_VERSION = 0x00;
const TAG_INT = 0x02;
const TAG_BITSTR = 0x03;
const TAG_OCTSTR = 0x04;
const TAG_NULL = 0x05;
const TAG_OID = 0x06;
const TAG_UTF8STR = 0x0c;
const TAG_SEQ = 0x10;
const TAG_SET = 0x11;
const TAG_NUMSTR = 0x12;
const TAG_PRINSTR = 0x13;
const TAG_T61STR = 0x14;
const TAG_VIDEOSTR = 0x15;
const TAG_IA5STR = 0x16;
const TAG_UTCTIME = 0x17;
const TAG_GENTIME = 0x18;
const TAG_GRAPHSTR = 0x19;
const TAG_ISO646STR = 0x1a;
const TAG_GENSTR = 0x1b;
const TAG_UNISTR = 0x1c;
const TAG_CHARSTR = 0x1d;
const TAG_BMPSTR = 0x1e;

const REGEX_PEM_CERT =
    /-----BEGIN CERTIFICATE-----(.*?)-----END CERTIFICATE-----/s;
const REGEX_DIGITS = /\d+/;

function readSize(bytes: Bytes, isPrimitive: boolean): number {
    let size = bytes.readU8();

    // Indefinite form
    if (!isPrimitive && size === 0x80) {
        throw new Error('Indefinite size.');
    }

    // Definite form
    if ((size & 0x80) === 0) {
        // Short form
        return size;
    }

    // Long form
    const numBytes = size & 0x7f;

    if (numBytes > 3) {
        throw new Error('Length octet is too long.');
    }

    size = 0;
    for (let i = 0; i < numBytes; i++) {
        size <<= 8;
        size |= bytes.readU8();
    }

    return size;
}

function readTag(bytes: Bytes): Tag {
    let type = bytes.readU8();
    const isPrimitive = (type & 0x20) === 0;

    if ((type & 0x1f) === 0x1f) {
        let oct = type;
        type = 0;
        while ((oct & 0x80) === 0x80) {
            oct = bytes.readU8();
            type <<= 7;
            type |= oct & 0x7f;
        }
    } else {
        type &= 0x1f;
    }

    return {
        type,
        isPrimitive,
        size: readSize(bytes, isPrimitive),
    };
}

function readSeq(bytes: Bytes): Uint8Array {
    const tag = readTag(bytes);
    if (tag.type !== TAG_SEQ) {
        throw new Error(
            `Expected sequence type ${TAG_SEQ}, but got ${tag.type}`,
        );
    }
    return bytes.readBytes(tag.size);
}

function alignBitstr(data: Uint8Array): Uint8Array {
    const padding = data[0];
    const bits = (data.length - 1) * 8 - padding;
    const buf = data.slice(1);
    const shift = 8 - (bits % 8);

    if (shift === 8 || buf.length === 0) {
        return buf;
    }

    const out = Buffer.allocUnsafe(buf.length);
    out[0] = buf[0] >>> shift;

    for (let i = 1; i < buf.length; i++) {
        out[i] = buf[i - 1] << (8 - shift);
        out[i] |= buf[i] >>> shift;
    }

    return out;
}

function readBitstr(bytes: Bytes): Uint8Array {
    const tag = readTag(bytes);
    if (tag.type !== TAG_BITSTR) {
        throw new Error(
            `Expected sequence type ${TAG_BITSTR}, but got ${tag.type}`,
        );
    }
    return alignBitstr(bytes.readBytes(tag.size));
}

function readString(bytes: Bytes): Uint8Array {
    const tag = readTag(bytes);
    switch (tag.type) {
        case TAG_BITSTR: {
            return alignBitstr(bytes.readBytes(tag.size));
        }
        case TAG_OCTSTR:
        case TAG_NUMSTR:
        case TAG_PRINSTR:
        case TAG_T61STR:
        case TAG_VIDEOSTR:
        case TAG_IA5STR:
        case TAG_GRAPHSTR:
        case TAG_UTF8STR:
        case TAG_ISO646STR:
        case TAG_GENSTR:
        case TAG_UNISTR:
        case TAG_CHARSTR:
        case TAG_BMPSTR: {
            return bytes.readBytes(tag.size);
        }
        default: {
            throw new Error(`Expected string tag, got ${tag.type}`);
        }
    }
}

function readInt(bytes: Bytes): Uint8Array {
    const tag = readTag(bytes);
    if (tag.type !== TAG_INT) {
        throw new Error(
            `Expected integer type ${TAG_INT}, but got ${tag.type}`,
        );
    }
    return bytes.readBytes(tag.size);
}

function bytesToBE(bytes: Uint8Array): number {
    let num = 0;
    for (const b of bytes) {
        num <<= 8;
        num |= b;
    }
    return num;
}

function readVersion(bytes: Bytes): number | undefined {
    const startIdx = bytes.idx;
    const tag = readTag(bytes);
    if (tag.type != TAG_VERSION) {
        bytes.idx = startIdx;
        return undefined;
    }
    return bytesToBE(readInt(bytes));
}

function readAlgIdent(bytes: Bytes): AlgIdent {
    let params: string | undefined = undefined;
    bytes = new Bytes(readSeq(bytes));
    const oid = readOID(bytes);
    if (oid === undefined) {
        throw new Error('Algorithm cannot be NULL');
    }

    if (bytes.idx < bytes.data.length) {
        params = readOID(bytes);
    }

    return { oid, params };
}

function readOID(bytes: Bytes): string | undefined {
    const tag = readTag(bytes);
    if (tag.type === TAG_NULL) {
        return undefined;
    }

    if (tag.type !== TAG_OID) {
        throw new Error(`Expected OID tag ${TAG_OID}, but got ${tag.type}`);
    }
    const data = bytes.readBytes(tag.size);
    const ids = [];
    let ident = 0;
    let subident = 0;
    for (const byte of data) {
        subident = byte;
        ident <<= 7;
        ident |= subident & 0x7f;
        if ((subident & 0x80) === 0) {
            ids.push(ident);
            ident = 0;
        }
    }

    if (subident & 0x80) {
        ids.push(ident);
    }

    const first = (ids[0] / 40) | 0;
    const second = ids[0] % 40;
    const result = [first, second].concat(ids.slice(1));

    return result.join('.');
}

function readEntries(bytes: Bytes): Entry[] {
    const values = [];
    bytes = new Bytes(readSeq(bytes));

    while (bytes.idx < bytes.data.length) {
        const tagSet = readTag(bytes);
        if (tagSet.type !== TAG_SET) {
            throw new Error(
                `Expected set tag ${TAG_SET}, but got ${tagSet.type}`,
            );
        }
        const tagSeq = readTag(bytes);
        if (tagSeq.type !== TAG_SEQ) {
            throw new Error(
                `Expected seq tag ${TAG_SEQ}, but got ${tagSeq.type}`,
            );
        }
        const oid = readOID(bytes);
        if (oid === undefined) {
            throw new Error('OID for issuer or subject cannot be NULL');
        }
        values.push({
            oid: oid,
            value: bytesToStr(readString(bytes)),
        });
    }

    return values;
}

function readTime(bytes: Bytes): number {
    const tag = readTag(bytes);
    const decoder = new TextDecoder('ascii', { fatal: true });
    const str = decoder.decode(bytes.readBytes(tag.size));
    let year: number;
    let mon: number;
    let day: number;
    let hour: number;
    let min: number;
    let sec: number;

    let pos = 0;
    const readDigits = (numDigits: number) => {
        const digits = str.slice(pos, pos + numDigits);
        if (!REGEX_DIGITS.test(digits)) {
            throw new Error(`Expected ${numDigits} decimal digits`);
        }
        pos += numDigits;
        return Number(digits) | 0;
    };

    switch (tag.type) {
        case TAG_UTCTIME: {
            year = readDigits(2);
            mon = readDigits(2);
            day = readDigits(2);
            hour = readDigits(2);
            min = readDigits(2);
            sec = readDigits(2);
            if (year < 70) {
                year = 2000 + year;
            } else {
                year = 1900 + year;
            }
            break;
        }
        case TAG_GENTIME: {
            year = readDigits(4);
            mon = readDigits(2);
            day = readDigits(2);
            hour = readDigits(2);
            min = readDigits(2);
            sec = readDigits(2);
            break;
        }
        default: {
            throw new Error(`Unexpected tag: ${tag.type}.`);
        }
    }

    return Date.UTC(year, mon - 1, day, hour, min, sec, 0) / 1000;
}

function readValidity(bytes: Bytes): Validity {
    bytes = new Bytes(readSeq(bytes));
    return {
        notBefore: readTime(bytes),
        notAfter: readTime(bytes),
    };
}

function readPubkey(bytes: Bytes): PubKey {
    bytes = new Bytes(readSeq(bytes));
    return {
        alg: readAlgIdent(bytes),
        data: readBitstr(bytes),
    };
}

function readToBeSigned(bytes: Bytes): TBS {
    const startIdx = bytes.idx;
    const tbsBytes = new Bytes(readSeq(bytes));
    const endIdx = bytes.idx;
    return {
        version: readVersion(tbsBytes),
        serial: readInt(tbsBytes),
        sigAlg: readAlgIdent(tbsBytes),
        issuer: readEntries(tbsBytes),
        validity: readValidity(tbsBytes),
        subject: readEntries(tbsBytes),
        pubkey: readPubkey(tbsBytes),
        raw: bytes.data.slice(startIdx, endIdx),
    };
}

/** Parse a ASN1 certificate from the given bytes */
export function parseCertRaw(rawCert: Uint8Array): Cert {
    const bytes = new Bytes(rawCert);
    const certBytes = new Bytes(readSeq(bytes));
    return {
        tbs: readToBeSigned(certBytes),
        sigAlg: readAlgIdent(certBytes),
        sig: readBitstr(certBytes),
        raw: rawCert,
    };
}

export function parseCertPem(pem: string): Cert {
    const match = REGEX_PEM_CERT.exec(pem);
    if (match === null) {
        throw new Error(
            'No PEM encoded certificate found. It should start with ' +
                '"-----BEGIN CERTIFICATE-----"',
        );
    }
    const certRaw = Uint8Array.from(atob(match[1]), c => c.charCodeAt(0));
    return parseCertRaw(certRaw);
}
