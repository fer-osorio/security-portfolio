/**
 * ============================================================================
 * RSA CRYPTOSYSTEM - CORE IMPLEMENTATION
 * ============================================================================
 */

import { Config } from '../../config';
import {
    modPow,
    bitLength,
    randomBigInt,
    isDivisibleBySmallPrime,
    eulerTotient,
    areCoprime,
    modInverse,
    stringToBigInt,
    bigIntToString,
} from './math-utils';

export interface RSAPublicKey {
    e: bigint;
    n: bigint;
}

export interface RSAPrivateKey {
    d: bigint;
    n: bigint;
}

export interface RSAKeyPair {
    publicKey:  RSAPublicKey;
    privateKey: RSAPrivateKey;
    p:          bigint;
    q:          bigint;
    phi:        bigint;
}

export interface KeyGenProgressData {
    attempt: number;
    isPrime: boolean;
}

export type KeyGenProgressCallback =
    (stage: string, data: KeyGenProgressData | null) => void;

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomWitness(n: bigint): bigint {
    const bitLen = bitLength(n);
    let witness: bigint;

    do {
        witness = randomBigInt(bitLen);
    } while (witness < 2n || witness >= n - 1n);

    return witness;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Miller-Rabin Primality Test
 *
 * @param n      - Number to test
 * @param rounds - Number of witnesses (default: Config.RSA.PRIMALITY_TEST_ROUNDS)
 * @returns true if probably prime, false if definitely composite
 */
export function millerRabin(n: bigint, rounds = Config.RSA.PRIMALITY_TEST_ROUNDS): boolean {
    if (n <= 1n) return false;
    if (n <= 3n) return true;
    if (n % 2n === 0n) return false;

    // Write n-1 as 2^r · d where d is odd
    let r = 0n;
    let d = n - 1n;
    while (d % 2n === 0n) {
        r += 1n;
        d = d / 2n;
    }

    witnessLoop: for (let i = 0; i < rounds; i++) {
        const a = randomWitness(n);

        let x = modPow(a, d, n);

        if (x === 1n || x === n - 1n) {
            continue witnessLoop;
        }

        // Square x repeatedly (r-1 times); loop variable j is bigint — arithmetic with bigint r
        for (let j = 0n; j < r - 1n; j += 1n) {
            x = modPow(x, 2n, n);

            if (x === n - 1n) {
                continue witnessLoop;
            }
        }

        return false;
    }

    return true;
}

/**
 * Generate a random prime number.
 *
 * @param bits             - Desired bit length
 * @param progressCallback - Optional progress callback
 * @returns Random prime number
 */
export async function generatePrime(
    bits: number,
    progressCallback?: KeyGenProgressCallback
): Promise<bigint> {
    let attempts = 0;

    while (true) {
        attempts++;

        let candidate = randomBigInt(bits);

        if (candidate % 2n === 0n) {
            candidate = candidate + 1n;
        }

        if (isDivisibleBySmallPrime(candidate)) {
            if (progressCallback) progressCallback('progress', { attempt: attempts, isPrime: false });
            continue;
        }

        const isPrime = millerRabin(candidate);

        if (progressCallback) progressCallback('progress', { attempt: attempts, isPrime });

        if (isPrime) {
            console.log(`Found prime after ${attempts} attempts`);
            return candidate;
        }

        if (attempts % 10 === 0) {
            await sleep(0);
        }
    }
}

/**
 * Generate RSA key pair.
 *
 * @param bits             - Key size in bits (default: Config.RSA.DEFAULT_KEY_SIZE)
 * @param progressCallback - Optional progress callback
 * @returns RSAKeyPair with public key, private key, and educational parameters
 */
export async function generateKeyPair(
    bits = Config.RSA.DEFAULT_KEY_SIZE,
    progressCallback?: KeyGenProgressCallback
): Promise<RSAKeyPair> {
    console.log(`Generating ${bits}-bit RSA key pair...`);

    // Math.floor(bits / 2) operates on number — correct as-is
    const halfBits = Math.floor(bits / 2);

    if (progressCallback) progressCallback('Generating prime p', null);
    const p = await generatePrime(halfBits, (_stage, data) => {
        if (progressCallback) progressCallback('Generating prime p', data);
    });
    console.log(`Generated p (${bitLength(p)} bits)`);

    if (progressCallback) progressCallback('Generating prime q', null);
    let q: bigint;
    do {
        q = await generatePrime(halfBits, (_stage, data) => {
            if (progressCallback) progressCallback('Generating prime q', data);
        });
    } while (q === p);
    console.log(`Generated q (${bitLength(q)} bits)`);

    const diff = p > q ? p - q : q - p;
    if (diff < BigInt(Config.RSA.MIN_PQ_DIFFERENCE_BITS)) {
        console.warn('p and q are too close, regenerating...');
        return generateKeyPair(bits, progressCallback);
    }

    if (progressCallback) progressCallback('Computing modulus n', null);
    const n = p * q;
    console.log(`Modulus n: ${bitLength(n)} bits`);

    if (progressCallback) progressCallback('Computing φ(n)', null);
    const phi = eulerTotient(p, q);

    const e = BigInt(Config.RSA.PUBLIC_EXPONENT);

    if (!areCoprime(e, phi)) {
        console.error('e and φ(n) are not coprime! Regenerating keys...');
        return generateKeyPair(bits, progressCallback);
    }

    if (progressCallback) progressCallback('Computing private exponent d', null);

    let d: bigint;
    try {
        d = modInverse(e, phi);
    } catch {
        console.error('Failed to compute modular inverse! Regenerating keys...');
        return generateKeyPair(bits, progressCallback);
    }

    const verification = (e * d) % phi;
    if (verification !== 1n) {
        console.error('Key generation verification failed!');
        return generateKeyPair(bits, progressCallback);
    }

    console.log('Key generation complete!');

    if (progressCallback) progressCallback('Complete', null);

    return {
        publicKey:  { e, n },
        privateKey: { d, n },
        p,
        q,
        phi,
    };
}

/**
 * RSA Encryption: c = m^e mod n
 */
export function encrypt(message: bigint, publicKey: RSAPublicKey): bigint {
    const { e, n } = publicKey;

    if (message >= n) {
        throw new Error(
            `Message too large! Message must be < modulus n.\nMessage: ${message}\nModulus: ${n}`
        );
    }

    if (message < 0n) {
        throw new Error('Message must be non-negative');
    }

    return modPow(message, e, n);
}

/**
 * RSA Decryption: m = c^d mod n
 */
export function decrypt(ciphertext: bigint, privateKey: RSAPrivateKey): bigint {
    const { d, n } = privateKey;

    if (ciphertext >= n) {
        throw new Error('Invalid ciphertext: must be < modulus n');
    }

    if (ciphertext < 0n) {
        throw new Error('Ciphertext must be non-negative');
    }

    return modPow(ciphertext, d, n);
}

/**
 * Encrypt a text string — returns ciphertext serialised as a decimal string.
 */
export function encryptString(message: string, publicKey: RSAPublicKey): string {
    const messageInt = stringToBigInt(message);
    return encrypt(messageInt, publicKey).toString();
}

/**
 * Decrypt a decimal-string ciphertext — returns recovered plaintext string.
 */
export function decryptString(ciphertext: string, privateKey: RSAPrivateKey): string {
    const plaintextInt = decrypt(BigInt(ciphertext), privateKey);
    return bigIntToString(plaintextInt);
}
