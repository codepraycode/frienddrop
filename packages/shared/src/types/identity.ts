export interface Identity {
    username: string;
    deviceId: string;
    publicKey: string; // Ed25519 public key, base64
    privateKey: string; // Ed25519 private key, base64 — NEVER transmitted
    createdAt: number; // Unix timestamp (ms)
}
