export interface InvitePayload {
    publicKey: string;
    deviceId: string;
    username: string;
}

/**
 * Helper to do base64url encoding purely in JS to support both browser and Node.
 */
function base64urlEncode(str: string): string {
    let base64: string;
    if (typeof Buffer !== 'undefined') {
        base64 = Buffer.from(str).toString('base64');
    } else {
        base64 = btoa(
            encodeURIComponent(str).replace(
                /%([0-9A-F]{2})/g,
                function toSolidBytes(_match, p1) {
                    return String.fromCharCode(Number('0x' + p1));
                },
            ),
        );
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Helper to do base64url decoding purely in JS.
 */
function base64urlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }

    if (typeof Buffer !== 'undefined') {
        return Buffer.from(base64, 'base64').toString('utf8');
    } else {
        return decodeURIComponent(
            atob(base64)
                .split('')
                .map(function (c) {
                    return (
                        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                    );
                })
                .join(''),
        );
    }
}

/**
 * Encodes identity information into a shareable invite code.
 */
export function encodeInviteCode(identity: InvitePayload): string {
    const payload = JSON.stringify(identity);
    return base64urlEncode(payload);
}

/**
 * Decodes an invite code back into identity information.
 * Throws if the code is invalid.
 */
export function decodeInviteCode(code: string): InvitePayload {
    const payload = base64urlDecode(code);
    return JSON.parse(payload) as InvitePayload;
}
