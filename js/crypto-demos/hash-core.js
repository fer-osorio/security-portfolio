/**
 * ============================================================================
 * HASH FUNCTION VISUALIZER - CORE ALGORITHMS
 *
 * This module implements wrappers for various hash algorithms using:
 * 1. Web Crypto API (native browser implementation, hardware-accelerated)
 * 2. CryptoJS library (for algorithms not in Web Crypto API)
 *
 * ALGORITHMS INCLUDED:
 * - MD5 (128-bit, BROKEN - educational only)
 * - SHA-1 (160-bit, DEPRECATED - educational only)
 * - SHA-256 (256-bit, current standard)
 * - SHA-384 (384-bit)
 * - SHA-512 (512-bit)
 * - SHA-3 (Keccak, modern alternative)
 *
 * FOR YOUR BACKGROUND:
 * These are standardized cryptographic hash functions with formal
 * security analyses. MD5 and SHA-1 are broken (collisions found),
 * but included for educational comparison.
 *
 * CONSTRUCTION TYPES:
 * - Merkle-Damgård: MD5, SHA-1, SHA-2 family
 *   └─ Vulnerable to length extension attacks
 * - Sponge: SHA-3 (Keccak)
 *   └─ Not vulnerable to length extension
 *
 * ============================================================================
 */

/**
 * Check if CryptoJS library is loaded
 *
 * CryptoJS provides algorithms not in Web Crypto API (MD5, SHA-3)
 * We load it from CDN in the HTML file
 */
function isCryptoJSAvailable() {
    return typeof CryptoJS !== 'undefined';
}

/**
 * Compute MD5 hash
 *
 * SECURITY STATUS: ⛔ COMPLETELY BROKEN - DO NOT USE
 *
 * HISTORY:
 * - 1991: Designed by Ron Rivest (the "R" in RSA)
 * - 1996: Weaknesses discovered
 * - 2004: First collision found (1 hour on IBM P690)
 * - 2008: Collisions practical (seconds on laptop)
 * - 2012: Flame malware exploited MD5 collision
 *
 * ATTACK COMPLEXITY:
 * - Preimage: 2^128 (still hard)
 * - Collision: 2^21 (trivial!) vs theoretical 2^64
 *
 * WHY INCLUDE IT:
 * Educational value - demonstrate what "broken" means in practice
 *
 * CURRENT USE CASES (non-cryptographic):
 * - Checksums (error detection, not security)
 * - Hash tables (where collisions aren't security issues)
 * - Deduplication (with collision handling)
 *
 * @param {string} input - Input string
 * @returns {Promise<string>} - MD5 hash (hex)
 */
async function md5(input) {
    if (!isCryptoJSAvailable()) {
        throw new Error('CryptoJS library not loaded. Required for MD5.');
    }

    const hash = CryptoJS.MD5(input);
    return hash.toString(CryptoJS.enc.Hex);
}

/**
 * Compute SHA-1 hash
 *
 * SECURITY STATUS: ⚠️ DEPRECATED - Avoid in new systems
 *
 * HISTORY:
 * - 1995: Published by NSA as part of SHA family
 * - 2005: Theoretical collision attack (2^63 vs 2^80)
 * - 2017: Google's SHAttered attack - first practical collision
 *   └─ Cost: $110,000 in compute time
 *   └─ Two PDF files with same SHA-1 but different content
 * - 2020: Chosen-prefix collision attack (even more powerful)
 *
 * ATTACK COMPLEXITY:
 * - Preimage: 2^160 (still hard)
 * - Collision: 2^63 (feasible with resources)
 *
 * CURRENT USAGE:
 * - Git (transitioning to SHA-256)
 * - Legacy TLS certificates (being phased out)
 * - Some old digital signatures
 *
 * RECOMMENDATION: Use SHA-256 or SHA-3 for new applications
 *
 * @param {string} input
 * @returns {Promise<string>} - SHA-1 hash (hex)
 */
async function sha1(input) {
    // Use Web Crypto API (faster, hardware-accelerated)
    const buffer = HashUtils.stringToArrayBuffer(input);
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    return HashUtils.arrayBufferToHex(hashBuffer);
}

/**
 * Compute SHA-256 hash
 *
 * SECURITY STATUS: ✅ SECURE - Current standard
 *
 * SPECIFICATION:
 * - FIPS 180-4 (Federal Information Processing Standard)
 * - Part of SHA-2 family (SHA-224, SHA-256, SHA-384, SHA-512)
 * - Designed by NSA, published 2001
 *
 * CONSTRUCTION: Merkle-Damgård with Davies-Meyer compression
 *
 * PARAMETERS:
 * - Output: 256 bits (32 bytes, 64 hex chars)
 * - Block size: 512 bits
 * - Word size: 32 bits
 * - Rounds: 64
 *
 * SECURITY PROPERTIES:
 * - Preimage resistance: 2^256 operations (computationally infeasible)
 * - Collision resistance: 2^128 operations (birthday bound, still secure)
 * - No known practical attacks as of 2025
 *
 * CURRENT APPLICATIONS:
 * - Bitcoin mining (double SHA-256)
 * - TLS/SSL certificates
 * - Digital signatures (RSA-SHA256, ECDSA-SHA256)
 * - Password hashing (with PBKDF2, though Argon2 preferred)
 * - Git (new default)
 *
 * PERFORMANCE:
 * - Web Crypto API: ~50-100 MB/s (hardware accelerated)
 * - Pure JavaScript: ~5-10 MB/s
 *
 * FOR YOUR BACKGROUND:
 * The compression function uses:
 * - 8 working variables (a, b, c, d, e, f, g, h)
 * - 64 rounds with constants derived from cube roots of first 64 primes
 * - Majority and choice functions (bitwise operations)
 *
 * @param {string} input
 * @returns {Promise<string>} - SHA-256 hash (hex)
 */
async function sha256(input) {
    const buffer = HashUtils.stringToArrayBuffer(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return HashUtils.arrayBufferToHex(hashBuffer);
}

/**
 * Compute SHA-384 hash
 *
 * SECURITY STATUS: ✅ SECURE
 *
 * SPECIFICATION:
 * - Part of SHA-2 family
 * - Truncated version of SHA-512 (first 384 bits)
 * - Uses 64-bit words (vs 32-bit in SHA-256)
 *
 * WHY USE SHA-384:
 * - Higher security margin than SHA-256
 * - Faster than SHA-512 on 64-bit systems
 * - Used in TLS 1.2+ cipher suites
 *
 * @param {string} input
 * @returns {Promise<string>} - SHA-384 hash (hex)
 */
async function sha384(input) {
    const buffer = HashUtils.stringToArrayBuffer(input);
    const hashBuffer = await crypto.subtle.digest('SHA-384', buffer);
    return HashUtils.arrayBufferToHex(hashBuffer);
}

/**
 * Compute SHA-512 hash
 *
 * SECURITY STATUS: ✅ SECURE
 *
 * SPECIFICATION:
 * - Output: 512 bits (64 bytes, 128 hex chars)
 * - Block size: 1024 bits
 * - Word size: 64 bits
 * - Rounds: 80
 *
 * ADVANTAGES:
 * - Highest security margin in SHA-2 family
 * - Faster than SHA-256 on 64-bit processors (larger words)
 * - Used in password hashing (PBKDF2-HMAC-SHA512)
 *
 * DISADVANTAGE:
 * - Larger output (128 hex chars vs 64 for SHA-256)
 *
 * @param {string} input
 * @returns {Promise<string>} - SHA-512 hash (hex)
 */
async function sha512(input) {
    const buffer = HashUtils.stringToArrayBuffer(input);
    const hashBuffer = await crypto.subtle.digest('SHA-512', buffer);
    return HashUtils.arrayBufferToHex(hashBuffer);
}

/**
 * Compute SHA-3 (Keccak) hash
 *
 * SECURITY STATUS: ✅ SECURE - Modern alternative to SHA-2
 *
 * HISTORY:
 * - 2007-2012: NIST SHA-3 competition (51 submissions)
 * - 2012: Keccak selected as winner
 * - 2015: Standardized as FIPS 202
 *
 * CONSTRUCTION: Sponge construction (completely different from SHA-2)
 *
 * ADVANTAGES OVER SHA-2:
 * 1. Different design (not vulnerable if SHA-2 breaks)
 * 2. Immune to length extension attacks
 * 3. Flexible output length
 * 4. Elegant mathematical structure (permutations on state)
 *
 * SPONGE CONSTRUCTION:
 * 1. Absorbing phase: XOR input blocks into state
 * 2. Squeezing phase: Extract output from state
 *
 * STATE: 1600 bits = 5×5 array of 64-bit lanes
 *
 * FOR YOUR BACKGROUND:
 * Keccak uses permutations (θ, ρ, π, χ, ι) on the state.
 * These are invertible transformations ensuring diffusion.
 * The security argument is different from Merkle-Damgård:
 * based on indifferentiability from random oracle.
 *
 * CURRENT USAGE:
 * - Ethereum (modified Keccak-256)
 * - Post-quantum cryptography signatures
 * - Alternative to SHA-2 in new protocols
 *
 * @param {string} input
 * @param {number} outputBits - Output size (224, 256, 384, or 512)
 * @returns {Promise<string>} - SHA-3 hash (hex)
 */
async function sha3(input, outputBits = 256) {
    if (!isCryptoJSAvailable()) {
        throw new Error('CryptoJS library not loaded. Required for SHA-3.');
    }

    let hash;

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
        default:
            throw new Error('Invalid output size for SHA-3. Use 224, 256, 384, or 512.');
    }

    return hash.toString(CryptoJS.enc.Hex);
}

/**
 * Compute HMAC (Hash-based Message Authentication Code)
 *
 * PURPOSE: Authenticate messages with a shared secret key
 *
 * SECURITY GUARANTEE:
 * Without the key, attacker cannot forge valid HMAC,
 * even if they can see many (message, HMAC) pairs
 *
 * CONSTRUCTION (RFC 2104):
 * HMAC(K, m) = H((K ⊕ opad) || H((K ⊕ ipad) || m))
 *
 * WHERE:
 * - K = secret key (padded to block size)
 * - m = message
 * - H = underlying hash function (e.g., SHA-256)
 * - ipad = 0x36 repeated (inner padding)
 * - opad = 0x5c repeated (outer padding)
 * - || = concatenation
 * - ⊕ = XOR
 *
 * WHY THIS CONSTRUCTION:
 * - Nested hashing prevents length extension attacks
 * - XOR with pads provides key separation
 * - Two hash calls ensure security even if H is weakened
 *
 * SECURITY PROPERTIES:
 * - Unforgeability: Cannot create valid HMAC without key
 * - Pseudorandomness: Output looks random even with known messages
 * - Resistant to length extension (unlike simple H(key || message))
 *
 * APPLICATIONS:
 * - API authentication (HMAC-SHA256 signatures)
 * - TLS handshake (PRF uses HMAC)
 * - JWT tokens (HS256, HS384, HS512)
 * - Password reset tokens
 *
 * FOR YOUR BACKGROUND:
 * The security of HMAC relies on the collision resistance and
 * pseudorandom properties of the underlying hash H. The nested
 * construction is provably secure if H is a pseudorandom function.
 *
 * @param {string} key - Secret key
 * @param {string} message - Message to authenticate
 * @param {string} algorithm - Hash algorithm ('SHA-256', 'SHA-512', etc.)
 * @returns {Promise<string>} - HMAC (hex)
 */
async function hmac(key, message, algorithm = 'SHA-256') {
    // Import key for HMAC
    const keyBuffer = HashUtils.stringToArrayBuffer(key);
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'HMAC', hash: algorithm },
        false,
        ['sign']
    );

    // Compute HMAC
    const messageBuffer = HashUtils.stringToArrayBuffer(message);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBuffer);

    return HashUtils.arrayBufferToHex(signature);
}

/**
 * Unified hash function interface
 *
 * WRAPPER: Single function to compute any supported hash
 *
 * @param {string} input - Input string
 * @param {string} algorithm - Algorithm name
 * @returns {Promise<string>} - Hash (hex)
 */
async function computeHash(input, algorithm) {
    switch (algorithm.toLowerCase()) {
        case 'md5':
            return await md5(input);
        case 'sha1':
        case 'sha-1':
            return await sha1(input);
        case 'sha256':
        case 'sha-256':
            return await sha256(input);
        case 'sha384':
        case 'sha-384':
            return await sha384(input);
        case 'sha512':
        case 'sha-512':
            return await sha512(input);
        case 'sha3-256':
            return await sha3(input, 256);
        case 'sha3-384':
            return await sha3(input, 384);
        case 'sha3-512':
            return await sha3(input, 512);
        default:
            throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
}

/**
 * Get algorithm information
 *
 * METADATA: Properties and security status of each algorithm
 *
 * @param {string} algorithm
 * @returns {Object} - Algorithm details
 */
function getAlgorithmInfo(algorithm) {
    const info = {
        'md5': {
            name: 'MD5',
            outputBits: 128,
            blockSize: 512,
            security: 'BROKEN',
            status: '⛔',
            year: 1991,
            designer: 'Ron Rivest',
            usage: 'Educational only - DO NOT USE for security',
            vulnerability: 'Practical collision attacks (2^21 complexity)'
        },
        'sha1': {
            name: 'SHA-1',
            outputBits: 160,
            blockSize: 512,
            security: 'DEPRECATED',
            status: '⚠️',
            year: 1995,
            designer: 'NSA',
            usage: 'Legacy systems only',
            vulnerability: 'Collision attack demonstrated (2017 SHAttered)'
        },
        'sha256': {
            name: 'SHA-256',
            outputBits: 256,
            blockSize: 512,
            security: 'SECURE',
            status: '✅',
            year: 2001,
            designer: 'NSA',
            usage: 'Current standard - Bitcoin, TLS, certificates',
            vulnerability: 'None known'
        },
        'sha384': {
            name: 'SHA-384',
            outputBits: 384,
            blockSize: 1024,
            security: 'SECURE',
            status: '✅',
            year: 2001,
            designer: 'NSA',
            usage: 'High security applications',
            vulnerability: 'None known'
        },
        'sha512': {
            name: 'SHA-512',
            outputBits: 512,
            blockSize: 1024,
            security: 'SECURE',
            status: '✅',
            year: 2001,
            designer: 'NSA',
            usage: 'Maximum security, password hashing',
            vulnerability: 'None known'
        },
        'sha3-256': {
            name: 'SHA3-256',
            outputBits: 256,
            blockSize: 1088,
            security: 'SECURE',
            status: '✅',
            year: 2015,
            designer: 'Keccak team',
            usage: 'Modern alternative to SHA-2, Ethereum',
            vulnerability: 'None known'
        },
        'sha3-512': {
            name: 'SHA3-512',
            outputBits: 512,
            blockSize: 576,
            security: 'SECURE',
            status: '✅',
            year: 2015,
            designer: 'Keccak team',
            usage: 'High security SHA-3 variant',
            vulnerability: 'None known'
        }
    };

    return info[algorithm.toLowerCase()] || null;
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

const HashCore = {
    md5,
    sha1,
    sha256,
    sha384,
    sha512,
    sha3,
    hmac,
    computeHash,
    getAlgorithmInfo,
    isCryptoJSAvailable
};

// Make available globally
if (typeof window !== 'undefined') {
    window.HashCore = HashCore;
}
