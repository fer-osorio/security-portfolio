/**
 * ============================================================================
 * HASH FUNCTION VISUALIZER - CORE ALGORITHMS
 *
 * Wrappers for hash algorithms using:
 * 1. Web Crypto API (native, hardware-accelerated)
 * 2. CryptoJS library (for MD5 and SHA-3, not in Web Crypto API)
 * ============================================================================
 */

import { Config, AlgorithmInfo } from '../../config';
import { stringToArrayBuffer, arrayBufferToHex } from './hash-utils';

export type SupportedAlgorithm =
    | 'md5' | 'sha1' | 'sha-1'
    | 'sha256' | 'sha-256'
    | 'sha384' | 'sha-384'
    | 'sha512' | 'sha-512'
    | 'sha3-256' | 'sha3-384' | 'sha3-512';

export type HashFunction = (input: string) => Promise<string>;

type HMACAlgorithm  = 'SHA-256' | 'SHA-384' | 'SHA-512';
type SHA3OutputBits = 224 | 256 | 384 | 512;

// ============================================================================
// HASH IMPLEMENTATIONS
// ============================================================================

/**
 * Check if CryptoJS library is loaded (required for MD5 and SHA-3)
 */
export function isCryptoJSAvailable(): boolean {
    return typeof CryptoJS !== 'undefined';
}

/**
 * Compute MD5 hash (BROKEN — educational only)
 */
export async function md5(input: string): Promise<string> {
    if (!isCryptoJSAvailable()) {
        throw new Error('CryptoJS library not loaded. Required for MD5.');
    }

    const hash = CryptoJS.MD5(input);
    return hash.toString(CryptoJS.enc.Hex);
}

/**
 * Compute SHA-1 hash (DEPRECATED — educational only)
 */
export async function sha1(input: string): Promise<string> {
    const buffer = stringToArrayBuffer(input);
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    return arrayBufferToHex(hashBuffer);
}

/**
 * Compute SHA-256 hash (current standard)
 */
export async function sha256(input: string): Promise<string> {
    const buffer = stringToArrayBuffer(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return arrayBufferToHex(hashBuffer);
}

/**
 * Compute SHA-384 hash
 */
export async function sha384(input: string): Promise<string> {
    const buffer = stringToArrayBuffer(input);
    const hashBuffer = await crypto.subtle.digest('SHA-384', buffer);
    return arrayBufferToHex(hashBuffer);
}

/**
 * Compute SHA-512 hash
 */
export async function sha512(input: string): Promise<string> {
    const buffer = stringToArrayBuffer(input);
    const hashBuffer = await crypto.subtle.digest('SHA-512', buffer);
    return arrayBufferToHex(hashBuffer);
}

/**
 * Compute SHA-3 (Keccak) hash via CryptoJS
 */
export async function sha3(input: string, outputBits: SHA3OutputBits = 256): Promise<string> {
    if (!isCryptoJSAvailable()) {
        throw new Error('CryptoJS library not loaded. Required for SHA-3.');
    }

    let hash: { toString(encoder: object): string };

    switch (outputBits) {
        case 224:
            hash = CryptoJS.SHA3(input, { outputLength: 224 });
            break;
        case 256:
            hash = CryptoJS.SHA3(input, { outputLength: 256 });
            break;
        case 384:
            hash = CryptoJS.SHA3(input, { outputLength: 384 });
            break;
        case 512:
            hash = CryptoJS.SHA3(input, { outputLength: 512 });
            break;
        default: {
            const exhaustive: never = outputBits;
            throw new Error(`Invalid output size for SHA-3: ${exhaustive}. Use 224, 256, 384, or 512.`);
        }
    }

    return hash.toString(CryptoJS.enc.Hex);
}

/**
 * Compute HMAC (Hash-based Message Authentication Code)
 *
 * Construction (RFC 2104): HMAC(K, m) = H((K XOR opad) || H((K XOR ipad) || m))
 */
export async function hmac(
    key: string,
    message: string,
    algorithm: HMACAlgorithm = 'SHA-256'
): Promise<string> {
    const keyBuffer = stringToArrayBuffer(key);
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'HMAC', hash: algorithm },
        false,
        ['sign']
    );

    const messageBuffer = stringToArrayBuffer(message);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBuffer);

    return arrayBufferToHex(signature);
}

/**
 * Unified hash function interface — compute any supported hash
 */
export async function computeHash(input: string, algorithm: SupportedAlgorithm): Promise<string> {
    switch (algorithm) {
        case 'md5':
            return md5(input);
        case 'sha1':
        case 'sha-1':
            return sha1(input);
        case 'sha256':
        case 'sha-256':
            return sha256(input);
        case 'sha384':
        case 'sha-384':
            return sha384(input);
        case 'sha512':
        case 'sha-512':
            return sha512(input);
        case 'sha3-256':
            return sha3(input, 256);
        case 'sha3-384':
            return sha3(input, 384);
        case 'sha3-512':
            return sha3(input, 512);
    }
}

/**
 * Get algorithm metadata from Config
 */
export function getAlgorithmInfo(algorithm: string): AlgorithmInfo | null {
    return Config.getAlgorithmInfo(algorithm);
}
