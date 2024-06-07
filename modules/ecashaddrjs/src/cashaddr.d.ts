declare module 'ecashaddrjs' {
    interface DecodedAddress {
        prefix: string;
        type: AddressType;
        hash: Uint8Array | string;
    }
    type AddressType = 'p2pkh' | 'P2PKH' | 'p2sh' | 'P2SH';
    export function ValidationError(message: any): void;

    export function decode(
        address: string,
        chronikReady: boolean,
    ): DecodedAddress;

    export function encode(
        prefix: string,
        type: AddressType,
        hash: Uint8Array | string,
    ): string;

    export function encodeOutputScript(
        outputScript: string,
        prefix: string,
    ): string;

    export function getOutputScriptFromAddress(address: string): string;

    export function getTypeAndHashFromOutputScript(outputScript: string): {
        type: AddressType;
        hash: string;
    };

    export function isValidCashAddress(
        cashaddress: string,
        optionalPrefix?: string | false,
    ): boolean;

    export function toLegacy(cashaddress: string): string;

    export function uint8arraytoString(uint8Array: Uint8Array): string;
}
