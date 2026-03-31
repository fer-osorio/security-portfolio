/**
 * ============================================================================
 * HASH FUNCTION VISUALIZER - CORE UTILITIES
 * ============================================================================
 */

import { BitDiffEntry } from '../../display-components';
import { Config } from '../../config';

// Local-only — avoids circular dep with hash-core
type HashFunction = (input: string) => Promise<string>;

export interface AvalancheResult {
    flipped:    number;
    total:      number;
    percentage: string;
}

export interface BenchmarkResult {
    totalTime:          string;
    avgTime:            string;
    hashesPerSecond:    string;
    megabytesPerSecond: string;
}

/**
 * Convert string to ArrayBuffer (for Web Crypto API)
 *
 * TextEncoder.encode() returns Uint8Array, which satisfies BufferSource.
 */
export function stringToArrayBuffer(str: string): Uint8Array<ArrayBuffer> {
    // new Uint8Array(ArrayLike) uses the overload that returns Uint8Array<ArrayBuffer>,
    // which satisfies BufferSource as required by the Web Crypto API.
    return new Uint8Array(new TextEncoder().encode(str));
}

/**
 * Convert ArrayBuffer to hexadecimal string
 *
 * Each byte (0-255) -> two hex digits (00-FF)
 */
export function arrayBufferToHex(buffer: ArrayBuffer): string {
    const byteArray = new Uint8Array(buffer);
    const hexParts: string[] = [];

    for (let i = 0; i < byteArray.length; i++) {
        const hex = byteArray[i].toString(16).padStart(2, '0');
        hexParts.push(hex);
    }

    return hexParts.join('');
}

/**
 * Convert hexadecimal string to binary string
 */
export function hexToBinary(hex: string): string {
    const binaryParts: string[] = [];

    for (let i = 0; i < hex.length; i++) {
        const hexDigit = hex[i];
        const decimal = parseInt(hexDigit, 16);
        const binary = decimal.toString(2).padStart(4, '0');
        binaryParts.push(binary);
    }

    return binaryParts.join('');
}

/**
 * Convert binary string to hexadecimal string
 */
export function binaryToHex(binary: string): string {
    let padded = binary;

    while (padded.length % 4 !== 0) {
        padded = '0' + padded;
    }

    const hexParts: string[] = [];

    for (let i = 0; i < padded.length; i += 4) {
        const fourBits = padded.substring(i, i + 4);
        const decimal = parseInt(fourBits, 2);
        hexParts.push(decimal.toString(16));
    }

    return hexParts.join('');
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const byteArray = new Uint8Array(buffer);
    let binary = '';

    for (let i = 0; i < byteArray.length; i++) {
        binary += String.fromCharCode(byteArray[i]);
    }

    return btoa(binary);
}

/**
 * Count number of different bits between two binary strings (Hamming distance)
 */
export function hammingDistance(binary1: string, binary2: string): number {
    if (binary1.length !== binary2.length) {
        throw new Error('Binary strings must have same length');
    }

    let distance = 0;

    for (let i = 0; i < binary1.length; i++) {
        if (binary1[i] !== binary2[i]) {
            distance++;
        }
    }

    return distance;
}

/**
 * Compute avalanche effect percentage between two hex hashes
 */
export function computeAvalanche(hash1: string, hash2: string): AvalancheResult {
    const binary1 = hexToBinary(hash1);
    const binary2 = hexToBinary(hash2);

    const flipped = hammingDistance(binary1, binary2);
    const total = binary1.length;
    const percentage = (flipped / total) * 100;

    return {
        flipped,
        total,
        percentage: percentage.toFixed(2)
    };
}

/**
 * Flip a specific bit in a string
 */
export function flipBit(str: string, bitPosition: number): string {
    const bytes = new TextEncoder().encode(str);
    const byteIndex = Math.floor(bitPosition / 8);
    const bitIndex = bitPosition % 8;

    if (byteIndex >= bytes.length) {
        throw new Error('Bit position out of range');
    }

    bytes[byteIndex] ^= (1 << bitIndex);

    return new TextDecoder().decode(bytes);
}

/**
 * Generate bit difference visualization array
 */
export function generateBitDiff(binary1: string, binary2: string): BitDiffEntry[] {
    if (binary1.length !== binary2.length) {
        throw new Error('Binary strings must have same length');
    }

    const diff: BitDiffEntry[] = [];

    for (let i = 0; i < binary1.length; i++) {
        diff.push({
            bit: binary1[i],
            status: binary1[i] === binary2[i] ? 'same' : 'different',
            position: i
        });
    }

    return diff;
}

/**
 * Calculate birthday attack collision probability
 *
 * Formula: P(collision) = 1 - e^(-k^2/(2n))
 * where k = attempts, n = 2^hashBits
 */
export function birthdayAttackProbability(hashBits: number, attempts: number): number {
    if (hashBits > 100) {
        const logN = hashBits * Math.LN2;
        const logProb = -(attempts * attempts) / (2 * Math.exp(logN));

        if (logProb < -50) return 1;

        return 1 - Math.exp(logProb);
    } else {
        const n = Math.pow(2, hashBits);
        const exponent = -(attempts * attempts) / (2 * n);
        return 1 - Math.exp(exponent);
    }
}

/**
 * Calculate attempts needed for 50% collision probability
 *
 * k ~= 1.177 * 2^(hashBits/2)
 */
export function attemptsFor50PercentCollision(hashBits: number): string {
    const validBits = Object.values(Config.ALGORITHMS).map(a => a.outputBits);
    if (!validBits.includes(hashBits)) {
        console.warn(`Unusual hash bit length: ${hashBits}`);
    }

    const exponent = hashBits / 2;
    return `2^${exponent.toFixed(1)}`;
}

/**
 * Format binary string with spaces every 8 bits
 */
export function formatBinary(binary: string): string {
    let formatted = '';
    for (let i = 0; i < binary.length; i += 8) {
        formatted += binary.substring(i, i + 8) + ' ';
    }
    return formatted.trim();
}

/**
 * Format large numbers in human-readable form
 */
export function formatLargeNumber(num: number): string {
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
    if (num < 1000000000000) return (num / 1000000000).toFixed(1) + 'B';

    return num.toExponential(2);
}

/**
 * Constant-time string comparison (prevents timing attacks)
 */
export function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let diff = 0;

    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return diff === 0;
}

/**
 * Chunk data for processing large inputs without blocking UI
 */
export function chunkData(data: string, chunkSize = 1024 * 1024): string[] {
    const chunks: string[] = [];

    for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.substring(i, i + chunkSize));
    }

    return chunks;
}

/**
 * Benchmark hash function performance
 */
export async function benchmarkHash(
    hashFunction: HashFunction,
    input: string,
    iterations = 1000
): Promise<BenchmarkResult> {
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
        await hashFunction(input);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    const hashesPerSecond = (iterations / totalTime) * 1000;

    const inputSizeBytes = new TextEncoder().encode(input).length;
    const megabytesPerSecond = (hashesPerSecond * inputSizeBytes) / (1024 * 1024);

    return {
        totalTime: totalTime.toFixed(2),
        avgTime: avgTime.toFixed(4),
        hashesPerSecond: hashesPerSecond.toFixed(0),
        megabytesPerSecond: megabytesPerSecond.toFixed(2)
    };
}

/**
 * Validate hash output format (correct length and valid hex characters)
 */
export function isValidHash(hash: string, algorithm: string): boolean {
    const expectedLengths: Record<string, number> = {
        'md5': 32,
        'sha1': 40,
        'sha256': 64,
        'sha384': 96,
        'sha512': 128,
        'sha3-256': 64,
        'sha3-512': 128
    };

    const expectedLength = expectedLengths[algorithm.toLowerCase()];

    if (!expectedLength) return false;
    if (hash.length !== expectedLength) return false;

    return /^[0-9a-f]+$/i.test(hash);
}
