var Buffer = require('safe-buffer').Buffer;
var bip66 = require('bip66');
var pushdata = require('pushdata-ecash');
var typeforce = require('typeforce');
var types = require('./types');
var scriptNumber = require('./script_number');

var OPS = require('ecash-ops');
var REVERSE_OPS = require('ecash-ops/map');
var OP_INT_BASE = OPS.OP_RESERVED; // OP_1 - 1

function isOPInt(value) {
    return (
        types.Number(value) &&
        (value === OPS.OP_0 ||
            (value >= OPS.OP_1 && value <= OPS.OP_16) ||
            value === OPS.OP_1NEGATE)
    );
}

function isPushOnlyChunk(value) {
    return types.Buffer(value) || isOPInt(value);
}

function isPushOnly(value) {
    return types.Array(value) && value.every(isPushOnlyChunk);
}

// This function reaks havoc on the OP_RETURN call of an SLP transaction.
function asMinimalOP(buffer) {
    if (buffer.length === 0) return OPS.OP_0;
    if (buffer.length !== 1) return;
    if (buffer[0] >= 1 && buffer[0] <= 16) return OP_INT_BASE + buffer[0];
    if (buffer[0] === 0x81) return OPS.OP_1NEGATE;
}

// Originalize compile() function. This will not correctly compile some scripts,
// including the OP_RETURN for SLP tokens. Use compile2() for that.
function compile(chunks) {
    // TODO: remove me
    if (Buffer.isBuffer(chunks)) return chunks;

    typeforce(types.Array, chunks);

    var bufferSize = chunks.reduce(function (accum, chunk) {
        // data chunk
        if (Buffer.isBuffer(chunk)) {
            // adhere to BIP62.3, minimal push policy
            if (chunk.length === 1 && asMinimalOP(chunk) !== undefined) {
                return accum + 1;
            }

            return accum + pushdata.encodingLength(chunk.length) + chunk.length;
        }

        // opcode
        return accum + 1;
    }, 0.0);

    var buffer = Buffer.allocUnsafe(bufferSize);
    var offset = 0;

    chunks.forEach(function (chunk) {
        // data chunk
        if (Buffer.isBuffer(chunk)) {
            // adhere to BIP62.3, minimal push policy
            var opcode = asMinimalOP(chunk);
            if (opcode !== undefined) {
                buffer.writeUInt8(opcode, offset);
                offset += 1;
                return;
            }

            offset += pushdata.encode(buffer, chunk.length, offset);
            chunk.copy(buffer, offset);
            offset += chunk.length;

            // opcode
        } else {
            buffer.writeUInt8(chunk, offset);
            offset += 1;
        }
    });

    if (offset !== buffer.length) throw new Error('Could not decode chunks');
    return buffer;
}

// Compile for non-minimal Script, like for SLP OP_RETURNs.
// Expects an array of Buffers, to be compiled into a binary blob returned
// as a Buffer. This final blob is ready to used as an output of a Bitcoin
// Cash transaction.
function compile2(chunks) {
    // If the chunks object is a Buffer, return it.
    if (Buffer.isBuffer(chunks)) return chunks;

    // Calculate the final size the buffer should be. Allows error checking in
    // case compilation goes wonky.
    var bufferSize = chunks.reduce(function (accum, chunk) {
        // If the chunk is of type Buffer.
        if (Buffer.isBuffer(chunk)) {
            // Return the final complied length this Buffer will take up.
            return accum + pushdata.encodingLength(chunk.length) + chunk.length;
        }

        // Otherwise the chunk object is an OP code. It will take up 1 byte.
        return accum + 1;
    }, 0.0);

    // buffer will hold final compiled Buffer.
    var buffer = Buffer.allocUnsafe(bufferSize);
    var offset = 0;

    // Loop through each element in the chunks Array.
    chunks.forEach(function (chunk, index) {
        // If the chunk is a Buffer and not an OP code.
        if (Buffer.isBuffer(chunk)) {
            // console.log(" ")
            // console.log(`index: ${index}`)
            // console.log(`chunk: ${chunk.toString("hex")}`)
            // console.log(`original buffer: ${buffer.toString("hex")}`)

            // Calculate the offset for adding this new chunk.
            offset += pushdata.encode(buffer, chunk.length, offset);

            // Copy the current chunk into the buffer.
            chunk.copy(buffer, offset);

            // Calculate the new offset.
            offset += chunk.length;

            // The chunk is an OP code and not a Buffer.
        } else {
            // Add the 1-byte OP code to the final Buffer output.
            buffer.writeUInt8(chunk, offset);
            offset += 1;
        }
    });

    // If the calculated offset and buffer length don't match, then something
    // went wrong. Throw an error.
    if (offset !== buffer.length) throw new Error('Could not decode chunks');

    // Return the final, compiled binary blog as a buffer.
    return buffer;
}

function decompile(buffer) {
    // TODO: remove me
    if (types.Array(buffer)) return buffer;

    typeforce(types.Buffer, buffer);

    var chunks = [];
    var i = 0;

    while (i < buffer.length) {
        var opcode = buffer[i];

        // data chunk
        if (opcode > OPS.OP_0 && opcode <= OPS.OP_PUSHDATA4) {
            var d = pushdata.decode(buffer, i);

            // did reading a pushDataInt fail? empty script
            if (d === null) return [];
            i += d.size;

            // attempt to read too much data? empty script
            // if (i + d.number > buffer.length) return []

            var data = buffer.slice(i, i + d.number);
            i += d.number;

            // decompile minimally
            var op = asMinimalOP(data);
            if (op !== undefined) {
                chunks.push(op);
            } else {
                chunks.push(data);
            }

            // opcode
        } else {
            chunks.push(opcode);

            i += 1;
        }
    }

    return chunks;
}

function toASM(chunks) {
    if (Buffer.isBuffer(chunks)) {
        chunks = decompile(chunks);
    }

    return chunks
        .map(function (chunk) {
            // data?
            if (Buffer.isBuffer(chunk)) {
                var op = asMinimalOP(chunk);
                if (op === undefined) return chunk.toString('hex');
                chunk = op;
            }

            // opcode!
            return REVERSE_OPS[chunk];
        })
        .join(' ');
}

function fromASM(asm) {
    typeforce(types.String, asm);

    return compile(
        asm.split(' ').map(function (chunkStr) {
            // opcode?
            if (OPS[chunkStr] !== undefined) return OPS[chunkStr];
            // typeforce(types.Hex, chunkStr)

            // data!
            return Buffer.from(chunkStr, 'hex');
        }),
    );
}

function toStack(chunks) {
    chunks = decompile(chunks);
    typeforce(isPushOnly, chunks);

    return chunks.map(function (op) {
        if (Buffer.isBuffer(op)) return op;
        if (op === OPS.OP_0) return Buffer.allocUnsafe(0);

        return scriptNumber.encode(op - OP_INT_BASE);
    });
}

function isCanonicalPubKey(buffer) {
    if (!Buffer.isBuffer(buffer)) return false;
    if (buffer.length < 33) return false;

    switch (buffer[0]) {
        case 0x02:
        case 0x03:
            return buffer.length === 33;
        case 0x04:
            return buffer.length === 65;
    }

    return false;
}

function isDefinedHashType(hashType) {
    var hashTypeMod = hashType & ~0xc0;

    // return hashTypeMod > SIGHASH_ALL && hashTypeMod < SIGHASH_SINGLE
    return hashTypeMod > 0x00 && hashTypeMod < 0x04;
}

function isCanonicalSignature(buffer) {
    if (!Buffer.isBuffer(buffer)) return false;
    if (!isDefinedHashType(buffer[buffer.length - 1])) return false;

    if (buffer.length === 65) return true;

    return bip66.check(buffer.slice(0, -1));
}

module.exports = {
    compile: compile,
    compile2: compile2,
    decompile: decompile,
    fromASM: fromASM,
    toASM: toASM,
    toStack: toStack,

    number: require('./script_number'),

    isCanonicalPubKey: isCanonicalPubKey,
    isCanonicalSignature: isCanonicalSignature,
    isPushOnly: isPushOnly,
    isDefinedHashType: isDefinedHashType,
};
