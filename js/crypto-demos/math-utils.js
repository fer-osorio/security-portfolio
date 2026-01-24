/**
 * ============================================================================
 * RSA CRYPTOSYSTEM - MATHEMATICAL UTILITIES
 *
 * This module contains the core mathematical operations needed for RSA.
 * All functions use JavaScript BigInt for arbitrary-precision arithmetic.
 *
 * MATHEMATICAL FOUNDATION:
 * RSA relies on number theory, particularly:
 * - Modular arithmetic (Z/nZ)
 * - Euler's totient function φ(n)
 * - Fermat's Little Theorem / Euler's Theorem
 * - Extended Euclidean Algorithm
 *
 * Performance is ~50-100x slower than optimized
 * C++, but sufficient for educational demonstrations.
 *
 * ============================================================================
 */

/**
 * Greatest Common Divisor (GCD) - Euclidean Algorithm
 *
 * MATHEMATICAL DEFINITION:
 * gcd(a, b) = largest positive integer that divides both a and b
 *
 * ALGORITHM: Euclidean Algorithm
 * Based on: gcd(a, b) = gcd(b, a mod b)
 * Terminates when b = 0, then gcd(a, 0) = a
 *
 * TIME COMPLEXITY: O(log min(a, b))
 *
 * EXAMPLE:
 *   gcd(48, 18)
 *   = gcd(18, 48 mod 18) = gcd(18, 12)
 *   = gcd(12, 18 mod 12) = gcd(12, 6)
 *   = gcd(6, 12 mod 6) = gcd(6, 0)
 *   = 6
 *
 * @param {BigInt} a - First integer
 * @param {BigInt} b - Second integer
 * @returns {BigInt} - GCD of a and b
 */
function gcd(a, b) {
    // Ensure we work with positive values
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;

    // Euclidean algorithm: iterative version (tail-recursive)
    while (b !== 0n) {
        const temp = b;
        b = a % b;
        a = temp;
    }

    return a;
}

/**
 * Extended Euclidean Algorithm
 *
 * MATHEMATICAL FOUNDATION:
 * For integers a, b, finds integers x, y such that:
 *   ax + by = gcd(a, b)  (Bézout's identity)
 *
 * This is CRITICAL for RSA because we need to find the modular inverse:
 *   d ≡ e^(-1) (mod φ(n))
 * Which is equivalent to finding d such that:
 *   ed ≡ 1 (mod φ(n))
 *   ed = 1 + k·φ(n) for some integer k
 *   ed - k·φ(n) = 1
 *
 * This is Bézout's identity with gcd(e, φ(n)) = 1
 *
 * ALGORITHM:
 * Extends Euclidean algorithm by tracking coefficients at each step
 *
 * @param {BigInt} a
 * @param {BigInt} b
 * @returns {Object} { gcd, x, y } where ax + by = gcd
 */
function extendedGCD(a, b) {
    // Base case: gcd(a, 0) = a, with coefficients x=1, y=0
    // Since a·1 + 0·0 = a
    if (b === 0n) {
        return { gcd: a, x: 1n, y: 0n };
    }

    // Recursive case: compute gcd(b, a mod b)
    const result = extendedGCD(b, a % b);

    // Back-substitution to find coefficients
    // If bx' + (a mod b)y' = gcd
    // Then bx' + (a - ⌊a/b⌋·b)y' = gcd
    // Therefore: a·y' + b·(x' - ⌊a/b⌋·y') = gcd
    const x = result.y;
    const y = result.x - (a / b) * result.y;

    return { gcd: result.gcd, x, y };
}

/**
 * Modular Multiplicative Inverse
 *
 * MATHEMATICAL DEFINITION:
 * For a ∈ Z/nZ, find a^(-1) such that:
 *   a · a^(-1) ≡ 1 (mod n)
 *
 * EXISTS if and only if gcd(a, n) = 1 (a and n are coprime)
 *
 * RSA APPLICATION:
 * We need d = e^(-1) mod φ(n)
 * This means: e·d ≡ 1 (mod φ(n))
 *
 * ALGORITHM:
 * Use Extended Euclidean Algorithm:
 *   ax + ny = gcd(a, n) = 1
 * Then x is the modular inverse (taken mod n)
 *
 * @param {BigInt} a - Element to invert
 * @param {BigInt} n - Modulus
 * @returns {BigInt} - Modular inverse, or null if doesn't exist
 */
function modInverse(a, n) {
    const result = extendedGCD(a, n);

    // Inverse exists only if gcd(a, n) = 1
    if (result.gcd !== 1n) {
        return null;  // No inverse exists
    }

    // Ensure result is positive (in range [0, n))
    // JavaScript's modulo can return negative values
    let inverse = result.x % n;
    if (inverse < 0n) {
        inverse += n;
    }

    return inverse;
}

/**
 * Modular Exponentiation (Binary Method / Square-and-Multiply)
 *
 * PROBLEM: Compute base^exponent mod modulus
 * NAÏVE APPROACH: Compute base^exponent, then take mod
 * WHY IT FAILS: base^exponent becomes astronomically large
 *
 * EXAMPLE: 2^1000 mod 17
 *   2^1000 has ~301 digits! Impossible to compute directly.
 *
 * SOLUTION: Use the property (a·b) mod n = ((a mod n)·(b mod n)) mod n
 * Take modulo at each step to keep numbers manageable.
 *
 * ALGORITHM: Binary Exponentiation (Square-and-Multiply)
 *
 * Express exponent in binary: exp = ∑ bᵢ·2^i where bᵢ ∈ {0,1}
 * Then: base^exp = base^(∑ bᵢ·2^i) = ∏ base^(bᵢ·2^i)
 *
 * EXAMPLE: 3^13 mod 7
 *   13 = 1101₂ = 8 + 4 + 1
 *   3^13 = 3^8 · 3^4 · 3^1
 *
 *   i=0: result=1, base=3
 *   i=1: bit=1, result = 1·3 = 3 mod 7 = 3, base = 3² = 9 mod 7 = 2
 *   i=2: bit=0, result = 3, base = 2² = 4 mod 7 = 4
 *   i=3: bit=1, result = 3·4 = 12 mod 7 = 5, base = 4² = 16 mod 7 = 2
 *   i=4: bit=1, result = 5·2 = 10 mod 7 = 3, base = 2² = 4 mod 7 = 4
 *
 *   Result: 3
 *
 * TIME COMPLEXITY: O(log exponent) multiplications
 * SPACE COMPLEXITY: O(1)
 *
 * SECURITY NOTE:
 * This implementation is NOT constant-time (see timing attack section).
 * The number of multiplications depends on the Hamming weight of the exponent.
 * For educational purposes, we'll use this simple version first.
 *
 * @param {BigInt} base - Base
 * @param {BigInt} exponent - Exponent (≥ 0)
 * @param {BigInt} modulus - Modulus
 * @returns {BigInt} - base^exponent mod modulus
 */
function modPow(base, exponent, modulus) {
    // Edge cases
    if (modulus === 1n) return 0n;
    if (exponent === 0n) return 1n;
    if (exponent === 1n) return base % modulus;

    // Ensure base is in range [0, modulus)
    base = base % modulus;

    let result = 1n;
    let currentBase = base;
    let currentExponent = exponent;

    // Process each bit of the exponent (right to left)
    while (currentExponent > 0n) {
        // If current bit is 1, multiply result by current base
        if (currentExponent % 2n === 1n) {
            result = (result * currentBase) % modulus;
        }

        // Square the base for next bit position
        currentBase = (currentBase * currentBase) % modulus;

        // Shift to next bit (divide by 2)
        currentExponent = currentExponent / 2n;
    }

    return result;
}

/**
 * Modular Exponentiation (Constant-Time Version)
 *
 * SECURITY IMPROVEMENT:
 * The previous modPow leaks information through timing:
 *   - Number of multiplications depends on Hamming weight of exponent
 *   - Attacker can measure timing and infer bits of private exponent d
 *
 * SOLUTION: Montgomery Ladder / Constant-time exponentiation
 * Always perform the same operations regardless of bit values.
 *
 * ALGORITHM:
 * Maintain two values: R0 and R1
 * At each bit:
 *   - If bit is 0: R0 = R0², R1 = R0·R1
 *   - If bit is 1: R0 = R0·R1, R1 = R1²
 *
 * This ensures:
 *   - Same number of operations regardless of bit pattern
 *   - Same memory access pattern
 *   - Resistant to timing attacks
 *
 * CAVEAT: JavaScript itself may not be constant-time due to:
 *   - JIT compilation optimizations
 *   - Garbage collection pauses
 *   - Branch prediction
 * But this is still better than the naive version.
 *
 * @param {BigInt} base
 * @param {BigInt} exponent
 * @param {BigInt} modulus
 * @returns {BigInt}
 */
function modPowConstantTime(base, exponent, modulus) {
    if (modulus === 1n) return 0n;
    if (exponent === 0n) return 1n;

    base = base % modulus;

    // Convert exponent to binary string (for bit iteration)
    const expBinary = exponent.toString(2);
    const bitLength = expBinary.length;

    // Initialize Montgomery ladder
    let R0 = 1n;  // Represents base^0
    let R1 = base; // Represents base^1

    // Process each bit from left to right (most significant to least)
    for (let i = 1; i < bitLength; i++) {
        const bit = expBinary[i];

        if (bit === '0') {
            // R0 = R0², R1 = R0·R1
            R1 = (R0 * R1) % modulus;
            R0 = (R0 * R0) % modulus;
        } else {
            // R0 = R0·R1, R1 = R1²
            R0 = (R0 * R1) % modulus;
            R1 = (R1 * R1) % modulus;
        }
    }

    return R0;
}

/**
 * Check if two numbers are coprime (gcd = 1)
 *
 * MATHEMATICAL DEFINITION:
 * Two integers a and b are coprime (relatively prime) if gcd(a, b) = 1
 *
 * RSA APPLICATION:
 * We need gcd(e, φ(n)) = 1 to ensure e has a modular inverse.
 *
 * @param {BigInt} a
 * @param {BigInt} b
 * @returns {Boolean} - true if coprime, false otherwise
 */
function areCoprime(a, b) {
    return gcd(a, b) === 1n;
}

/**
 * Euler's Totient Function φ(n)
 *
 * MATHEMATICAL DEFINITION:
 * φ(n) = count of integers in [1, n] that are coprime to n
 *
 * SPECIAL CASE (RSA uses this):
 * If n = p·q where p, q are distinct primes, then:
 *   φ(n) = φ(p)·φ(q) = (p-1)·(q-1)
 *
 * WHY: For prime p, φ(p) = p-1 (all integers 1..p-1 are coprime to p)
 *
 * EXAMPLE:
 *   φ(9) = φ(3²) = 6  (numbers coprime to 9: 1,2,4,5,7,8)
 *   φ(15) = φ(3·5) = φ(3)·φ(5) = 2·4 = 8
 *
 * @param {BigInt} p - Prime factor
 * @param {BigInt} q - Prime factor
 * @returns {BigInt} - φ(p·q) = (p-1)(q-1)
 */
function eulerTotient(p, q) {
    return (p - 1n) * (q - 1n);
}

/**
 * Convert string to BigInt (for encryption)
 *
 * APPROACH: Treat string as a number in base 256
 * Each character's ASCII value becomes a "digit"
 *
 * EXAMPLE: "Hi"
 *   'H' = 72, 'i' = 105
 *   Number = 72·256 + 105 = 18537
 *
 * LIMITATION: Message must be smaller than modulus n
 * This is why real RSA uses padding schemes (OAEP)
 *
 * @param {String} str - Input string
 * @returns {BigInt} - Numeric representation
 */
function stringToBigInt(str) {
    let result = 0n;

    for (let i = 0; i < str.length; i++) {
        const charCode = BigInt(str.charCodeAt(i));
        result = result * 256n + charCode;
    }

    return result;
}

/**
 * Convert BigInt back to string (for decryption)
 *
 * INVERSE OPERATION: Extract base-256 digits
 *
 * @param {BigInt} num - Numeric representation
 * @returns {String} - Recovered string
 */
function bigIntToString(num) {
    if (num === 0n) return '\0';

    const chars = [];
    let remaining = num;

    while (remaining > 0n) {
        const charCode = Number(remaining % 256n);
        chars.unshift(String.fromCharCode(charCode));
        remaining = remaining / 256n;
    }

    return chars.join('');
}

/**
 * Get bit length of a BigInt
 *
 * USEFUL FOR: Determining key size, validating message size
 *
 * @param {BigInt} n
 * @returns {Number} - Number of bits
 */
function bitLength(n) {
    if (n === 0n) return 0;
    return n.toString(2).length;
}

/**
 * Generate a random BigInt with specified bit length
 *
 * SECURITY: Uses Web Crypto API for cryptographically secure randomness
 *
 * APPROACH:
 * 1. Generate random bytes using window.crypto.getRandomValues()
 * 2. Convert bytes to BigInt
 * 3. Ensure it has exactly the requested bit length
 *
 * @param {Number} bits - Desired bit length
 * @returns {BigInt} - Random number with 'bits' bits
 */
function randomBigInt(bits) {
    // Number of bytes needed (round up)
    const bytes = Math.ceil(bits / 8);

    // Generate random bytes
    const randomBytes = new Uint8Array(bytes);
    window.crypto.getRandomValues(randomBytes);

    // Convert to BigInt
    let result = 0n;
    for (let i = 0; i < bytes; i++) {
        result = (result << 8n) | BigInt(randomBytes[i]);
    }

    // Ensure result has exactly 'bits' bits by setting MSB
    // This prevents getting numbers with fewer bits
    const mask = 1n << BigInt(bits - 1);
    result = result | mask;

    // Ensure result fits in 'bits' bits (clear any overflow)
    const maxValue = (1n << BigInt(bits)) - 1n;
    result = result & maxValue;

    return result;
}

/**
 * Checks divisibility by small primes
 *
 * PURPOSE: Quick elimination of obviously composite numbers
 *
 * @param {BigInt} num - Number to test
 * @returns Boolean - Test result
 */
function isDivisibleBySmallPrime(num) {
    smallPrimes = Config.SMALL_PRIMES;
    // Quick check: divisible by small primes?
    for (const p of smallPrimes) {
        if (num % BigInt(p) === 0n && num !== BigInt(p)) {
            return true;
        }
    }
    return false;
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

// For use in other modules
const MathUtils = {
    gcd,
    extendedGCD,
    modInverse,
    modPow,
    modPowConstantTime,
    areCoprime,
    eulerTotient,
    stringToBigInt,
    bigIntToString,
    bitLength,
    randomBigInt,
    isDivisibleBySmallPrime
};

// Make available globally (for browser environment)
if (typeof window !== 'undefined') {
    window.MathUtils = MathUtils;
}
