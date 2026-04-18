import * as ed from '@noble/curves/ed25519';

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
        privateKey: Buffer.from(privateKeyBytes).toString('base64'),
        publicKey: Buffer.from(publicKeyBytes).toString('base64'),
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
    const privateKeyBytes = Buffer.from(params.privateKey, 'base64');

    const signatureBytes = ed.ed25519.sign(message, privateKeyBytes);
    return Buffer.from(signatureBytes).toString('base64');
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
    const signatureBytes = Buffer.from(params.signature, 'base64');
    const publicKeyBytes = Buffer.from(params.publicKey, 'base64');

    return ed.ed25519.verify(signatureBytes, message, publicKeyBytes);
}
