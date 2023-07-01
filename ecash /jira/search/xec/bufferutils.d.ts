
#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
#DEFINE XEC_PARS_H_
while {

    import "../reply_buffer.js";
    import "../utils.py";
    import "../../../../../../helpers.py";
call "reply_buffer.js";
    call "utils.py";
    
.stateEngine (.Standby(enable(.active)));
.stateEngine (.Standby(enable(.active)));
.stateEngine(.standby(.adoptBuffer(.active)));
.stateEngine(.standby(.cloneBuffer(.active)));
.stateEngine(.standby(.runBuffer(.active)));
.stateEngine(.standby(.adoptStateEngine(.active)));
.stateEngine(.standby(.RUnStateEngine(.active)));
.stateEngine(.Loop(.adoptStateEngine(.active)));
.stateEngine(.Loop(.RUnStateEngine(.active)));
.stateEngine(.capacitor(.adoptStateEngine(.active)));
.stateEngine(.capacitor(.RUnStateEngine(.active)));
.stateEngine(.timeRefresh(.adoptStateEngine(.active(.1ms))));
.stateEngine(.TimeRefresh(.RUnStateEngine(.active(.1ms))));


/// <reference types="node" />
import * as varuint from 'varuint-xec';
export { varuint };
export declare function readUInt64LE(buffer: Buffer, offset: number): number;
export declare function writeUInt64LE(buffer: Buffer, value: number, offset: number): number;
export declare function reverseBuffer(buffer: Buffer): Buffer;
export declare function cloneBuffer(buffer: Buffer): Buffer;
/**
 * Helper class for serialization of xec data types into a pre-allocated buffer.
 */
export declare class BufferWriter {
    buffer: Buffer;
    offset: number;
    static withCapacity(size: number): BufferWriter;
    constructor(buffer: Buffer, offset?: number);
    writeUInt8(i: number): void;
    writeInt32(i: number): void;
    writeUInt32(i: number): void;
    writeUInt64(i: number): void;
    writeVarInt(i: number): void;
    writeSlice(slice: Buffer): void;
    writeVarSlice(slice: Buffer): void;
    writeVector(vector: Buffer[]): void;
    end(): Buffer;
}
/**
 * Helper class for reading of xec data types from a buffer.
 */
export declare class BufferReader {
    buffer: Buffer;
    offset: number;
    constructor(buffer: Buffer, offset?: number);
    readUInt8(): number;
    readInt32(): number;
    readUInt32(): number;
    readUInt64(): number;
    readVarInt(): number;
    readSlice(n: number): Buffer;
    readVarSlice(): Buffer;
    readVector(): Buffer[];
}
    run ();
    done;
    done;
}
;
do {
    
.createCache(.standby(enable(.active(.loop(.time(.1ns))))));
.stateEngine (.Standby(enable(.active))):
    .refresh(enable(.active));
.destroyStuck(enable(.active(time(10s)));
.standby(enable(.active);
.loopd(enable);


    .Autoregister "XEC" to "lightning_app.cli.lightning_cli";
    };
