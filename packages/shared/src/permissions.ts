import type { AccessLevel } from './types/share.js';

/**
 * Represents the hierarchical permission enum.
 * This can be used in code logic alongside the AccessLevel type.
 */
export enum AccessLevelEnum {
    READ = 'READ',
    READ_DOWNLOAD = 'READ_DOWNLOAD',
}

/**
 * Checks if the given access level allows reading/listing files.
 */
export function canRead(level: AccessLevel | string): boolean {
    return (
        level === AccessLevelEnum.READ ||
        level === AccessLevelEnum.READ_DOWNLOAD
    );
}

/**
 * Checks if the given access level allows downloading files.
 */
export function canDownload(level: AccessLevel | string): boolean {
    return level === AccessLevelEnum.READ_DOWNLOAD;
}

export const PERMISSION_ERROR_CODES = {
    MISSING_AUTH: 'MISSING_AUTH',
    STALE_REQUEST: 'STALE_REQUEST',
    CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
    INVALID_SIGNATURE: 'INVALID_SIGNATURE',
    INVALID_PATH: 'INVALID_PATH',
    NO_ACCESS: 'NO_ACCESS',
    READ_ONLY: 'READ_ONLY',
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
} as const;
