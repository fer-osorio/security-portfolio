/**
 * ============================================================================
 * RSA CRYPTOSYSTEM - CORE IMPLEMENTATION
 *
 * MATHEMATICAL FOUNDATION:
 * RSA (Rivest-Shamir-Adleman, 1977) is based on the hardness of factoring:
 *
 * KEY GENERATION:
 * 1. Choose two large primes p, q
 * 2. Compute n = p·q (modulus)
 * 3. Compute φ(n) = (p-1)(q-1) (Euler's totient)
 * 4. Choose e such that gcd(e, φ(n)) = 1 (public exponent)
 * 5. Compute d = e^(-1) mod φ(n) (private exponent)
 *
 * Public key: (e, n)
 * Private key: (d, n)
 *
 * ENCRYPTION: c = m^e mod n
 * DECRYPTION: m = c^d mod n
 *
 * SECURITY: Based on difficulty of factoring n = p·q
 * If attacker factors n → finds p, q → computes φ(n) → computes d
 *
 * FOR YOUR BACKGROUND:
 * You know the theory. This implements it in JavaScript with careful
 * attention to implementation security (timing attacks, weak key detection).
 *
 * ============================================================================
 */

/**
 * Miller-Rabin Primality Test
 *
 * PROBLEM: Deterministically checking if n is prime takes O(√n) time
 * For 1024-bit numbers, this is computationally infeasible.
 *
 * SOLUTION: Probabilistic primality test
 * If test says "composite", n is definitely composite.
 * If test says "probably prime", n is prime with high probability.
 *
 * MATHEMATICAL FOUNDATION:
 * For prime p and a not divisible by p:
 *   a^(p-1) ≡ 1 (mod p)  [Fermat's Little Theorem]
 *
 * Miller-Rabin strengthens this by considering the factorization:
 *   n - 1 = 2^r · d  where d is odd
 *
 * For prime n, one of these must hold for random witness a:
 *   1. a^d ≡ 1 (mod n), or
 *   2. a^(2^i · d) ≡ -1 (mod n) for some 0 ≤ i < r
 *
 * If neither holds, n is composite.
 *
 * ERROR PROBABILITY:
 * - One round: ≤ 1/4 (proven)
 * - k rounds: ≤ (1/4)^k
 * - 40 rounds: ≤ 2^(-80) (cryptographically negligible)
 *
 * ALGORITHM:
 * 1. Write n-1 = 2^r · d where d is odd
 * 2. For k witnesses a:
 *    a. Compute x = a^d mod n
 *    b. If x = 1 or x = n-1, continue to next witness
 *    c. Repeat r-1 times: x = x^2 mod n
 *       If x = n-1, continue to next witness
 *    d. If we reach here, n is composite
 * 3. If all witnesses pass, n is probably prime
 *
 * @param {BigInt} n - Number to test
 * @param {Number} rounds - Number of witnesses (default: 40)
 * @returns {Boolean} - true if probably prime, false if definitely composite
 */
function millerRabin(n, rounds = Config.RSA.PRIMALITY_TEST_ROUNDS) {
    // Handle small cases
    if (n <= 1n) return false;
    if (n <= 3n) return true;
    if (n % 2n === 0n) return false;  // Even numbers (except 2) are composite

    // Write n-1 as 2^r · d where d is odd
    let r = 0n;
    let d = n - 1n;
    while (d % 2n === 0n) {
        r++;
        d = d / 2n;
    }

    // Perform Miller-Rabin test with multiple witnesses
    witnessLoop: for (let i = 0; i < rounds; i++) {
        // Choose random witness a in range [2, n-2]
        const a = randomWitness(n);

        // Compute x = a^d mod n
        let x = MathUtils.modPow(a, d, n);

        // If x = 1 or x = n-1, this witness passes
        if (x === 1n || x === n - 1n) {
            continue witnessLoop;
        }

        // Square x repeatedly (r-1 times)
        for (let j = 0n; j < r - 1n; j++) {
            x = MathUtils.modPow(x, 2n, n);

            // If x = n-1, this witness passes
            if (x === n - 1n) {
                continue witnessLoop;
            }
        }

        // If we reach here, n is definitely composite
        return false;
    }

    // All witnesses passed: n is probably prime
    return true;
}

/**
 * Generate random witness for Miller-Rabin test
 *
 * @param {BigInt} n - Number being tested
 * @returns {BigInt} - Random witness in range [2, n-2]
 */
function randomWitness(n) {
    const bitLen = MathUtils.bitLength(n);
    let witness;

    do {
        witness = MathUtils.randomBigInt(bitLen);
    } while (witness < 2n || witness >= n - 1n);

    return witness;
}

/**
 * Generate a random prime number
 *
 * APPROACH: Generate-and-Test
 * 1. Generate random odd number of desired bit length
 * 2. Test with Miller-Rabin
 * 3. If composite, try next odd number
 * 4. Repeat until prime is found
 *
 * OPTIMIZATION: Check divisibility by small primes first
 * This eliminates ~80% of candidates before expensive Miller-Rabin test
 *
 * EXPECTED NUMBER OF ATTEMPTS:
 * Prime Number Theorem: π(n) ≈ n / ln(n)
 * Density of primes near n-bit number: ~1 / (n·ln(2))
 * For 512-bit primes: ~1/355, so expect ~355 candidates
 *
 * TIME ESTIMATE:
 * - 512-bit: ~100-500ms
 * - 1024-bit: ~500-2000ms
 * - 2048-bit: ~2-10 seconds
 *
 * @param {Number} bits - Desired bit length
 * @param {Function} progressCallback - Optional callback(attempt, isPrime)
 * @returns {BigInt} - Random prime number
 */
async function generatePrime(bits, progressCallback = null) {
    // Small primes for trial division (optimization)
    const smallPrimes = Config.RSA.SMALL_PRIMES

    let attempts = 0;

    while (true) {
        attempts++;

        // Generate random odd number with 'bits' bits
        let candidate = MathUtils.randomBigInt(bits);

        // Ensure it's odd (required for primes > 2)
        if (candidate % 2n === 0n) {
            candidate = candidate + 1n;
        }

        // Quick check: divisible by small primes?
        let divisibleBySmallPrime = false;
        for (const p of smallPrimes) {
            if (candidate % BigInt(p) === 0n && candidate !== BigInt(p)) {
                divisibleBySmallPrime = true;
                break;
            }
        }

        if (divisibleBySmallPrime) {
            if (progressCallback) progressCallback(attempts, false);
            continue;
        }

        // Miller-Rabin primality test (expensive)
        const isPrime = millerRabin(candidate);

        if (progressCallback) progressCallback(attempts, isPrime);

        if (isPrime) {
            console.log(`Found prime after ${attempts} attempts`);
            return candidate;
        }

        // Allow UI to update (don't block event loop)
        // This is crucial for keeping the UI responsive
        if (attempts % 10 === 0) {
            await sleep(0);  // Yield to event loop
        }
    }
}

/**
 * Sleep utility (for yielding to event loop)
 *
 * @param {Number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate RSA key pair
 *
 * ALGORITHM:
 * 1. Generate two distinct primes p and q
 * 2. Compute n = p·q (modulus)
 * 3. Compute φ(n) = (p-1)(q-1)
 * 4. Choose e (typically 65537 for efficiency)
 * 5. Verify gcd(e, φ(n)) = 1
 * 6. Compute d = e^(-1) mod φ(n)
 *
 * KEY SIZE SELECTION:
 * - n has 'bits' bits (e.g., 2048 bits)
 * - p and q each have bits/2 bits (e.g., 1024 bits each)
 * - This ensures n = p·q has the desired bit length
 *
 * PUBLIC EXPONENT CHOICE:
 * Standard choice: e = 65537 = 2^16 + 1
 * WHY:
 * - Large enough to resist attacks (e.g., small exponent attack)
 * - Has only two 1-bits in binary (10000000000000001₂)
 * - Makes encryption fast (only 17 multiplications)
 *
 * SECURITY CHECKS:
 * - Ensure p ≠ q (distinct primes)
 * - Ensure |p - q| is large (prevents Fermat factorization)
 * - Ensure gcd(e, φ(n)) = 1 (d exists)
 *
 * @param {Number} bits - Key size in bits (512, 1024, 2048, etc.)
 * @param {Function} progressCallback - Optional callback(stage, data)
 * @returns {Object} { publicKey: {e, n}, privateKey: {d, n}, p, q, phi }
 */
async function generateKeyPair(bits = 2048, progressCallback = null) {
    console.log(`Generating ${bits}-bit RSA key pair...`);

    const halfBits = Math.floor(bits / 2);

    // STEP 1: Generate prime p
    if (progressCallback) progressCallback('Generating prime p', null);
    const p = await generatePrime(halfBits, (attempt, isPrime) => {
        if (progressCallback) progressCallback('Generating prime p', { attempt, isPrime });
    });
    console.log(`Generated p (${MathUtils.bitLength(p)} bits)`);

    // STEP 2: Generate prime q (distinct from p)
    if (progressCallback) progressCallback('Generating prime q', null);
    let q;
    do {
        q = await generatePrime(halfBits, (attempt, isPrime) => {
            if (progressCallback) progressCallback('Generating prime q', { attempt, isPrime });
        });
    } while (q === p);  // Ensure p ≠ q
    console.log(`Generated q (${MathUtils.bitLength(q)} bits)`);

    // SECURITY CHECK: Ensure |p - q| is sufficiently large
    // If p and q are too close, Fermat factorization can factor n efficiently
    const diff = p > q ? p - q : q - p;
    const minDiff = 1n << BigInt(halfBits - 10);  // At least 2^(halfBits-10) difference

    if (diff < Config.RSA.MIN_PQ_DIFFERENCE_BITS) {
        console.warn('p and q are too close, regenerating...');
        return generateKeyPair(bits, progressCallback);  // Retry
    }

    // STEP 3: Compute n = p·q (modulus)
    if (progressCallback) progressCallback('Computing modulus n', null);
    const n = p * q;
    console.log(`Modulus n: ${MathUtils.bitLength(n)} bits`);

    // STEP 4: Compute φ(n) = (p-1)(q-1)
    if (progressCallback) progressCallback('Computing φ(n)', null);
    const phi = MathUtils.eulerTotient(p, q);

    // STEP 5: Public exponent e
    const e = BigInt(Config.RSA.PUBLIC_EXPONENT);

    // Verify gcd(e, φ(n)) = 1
    if (!MathUtils.areCoprime(e, phi)) {
        console.error('e and φ(n) are not coprime! Regenerating keys...');
        return generateKeyPair(bits, progressCallback);  // Retry
    }

    // STEP 6: Compute private exponent d = e^(-1) mod φ(n)
    if (progressCallback) progressCallback('Computing private exponent d', null);
    const d = MathUtils.modInverse(e, phi);

    if (d === null) {
        console.error('Failed to compute modular inverse! Regenerating keys...');
        return generateKeyPair(bits, progressCallback);  // Retry
    }

    // VERIFICATION: Check that e·d ≡ 1 (mod φ(n))
    const verification = (e * d) % phi;
    if (verification !== 1n) {
        console.error('Key generation verification failed!');
        return generateKeyPair(bits, progressCallback);  // Retry
    }

    console.log('Key generation complete!');

    if (progressCallback) progressCallback('Complete', null);

    return {
        publicKey: { e, n },
        privateKey: { d, n },
        // Include p, q, phi for educational purposes (NEVER do this in production!)
        p,
        q,
        phi
    };
}

/**
 * RSA Encryption
 *
 * MATHEMATICAL OPERATION: c = m^e mod n
 *
 * INPUT: Plaintext message m (as BigInt)
 * OUTPUT: Ciphertext c (as BigInt)
 *
 * CONSTRAINTS:
 * - 0 ≤ m < n (message must be smaller than modulus)
 * - If m ≥ n, encryption is ambiguous (m mod n loses information)
 *
 * SECURITY NOTE:
 * This is "textbook RSA" (raw modular exponentiation).
 * PROBLEMS:
 * - Deterministic (same message → same ciphertext)
 * - Malleable (attacker can manipulate ciphertext)
 * - Small message space (can precompute encryptions)
 *
 * REAL-WORLD FIX: Use padding scheme (OAEP, PKCS#1 v1.5)
 * We'll implement OAEP in Phase 2.
 *
 * @param {BigInt} message - Plaintext (as number)
 * @param {Object} publicKey - {e, n}
 * @returns {BigInt} - Ciphertext
 */
function encrypt(message, publicKey) {
    const { e, n } = publicKey;

    // Validate message size
    if (message >= n) {
        throw new Error(`Message too large! Message must be < modulus n.\nMessage: ${message}\nModulus: ${n}`);
    }

    if (message < 0n) {
        throw new Error('Message must be non-negative');
    }

    // Perform encryption: c = m^e mod n
    const ciphertext = MathUtils.modPow(message, e, n);

    return ciphertext;
}

/**
 * RSA Decryption
 *
 * MATHEMATICAL OPERATION: m = c^d mod n
 *
 * CORRECTNESS PROOF:
 * We want to show: (m^e)^d ≡ m (mod n)
 *
 * By Euler's Theorem: a^φ(n) ≡ 1 (mod n) for gcd(a,n) = 1
 *
 * Since e·d ≡ 1 (mod φ(n)), we have:
 *   e·d = 1 + k·φ(n) for some integer k
 *
 * Therefore:
 *   (m^e)^d = m^(e·d) = m^(1 + k·φ(n)) = m · (m^φ(n))^k ≡ m · 1^k ≡ m (mod n)
 *
 * @param {BigInt} ciphertext - Ciphertext (as number)
 * @param {Object} privateKey - {d, n}
 * @returns {BigInt} - Recovered plaintext
 */
function decrypt(ciphertext, privateKey) {
    const { d, n } = privateKey;

    // Validate ciphertext
    if (ciphertext >= n) {
        throw new Error('Invalid ciphertext: must be < modulus n');
    }

    if (ciphertext < 0n) {
        throw new Error('Ciphertext must be non-negative');
    }

    // Perform decryption: m = c^d mod n
    const plaintext = MathUtils.modPow(ciphertext, d, n);

    return plaintext;
}

/**
 * Encrypt a text string
 *
 * WRAPPER: Converts string → BigInt → encrypt → return ciphertext
 *
 * @param {String} message - Plaintext string
 * @param {Object} publicKey - {e, n}
 * @returns {BigInt} - Ciphertext
 */
function encryptString(message, publicKey) {
    const messageInt = MathUtils.stringToBigInt(message);
    return encrypt(messageInt, publicKey);
}

/**
 * Decrypt to text string
 *
 * WRAPPER: Decrypt → BigInt → convert to string
 *
 * @param {BigInt} ciphertext
 * @param {Object} privateKey - {d, n}
 * @returns {String} - Recovered plaintext string
 */
function decryptString(ciphertext, privateKey) {
    const plaintextInt = decrypt(ciphertext, privateKey);
    return MathUtils.bigIntToString(plaintextInt);
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

const RSACore = {
    millerRabin,
    generatePrime,
    generateKeyPair,
    encrypt,
    decrypt,
    encryptString,
    decryptString
};

// Make available globally
if (typeof window !== 'undefined') {
    window.RSACore = RSACore;
}
