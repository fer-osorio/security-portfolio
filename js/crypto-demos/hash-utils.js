/**
 * ============================================================================
 * HASH FUNCTION VISUALIZER - CORE UTILITIES
 *
 * This module provides utility functions for hash computation, comparison,
 * and format conversion.
 *
 * MATHEMATICAL FOUNDATION:
 * A cryptographic hash function H: {0,1}* → {0,1}^n has properties:
 * 1. Deterministic: H(x) always produces same output
 * 2. Preimage resistant: Given h, finding x where H(x) = h is hard
 * 3. Second preimage resistant: Given x₁, finding x₂ ≠ x₁ where H(x₁) = H(x₂) is hard
 * 4. Collision resistant: Finding any x₁ ≠ x₂ where H(x₁) = H(x₂) is hard
 * 5. Avalanche effect: Changing one bit of input changes ~50% of output bits
 *
 * FOR YOUR BACKGROUND:
 * These utilities bridge the gap between mathematical hash function
 * definitions and practical implementations. Think of this as the
 * "standard library" for hash operations, analogous to OpenSSL's EVP
 * interface in C++.
 *
 * ============================================================================
 */

/**
 * Convert string to ArrayBuffer (for Web Crypto API)
 *
 * WHY WE NEED THIS:
 * Web Crypto API operates on ArrayBuffer, not strings.
 * JavaScript strings are UTF-16 encoded, but we need byte arrays.
 *
 * TextEncoder converts string → UTF-8 bytes → ArrayBuffer
 *
 * @param {string} str - Input string
 * @returns {ArrayBuffer} - Byte representation
 */
function stringToArrayBuffer(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

/**
 * Convert ArrayBuffer to hexadecimal string
 *
 * STANDARD FORMAT: Hash outputs are traditionally shown in hex
 * Each byte (0-255) → two hex digits (00-FF)
 *
 * EXAMPLE:
 *   Bytes: [72, 101, 108, 108, 111]  (ASCII "Hello")
 *   Hex:   "48656c6c6f"
 *
 * @param {ArrayBuffer} buffer
 * @returns {string} - Hex string (lowercase)
 */
function arrayBufferToHex(buffer) {
    const byteArray = new Uint8Array(buffer);
    const hexParts = [];

    for (let i = 0; i < byteArray.length; i++) {
        // Convert byte to hex, pad with 0 if needed
        const hex = byteArray[i].toString(16).padStart(2, '0');
        hexParts.push(hex);
    }

    return hexParts.join('');
}

/**
 * Convert hexadecimal string to binary string
 *
 * VISUALIZATION: Show hash at bit level
 *
 * EXAMPLE:
 *   Hex:    "a5"
 *   Binary: "10100101"
 *
 * @param {string} hex - Hexadecimal string
 * @returns {string} - Binary string (0s and 1s)
 */
function hexToBinary(hex) {
    const binaryParts = [];

    for (let i = 0; i < hex.length; i++) {
        const hexDigit = hex[i];
        const decimal = parseInt(hexDigit, 16);
        // Convert to 4-bit binary, pad with 0s
        const binary = decimal.toString(2).padStart(4, '0');
        binaryParts.push(binary);
    }

    return binaryParts.join('');
}

/**
 * Convert binary string to hexadecimal string
 *
 * INVERSE OPERATION of hexToBinary
 *
 * @param {string} binary - Binary string
 * @returns {string} - Hex string
 */
function binaryToHex(binary) {
    // Pad to multiple of 4
    while (binary.length % 4 !== 0) {
        binary = '0' + binary;
    }

    const hexParts = [];

    for (let i = 0; i < binary.length; i += 4) {
        const fourBits = binary.substring(i, i + 4);
        const decimal = parseInt(fourBits, 2);
        const hex = decimal.toString(16);
        hexParts.push(hex);
    }

    return hexParts.join('');
}

/**
 * Convert ArrayBuffer to Base64 string
 *
 * BASE64 ENCODING: Compact representation (3 bytes → 4 characters)
 * Used for: URLs, JSON, email attachments
 *
 * @param {ArrayBuffer} buffer
 * @returns {string} - Base64 string
 */
function arrayBufferToBase64(buffer) {
    const byteArray = new Uint8Array(buffer);
    let binary = '';

    for (let i = 0; i < byteArray.length; i++) {
        binary += String.fromCharCode(byteArray[i]);
    }

    return btoa(binary);
}

/**
 * Count number of different bits between two binary strings
 *
 * AVALANCHE EFFECT MEASUREMENT:
 * Good hash: ~50% bits flip when input changes by 1 bit
 * Bad hash: Few bits flip (correlation between input/output)
 *
 * MATHEMATICAL DEFINITION:
 * Hamming distance: Number of positions where bits differ
 *
 * EXAMPLE:
 *   String 1: 10101010
 *   String 2: 10111011
 *                ^   ^
 *   Hamming distance: 2
 *
 * @param {string} binary1 - First binary string
 * @param {string} binary2 - Second binary string
 * @returns {number} - Hamming distance
 */
function hammingDistance(binary1, binary2) {
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
 * Compute avalanche effect percentage
 *
 * IDEAL VALUE: 50% (maximum diffusion)
 *
 * CRYPTOGRAPHIC SIGNIFICANCE:
 * - < 40%: Poor diffusion (potential weakness)
 * - 40-60%: Acceptable
 * - ~50%: Excellent (indistinguishable from random)
 *
 * @param {string} hash1 - First hash (hex)
 * @param {string} hash2 - Second hash (hex)
 * @returns {Object} - { flipped, total, percentage }
 */
function computeAvalanche(hash1, hash2) {
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
 *
 * USED FOR: Avalanche effect testing
 * User can click to flip individual bits and see hash change
 *
 * @param {string} str - Input string
 * @param {number} bitPosition - Which bit to flip (0-indexed)
 * @returns {string} - Modified string
 */
function flipBit(str, bitPosition) {
    const bytes = new TextEncoder().encode(str);
    const byteIndex = Math.floor(bitPosition / 8);
    const bitIndex = bitPosition % 8;

    if (byteIndex >= bytes.length) {
        throw new Error('Bit position out of range');
    }

    // XOR with mask to flip the bit
    bytes[byteIndex] ^= (1 << bitIndex);

    return new TextDecoder().decode(bytes);
}

/**
 * Generate bit difference visualization
 *
 * CREATES: Array of objects for visual rendering
 * Each bit is marked as 'same' or 'different'
 *
 * @param {string} binary1
 * @param {string} binary2
 * @returns {Array} - [{bit: '0', status: 'same'}, ...]
 */
function generateBitDiff(binary1, binary2) {
    if (binary1.length !== binary2.length) {
        throw new Error('Binary strings must have same length');
    }

    const diff = [];

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
 * Calculate birthday attack probability
 *
 * BIRTHDAY PARADOX:
 * How many random samples before 50% chance of collision?
 * Answer: √(2n) where n is the hash space size
 *
 * FORMULA: P(collision) ≈ 1 - e^(-k²/(2n))
 * - k = number of hash attempts
 * - n = hash space size (2^bits)
 *
 * DERIVATION (for your background):
 * P(no collision) = (n/n) × ((n-1)/n) × ((n-2)/n) × ... × ((n-k+1)/n)
 *                 = ∏[i=0 to k-1] (1 - i/n)
 *                 ≈ e^(-∑[i=0 to k-1] i/n)     [using 1-x ≈ e^(-x)]
 *                 = e^(-(k(k-1))/(2n))
 *                 ≈ e^(-k²/(2n))               [for large k]
 *
 * Therefore: P(collision) = 1 - e^(-k²/(2n))
 *
 * @param {number} hashBits - Hash output size in bits
 * @param {number} attempts - Number of hash computations
 * @returns {number} - Probability (0-1)
 */
function birthdayAttackProbability(hashBits, attempts) {
    // n = 2^hashBits (hash space size)
    // For numerical stability, work in log space

    // For very large hash spaces (e.g., SHA-256), use approximation
    if (hashBits > 100) {
        // Log of probability: ln(P) ≈ -k²/(2n)
        const logN = hashBits * Math.LN2;  // ln(2^hashBits)
        const logProb = -(attempts * attempts) / (2 * Math.exp(logN));

        // If logProb is very negative, probability of collision essentially 1
        if (logProb < -50) return 1;

        return 1 - Math.exp(logProb);
    } else {
        // For smaller hash spaces, direct calculation
        const n = Math.pow(2, hashBits);
        const exponent = -(attempts * attempts) / (2 * n);
        return 1 - Math.exp(exponent);
    }
}

/**
 * Calculate attempts needed for 50% collision probability
 *
 * SOLVE: 1 - e^(-k²/(2n)) = 0.5
 * Result: k ≈ √(2n × ln(2)) ≈ 1.177√n
 *
 * For hash with b bits: k ≈ 1.177 × 2^(b/2)
 *
 * EXAMPLES:
 * - 64-bit hash: ~5 billion attempts (practical on GPU)
 * - 128-bit hash: ~2^64 attempts (infeasible)
 * - 256-bit hash: ~2^128 attempts (impossible)
 *
 * @param {number} hashBits - Hash output size in bits
 * @returns {string} - Formatted number (e.g., "2^64")
 */
function attemptsFor50PercentCollision(hashBits) {
    // Validate against known algorithms
    const validBits = Object.values(Config.ALGORITHMS).map(a => a.outputBits);
    if (!validBits.includes(hashBits)) {
        console.warn(`Unusual hash bit length: ${hashBits}`);
    }
    // k ≈ √(2n × ln(2)) where n = 2^hashBits
    // k ≈ 1.177 × 2^(hashBits/2)

    const exponent = hashBits / 2;

    // For display, show as 2^exponent
    return `2^${exponent.toFixed(1)}`;
}

/**
 * Format large numbers in human-readable form
 *
 * EXAMPLES:
 *   1000 → "1,000"
 *   1000000 → "1 million"
 *   2^80 → "1.2 × 10^24"
 *
 * @param {number} num
 * @returns {string}
 */
function formatLargeNumber(num) {
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
    if (num < 1000000000000) return (num / 1000000000).toFixed(1) + 'B';

    // For very large numbers, use scientific notation
    return num.toExponential(2);
}

/**
 * Constant-time string comparison
 *
 * SECURITY: Prevents timing attacks
 *
 * VULNERABLE CODE (what NOT to do):
 *   for (let i = 0; i < a.length; i++) {
 *       if (a[i] !== b[i]) return false;  // Early exit leaks info!
 *   }
 *
 * SECURE CODE (this function):
 * Always compares all characters, regardless of differences
 *
 * TIME COMPLEXITY: O(n) always, not O(k) where k = position of first diff
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean} - true if equal, false otherwise
 */
function constantTimeCompare(a, b) {
    if (a.length !== b.length) {
        return false;
    }

    let diff = 0;

    for (let i = 0; i < a.length; i++) {
        // XOR characters: 0 if same, non-zero if different
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    // diff === 0 only if all characters matched
    return diff === 0;
}

/**
 * Chunk data for processing large inputs
 *
 * PERFORMANCE: Process large files in chunks to avoid blocking UI
 *
 * @param {string} data - Input data
 * @param {number} chunkSize - Bytes per chunk
 * @returns {Array<string>} - Array of chunks
 */
function chunkData(data, chunkSize = 1024 * 1024) {  // 1MB default
    const chunks = [];

    for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.substring(i, i + chunkSize));
    }

    return chunks;
}

/**
 * Benchmark hash function performance
 *
 * METRICS:
 * - Hashes per second
 * - Megabytes per second
 * - Average time per hash
 *
 * @param {Function} hashFunction - Hash function to benchmark
 * @param {string} input - Test input
 * @param {number} iterations - Number of iterations
 * @returns {Object} - Performance metrics
 */
async function benchmarkHash(hashFunction, input, iterations = 1000) {
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
        await hashFunction(input);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    const hashesPerSecond = (iterations / totalTime) * 1000;

    // Calculate throughput in MB/s
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
 * Validate hash output format
 *
 * CHECK:
 * - Correct length for algorithm
 * - Only valid hex characters
 *
 * @param {string} hash - Hash to validate
 * @param {string} algorithm - Algorithm name
 * @returns {boolean}
 */
function isValidHash(hash, algorithm) {
    const expectedLengths = {
        'md5': 32,      // 128 bits / 4 bits per hex = 32 chars
        'sha1': 40,     // 160 bits / 4 = 40 chars
        'sha256': 64,   // 256 bits / 4 = 64 chars
        'sha384': 96,   // 384 bits / 4 = 96 chars
        'sha512': 128,  // 512 bits / 4 = 128 chars
        'sha3-256': 64,
        'sha3-512': 128
    };

    const expectedLength = expectedLengths[algorithm.toLowerCase()];

    if (!expectedLength) return false;
    if (hash.length !== expectedLength) return false;

    // Check if all characters are valid hex
    return /^[0-9a-f]+$/i.test(hash);
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

const HashUtils = {
    stringToArrayBuffer,
    arrayBufferToHex,
    hexToBinary,
    binaryToHex,
    arrayBufferToBase64,
    hammingDistance,
    computeAvalanche,
    flipBit,
    generateBitDiff,
    birthdayAttackProbability,
    attemptsFor50PercentCollision,
    formatLargeNumber,
        constantTimeCompare,
        chunkData,
        benchmarkHash,
        isValidHash
};

// Make available globally
if (typeof window !== 'undefined') {
    window.HashUtils = HashUtils;
}
