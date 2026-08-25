// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * CashFusion-shaped protobuf encode/decode for the alp-fusion control channel.
 *
 * Payload bytes are what {@link FusionConnection.sendMessage} /
 * {@link FusionConnection.recvMessage} carry inside the framed TCP/TLS stream.
 *
 * **Integers:** use `bigint` for 64-bit wire fields (`uint64` / `fixed64` —
 * atom tiers, sats, token atoms, fees, timestamps). Decoded 64-bit fields
 * are always returned as `bigint` (never `Long`).
 *
 * Round orchestration, Chronik, and signing are out of scope here.
 * Covert-channel wrappers (`CovertMessage` / `CovertResponse`) are encoded
 * here; slot scheduling and SOCKS5 live in `covert.ts`.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { bigintToU64Be } from 'ecash-lib';
import protobuf from 'protobufjs';

let cachedRoot: protobuf.Root | null = null;

/**
 * Load `proto/alp-fusion.proto` once per process.
 */
export async function initProto(): Promise<protobuf.Root> {
    if (!cachedRoot) {
        if (!protobuf.util.Long) {
            throw new Error(
                'protobufjs Long support is required for uint64/fixed64 fields',
            );
        }
        const dir = path.dirname(fileURLToPath(import.meta.url));
        const protoPath = path.join(dir, '../../proto/alp-fusion.proto');
        cachedRoot = await protobuf.load(protoPath);
    }
    return cachedRoot;
}

/**
 * Return the cached root; throws if {@link initProto} has not run.
 */
export function requireProto(): protobuf.Root {
    if (!cachedRoot) {
        throw new Error('Call initProto() first');
    }
    return cachedRoot;
}

/**
 * Common wire types used by control- and covert-channel messages.
 */
export async function getTypes() {
    const root = await initProto();
    return {
        ClientMessage: root.lookupType('alpfusion.ClientMessage'),
        ServerMessage: root.lookupType('alpfusion.ServerMessage'),
        CovertMessage: root.lookupType('alpfusion.CovertMessage'),
        CovertResponse: root.lookupType('alpfusion.CovertResponse'),
        Component: root.lookupType('alpfusion.Component'),
        InitialCommitment: root.lookupType('alpfusion.InitialCommitment'),
        Proof: root.lookupType('alpfusion.Proof'),
    };
}

const UINT64_WIRE_TYPES = new Set(['uint64', 'fixed64']);

/**
 * Same bounds as {@link bigintToU64Be} — reuse that check rather than a second
 * uint64 range implementation.
 */
function assertUint64(n: bigint, path: string): void {
    try {
        bigintToU64Be(n);
    } catch {
        throw new Error(
            `Out-of-range bigint at ${path}: uint64/fixed64 fields accept 0 .. 2^64-1`,
        );
    }
}

/**
 * Schema-guided checks: only `uint64` / `fixed64` fields must be `bigint` in
 * `[0, 2^64)`. Does not walk arbitrary JS values — follows the protobuf Type.
 */
function assertUint64Fields(
    Type: protobuf.Type,
    value: unknown,
    path = Type.name,
): void {
    if (
        value === null ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        Buffer.isBuffer(value) ||
        value instanceof Uint8Array
    ) {
        throw new Error(`${path}: expected plain object payload`);
    }
    const obj = value as Record<string, unknown>;
    for (const field of Type.fieldsArray) {
        if (!Object.prototype.hasOwnProperty.call(obj, field.name)) {
            continue;
        }
        const child = obj[field.name];
        const childPath = `${path}.${field.name}`;
        if (field.repeated && !Array.isArray(child)) {
            throw new Error(`${childPath}: expected array for repeated field`);
        }
        if (field.repeated) {
            // Narrowed by the throw above; TS does not carry that across ifs.
            const items = child as unknown[];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const itemPath = `${childPath}[${i}]`;
                if (UINT64_WIRE_TYPES.has(field.type)) {
                    if (typeof item !== 'bigint') {
                        throw new Error(
                            `${itemPath}: expected bigint for ${field.type}`,
                        );
                    }
                    assertUint64(item, itemPath);
                } else if (
                    field.resolvedType instanceof protobuf.Type &&
                    item !== null &&
                    typeof item === 'object'
                ) {
                    assertUint64Fields(field.resolvedType, item, itemPath);
                }
            }
            continue;
        }
        if (UINT64_WIRE_TYPES.has(field.type)) {
            if (typeof child !== 'bigint') {
                throw new Error(
                    `${childPath}: expected bigint for ${field.type}`,
                );
            }
            assertUint64(child, childPath);
            continue;
        }
        if (
            field.resolvedType instanceof protobuf.Type &&
            child !== null &&
            typeof child === 'object'
        ) {
            assertUint64Fields(field.resolvedType, child, childPath);
        }
    }
}

/**
 * Enforce proto2 `required` / oneof presence. protobufjs `Type.verify` does
 * not reject missing required fields (defaults kick in, e.g. empty bytes).
 * `Type.decode` throws if a required field is absent from the wire, but a
 * peer can still send zero-length `bytes` for a required field — reject that.
 */
function assertRequiredFields(
    Type: protobuf.Type,
    msg: object,
    path = Type.name,
): void {
    for (const field of Type.fieldsArray) {
        if (!field.required) {
            continue;
        }
        if (!Object.prototype.hasOwnProperty.call(msg, field.name)) {
            throw new Error(`${path}.${field.name}: required field missing`);
        }
        const value = (msg as Record<string, unknown>)[field.name];
        if (field.type === 'bytes') {
            if (
                (Buffer.isBuffer(value) || value instanceof Uint8Array) &&
                value.length === 0
            ) {
                throw new Error(
                    `${path}.${field.name}: required bytes field is empty`,
                );
            }
            // protobufjs create() defaults missing bytes to [] without own prop;
            // decode of a zero-length wire value is a Buffer/Uint8Array above.
            if (Array.isArray(value) && value.length === 0) {
                throw new Error(
                    `${path}.${field.name}: required bytes field is empty`,
                );
            }
        }
    }
    for (const oneof of Type.oneofsArray) {
        const set = oneof.oneof.some(name =>
            Object.prototype.hasOwnProperty.call(msg, name),
        );
        if (!set) {
            throw new Error(`${path}.${oneof.name}: oneof is required`);
        }
    }
    for (const field of Type.fieldsArray) {
        if (
            !(field.resolvedType instanceof protobuf.Type) ||
            !Object.prototype.hasOwnProperty.call(msg, field.name)
        ) {
            continue;
        }
        const child = (msg as Record<string, unknown>)[field.name];
        if (field.repeated && !Array.isArray(child)) {
            throw new Error(
                `${path}.${field.name}: expected array for repeated field`,
            );
        }
        if (field.repeated) {
            // Narrowed by the throw above; TS does not carry that across ifs.
            const items = child as unknown[];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item !== null && typeof item === 'object') {
                    assertRequiredFields(
                        field.resolvedType,
                        item,
                        `${path}.${field.name}[${i}]`,
                    );
                }
            }
            continue;
        }
        if (child !== null && typeof child === 'object') {
            assertRequiredFields(
                field.resolvedType,
                child,
                `${path}.${field.name}`,
            );
        }
    }
}

/**
 * True if `value` is a protobufjs/long `Long`-like object.
 * Typedefs for protobufjs 8 omit `Long.isLong`, so duck-type instead.
 */
function isLong(value: unknown): boolean {
    return (
        typeof value === 'object' &&
        value !== null &&
        'low' in value &&
        'high' in value &&
        'unsigned' in value &&
        typeof (value as { toString?: unknown }).toString === 'function'
    );
}

/**
 * Map protobufjs `Long` values to `bigint` (deep).
 * Reject unsafe JS numbers so a Long-less protobufjs fallback cannot leak
 * imprecise uint64 values. Safe numbers (e.g. uint32) are left as-is;
 * {@link initProto} requires Long so uint64 should arrive as Long.
 */
function longsToBigInt(value: unknown): unknown {
    if (isLong(value)) {
        return BigInt((value as { toString(): string }).toString());
    }
    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) {
            throw new Error(
                'Unsafe number in decoded int field: Long support required ' +
                    'for values outside Number.MAX_SAFE_INTEGER',
            );
        }
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(longsToBigInt);
    }
    if (
        value !== null &&
        typeof value === 'object' &&
        !Buffer.isBuffer(value) &&
        !(value instanceof Uint8Array)
    ) {
        const out: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(
            value as Record<string, unknown>,
        )) {
            out[key] = longsToBigInt(child);
        }
        return out;
    }
    return value;
}

/**
 * Encode a oneof wrapper message (`ClientMessage`, `ServerMessage`, …).
 *
 * @param Type - protobufjs type for the wrapper
 * @param oneofField - oneof case name (e.g. `clienthello`)
 * @param payload - fields of that nested message (`bigint` for 64-bit ints)
 */
export function encodeMessage(
    Type: protobuf.Type,
    oneofField: string,
    payload: Record<string, unknown>,
): Buffer {
    const allowed = Type.oneofsArray.some(o => o.oneof.includes(oneofField));
    if (!allowed) {
        throw new Error(`Unsupported message field: ${oneofField}`);
    }
    const nested = Type.fields[oneofField]?.resolvedType;
    if (nested instanceof protobuf.Type) {
        assertUint64Fields(nested, payload, `${Type.name}.${oneofField}`);
    }
    // fromObject accepts bigint for 64-bit fields; create+verify alone reject
    // bigint and can silently truncate unsafe numbers.
    const msg = Type.fromObject({ [oneofField]: payload });
    const err = Type.verify(msg);
    if (err) {
        throw new Error(String(err));
    }
    assertRequiredFields(Type, msg);
    return Buffer.from(Type.encode(msg).finish());
}

/**
 * Decode a oneof wrapper into `{ field, payload }` (64-bit ints as `bigint`).
 */
export function decodeMessage(
    Type: protobuf.Type,
    buf: Buffer,
): { field: string; payload: Record<string, unknown> } {
    const msg = Type.decode(buf) as protobuf.Message & { msg?: string };
    const field = msg.msg;
    if (!field) {
        throw new Error('Missing message oneof field');
    }
    const payload = (msg as unknown as Record<string, unknown>)[field] as
        | Record<string, unknown>
        | undefined;
    if (!payload) {
        throw new Error(`Missing payload for ${field}`);
    }
    // Type.decode does not enforce proto2 required fields on the wire.
    assertRequiredFields(Type, msg);
    const nested = Type.fields[field]?.resolvedType;
    if (nested instanceof protobuf.Type) {
        assertRequiredFields(nested, payload, `${Type.name}.${field}`);
    }
    return {
        field,
        payload: longsToBigInt(payload) as Record<string, unknown>,
    };
}

/**
 * Encode an `alpfusion.Component` (input / output / blank).
 */
export function encodeComponent(component: Record<string, unknown>): Buffer {
    const Type = requireProto().lookupType('alpfusion.Component');
    assertUint64Fields(Type, component);
    const msg = Type.fromObject(component);
    const err = Type.verify(msg);
    if (err) {
        throw new Error(String(err));
    }
    assertRequiredFields(Type, msg);
    return Buffer.from(Type.encode(msg).finish());
}

/**
 * Decode an `alpfusion.Component` (64-bit ints as `bigint`).
 */
export function decodeComponent(buf: Buffer): Record<string, unknown> {
    const Type = requireProto().lookupType('alpfusion.Component');
    const msg = Type.decode(buf);
    assertRequiredFields(Type, msg);
    return longsToBigInt(msg) as Record<string, unknown>;
}

/**
 * Encode an `alpfusion.InitialCommitment` (dual Pedersen points).
 */
export function encodeInitialCommitment(
    payload: Record<string, unknown>,
): Buffer {
    const Type = requireProto().lookupType('alpfusion.InitialCommitment');
    assertUint64Fields(Type, payload);
    const msg = Type.fromObject(payload);
    const err = Type.verify(msg);
    if (err) {
        throw new Error(String(err));
    }
    assertRequiredFields(Type, msg);
    return Buffer.from(Type.encode(msg).finish());
}

/**
 * Decode an `alpfusion.InitialCommitment`.
 */
export function decodeInitialCommitment(buf: Buffer): Record<string, unknown> {
    const Type = requireProto().lookupType('alpfusion.InitialCommitment');
    const msg = Type.decode(buf);
    assertRequiredFields(Type, msg);
    return longsToBigInt(msg) as Record<string, unknown>;
}
