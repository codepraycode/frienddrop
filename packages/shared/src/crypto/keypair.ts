import * as ed from '@noble/curves/ed25519';

interface GlobalWithBuffer {
    Buffer?: {
        from(
            data: string | Uint8Array,
            encoding?: string,
        ): { toString(encoding?: string): string; [index: number]: number; length: number };
    };
}

const getBuffer = () =>
    typeof globalThis !== 'undefined'
        ? (globalThis as unknown as GlobalWithBuffer).Buffer
        : undefined;

/**
 * Universal base64 encoder that handles both Node and browser environments.
 */
function bytesToBase64(bytes: Uint8Array): string {
    const Buffer = getBuffer();
    if (Buffer) {
        return Buffer.from(bytes).toString('base64');
    }
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Universal base64 decoder.
 */
function base64ToBytes(base64: string): Uint8Array {
    const Buffer = getBuffer();
    if (Buffer) {
        const buf = Buffer.from(base64, 'base64');
        return new Uint8Array(buf as unknown as Iterable<number>);
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Generates an Ed25519 keypair for device pairing.
 */
export function generateKeypair(): {
    publicKey: string;
    privateKey: string;
} {
    const privateKeyBytes = ed.ed25519.utils.randomPrivateKey();
    const publicKeyBytes = ed.ed25519.getPublicKey(privateKeyBytes);

    return {
        // Base64 is used for storage and transport
        privateKey: bytesToBase64(privateKeyBytes),
        publicKey: bytesToBase64(publicKeyBytes),
    };
}

/**
 * Normalizes HTTP parameters into a canonical string for signing.
 */
function getCanonicalString(params: {
    method: string;
    path: string;
    query: string;
    timestamp: number;
}): string {
    return [params.method, params.path, params.query, params.timestamp].join(
        '\n',
    );
}

/**
 * Signs a canonical request string using a private key.
 */
export function signRequest(params: {
    method: string;
    path: string;
    query: string;
    timestamp: number;
    privateKey: string;
}): string {
    const canonical = getCanonicalString(params);
    const message = new TextEncoder().encode(canonical);
    const privateKeyBytes = base64ToBytes(params.privateKey);

    const signatureBytes = ed.ed25519.sign(message, privateKeyBytes);
    return bytesToBase64(signatureBytes);
}

/**
 * Verifies a request signature against a known public key.
 */
export function verifyRequest(params: {
    method: string;
    path: string;
    query: string;
    timestamp: number;
    signature: string;
    publicKey: string;
}): boolean {
    const canonical = getCanonicalString(params);
    const message = new TextEncoder().encode(canonical);
    const signatureBytes = base64ToBytes(params.signature);
    const publicKeyBytes = base64ToBytes(params.publicKey);

    return ed.ed25519.verify(signatureBytes, message, publicKeyBytes);
}
