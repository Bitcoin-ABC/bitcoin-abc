interface SignatureOptions {
    segwitType?: 'p2wpkh' | 'p2sh(p2wpkh)';
    extraEntropy?: Buffer;
}

export interface Signer {
    // param hash: 32 byte Buffer containing the digest of the message
    // param extraEntropy (optional): the 32 byte Buffer of the "extra data" part of RFC6979 nonces
    // returns object
    //   attribute signature: 64 byte Buffer, first 32 R value, last 32 S value of ECDSA signature
    //   attribute recovery: Number (integer) from 0 to 3 (inclusive), also known as recid, used for pubkey recovery
    sign(
        hash: Buffer,
        extraEntropy?: Buffer,
    ): { signature: Buffer; recovery: number };
}

export interface SignerAsync {
    // Same as Signer, but return is wrapped in a Promise
    sign(
        hash: Buffer,
        extraEntropy?: Buffer,
    ): Promise<{ signature: Buffer; recovery: number }>;
}

export function magicHash(
    message: string | Buffer,
    messagePrefix?: string,
): Buffer;

// sign function is overloaded
export function sign(
    message: string | Buffer,
    privateKey: Buffer | Signer,
    compressed?: boolean,
    sigOptions?: SignatureOptions,
): Buffer;
export function sign(
    message: string | Buffer,
    privateKey: Buffer | Signer,
    compressed?: boolean,
    messagePrefix?: string,
    sigOptions?: SignatureOptions,
): Buffer;

// signAsync function is overloaded
export function signAsync(
    message: string | Buffer,
    privateKey: Buffer | SignerAsync | Signer,
    compressed?: boolean,
    sigOptions?: SignatureOptions,
): Promise<Buffer>;
export function signAsync(
    message: string | Buffer,
    privateKey: Buffer | SignerAsync | Signer,
    compressed?: boolean,
    messagePrefix?: string,
    sigOptions?: SignatureOptions,
): Promise<Buffer>;

export function verify(
    message: string | Buffer,
    address: string,
    signature: string | Buffer,
    messagePrefix?: string,
    checkSegwitAlways?: boolean,
): boolean;
