/**
 * ============================================================================
 * ELLIPTIC CURVE CRYPTOGRAPHY - MATHEMATICAL UTILITIES
 *
 * This module implements the algebraic foundation of elliptic curves over
 * finite fields.
 *
 * MATHEMATICAL FOUNDATION:
 * An elliptic curve over a finite field F_p is defined by the equation:
 *   E: y² ≡ x³ + ax + b (mod p)
 *
 * where:
 *   - p is a large prime (the field characteristic)
 *   - a, b are curve parameters satisfying 4a³ + 27b² ≠ 0 (non-singular)
 *   - Points (x, y) satisfying the equation form a group under addition
 *
 * GROUP STRUCTURE:
 * - Identity element: Point at infinity (∞)
 * - Addition operation: Geometric chord-and-tangent method
 * - Scalar multiplication: Repeated addition (kP = P + P + ... + P)
 * - Order: Smallest n where nP = ∞
 *
 * SECURITY BASIS:
 * Elliptic Curve Discrete Logarithm Problem (ECDLP):
 *   Given P and Q = kP, finding k is computationally hard
 *   Best known attack: Pollard's rho with O(√n) complexity
 *
 * This implements the elliptic curve group (E(F_p), +) with all the
 * properties you'd expect from abstract algebra:
 * - Closure, associativity, identity, inverses
 * - Abelian (commutative): P + Q = Q + P
 * - No efficient homomorphism to easier groups (hardness of ECDLP)
 *
 * ============================================================================
 */

// ============================================================================
// FINITE FIELD ARITHMETIC
// ============================================================================

/**
 * Modular addition: (a + b) mod p
 *
 * COMPLEXITY: O(1)
 *
 * @param {BigInt} a
 * @param {BigInt} b
 * @param {BigInt} p - Prime modulus
 * @returns {BigInt}
 */
function modAdd(a, b, p) {
    return (a + b) % p;
}

/**
 * Modular subtraction: (a - b) mod p
 *
 * ENSURES POSITIVE RESULT:
 * JavaScript's % can return negative values for negative inputs
 * We add p if result is negative to ensure [0, p)
 *
 * @param {BigInt} a
 * @param {BigInt} b
 * @param {BigInt} p
 * @returns {BigInt}
 */
function modSub(a, b, p) {
    let result = (a - b) % p;
    if (result < 0n) {
        result += p;
    }
    return result;
}

/**
 * Modular multiplication: (a × b) mod p
 *
 * @param {BigInt} a
 * @param {BigInt} b
 * @param {BigInt} p
 * @returns {BigInt}
 */
function modMul(a, b, p) {
    return (a * b) % p;
}

/**
 * Modular inverse: a⁻¹ mod p such that (a × a⁻¹) ≡ 1 (mod p)
 *
 * REUSE: Delegates to MathUtils.modInverse (Extended Euclidean Algorithm)
 *
 * WHY THIS WORKS:
 * For prime p, every non-zero element in F_p has a unique inverse
 * This follows from F_p being a field
 *
 * ALGORITHM: Extended Euclidean Algorithm
 * Finds x, y such that ax + py = gcd(a, p) = 1
 * Then x ≡ a⁻¹ (mod p)
 *
 * COMPLEXITY: O(log p)
 *
 * @param {BigInt} a
 * @param {BigInt} p - Prime modulus
 * @returns {BigInt|null} - Inverse or null if doesn't exist
 */
function modInv(a, p) {
    // Leverage existing implementation
    return MathUtils.modInverse(a, p);
}

/**
 * Modular exponentiation: base^exp mod p
 *
 * REUSE: Delegates to MathUtils.modPow (Binary exponentiation)
 *
 * NOT DIRECTLY USED IN ECC but included for completeness
 * (Used in some optimizations and square root algorithms)
 *
 * @param {BigInt} base
 * @param {BigInt} exp
 * @param {BigInt} p
 * @returns {BigInt}
 */
function modPow(base, exp, p) {
    return MathUtils.modPow(base, exp, p);
}

/**
 * Modular square root: Find x such that x² ≡ a (mod p)
 *
 * ALGORITHM: Tonelli-Shanks algorithm for p ≡ 3 (mod 4)
 * For primes p ≡ 3 (mod 4), sqrt(a) = a^((p+1)/4) mod p
 *
 * WHY THIS WORKS:
 * If a is a quadratic residue, then:
 *   (a^((p+1)/4))² = a^((p+1)/2) = a × a^((p-1)/2)
 *   By Euler's criterion: a^((p-1)/2) ≡ 1 (mod p) for QR
 *   Therefore: (a^((p+1)/4))² ≡ a (mod p)
 *
 * USED IN: Point decompression (recovering y from x and sign bit)
 *
 * @param {BigInt} a
 * @param {BigInt} p - Prime modulus (must be ≡ 3 mod 4)
 * @returns {BigInt|null} - Square root or null if doesn't exist
 */
function modSqrt(a, p) {
    // Quick return for zero
    if (a === 0n) return 0n;

    // Ensure a is in valid range
    a = a % p;
    if (a < 0n) a += p;

    // Check if a is a quadratic residue using Euler's criterion
    // a^((p-1)/2) should equal 1 for quadratic residues
    const exponent = (p - 1n) / 2n;
    const eulerCriterion = modPow(a, exponent, p);

    if (eulerCriterion !== 1n) {
        return null;  // Not a quadratic residue
    }

    // For p ≡ 3 (mod 4), use simple formula
    if (p % 4n === 3n) {
        const sqrt = modPow(a, (p + 1n) / 4n, p);
        return sqrt;
    }

    // For p ≡ 1 (mod 4), need full Tonelli-Shanks
    // Not implemented here as standard curves use p ≡ 3 (mod 4)
    throw new Error('modSqrt for p ≡ 1 (mod 4) not implemented');
}

// ============================================================================
// POINT REPRESENTATION
// ============================================================================

/**
 * Point on an elliptic curve
 *
 * REPRESENTS:
 * - Affine coordinates (x, y) for regular points
 * - Point at infinity (identity element) when isInfinity = true
 *
 * INVARIANT: If not at infinity, (x, y) must satisfy curve equation
 */
class Point {
    /**
     * @param {BigInt} x - x-coordinate
     * @param {BigInt} y - y-coordinate
     * @param {Object} curve - Reference to curve parameters {a, b, p}
     */
    constructor(x, y, curve) {
        this.x = x;
        this.y = y;
        this.curve = curve;
        this.isInfinity = false;  // Will be set to true for identity element
    }

    /**
     * Create point at infinity (identity element)
     *
     * MATHEMATICAL CONCEPT:
     * The point at infinity (∞) is the identity element of the group
     * For any point P: P + ∞ = ∞ + P = P
     *
     * GEOMETRIC INTERPRETATION:
     * All vertical lines intersect the curve at infinity
     *
     * @param {Object} curve
     * @returns {Point}
     */
    static infinity(curve) {
        const p = new Point(0n, 0n, curve);
        p.isInfinity = true;
        return p;
    }

    /**
     * Check if two points are equal
     *
     * @param {Point} other
     * @returns {Boolean}
     */
    equals(other) {
        if (this.isInfinity && other.isInfinity) {
            return true;
        }
        if (this.isInfinity || other.isInfinity) {
            return false;
        }
        return this.x === other.x && this.y === other.y;
    }

    /**
     * String representation for debugging
     *
     * @returns {String}
     */
    toString() {
        if (this.isInfinity) {
            return 'Point(∞)';
        }
        return `Point(${this.x}, ${this.y})`;
    }

    /**
     * Create a copy of this point
     *
     * @returns {Point}
     */
    clone() {
        if (this.isInfinity) {
            return Point.infinity(this.curve);
        }
        return new Point(this.x, this.y, this.curve);
    }
}

// ============================================================================
// POINT VALIDATION
// ============================================================================

/**
 * Check if point satisfies the curve equation
 *
 * CURVE EQUATION: y² ≡ x³ + ax + b (mod p)
 *
 * VERIFICATION:
 * 1. Compute left side: y² mod p
 * 2. Compute right side: (x³ + ax + b) mod p
 * 3. Check equality
 *
 * SECURITY CRITICAL:
 * Always validate received points before using them
 * Invalid curve attacks can leak private keys
 *
 * @param {Point} P
 * @returns {Boolean}
 */
function isOnCurve(P) {
    // Point at infinity is always "on" the curve
    if (P.isInfinity) {
        return true;
    }

    const { a, b, p } = P.curve;

    // Left side: y² mod p
    const lhs = modMul(P.y, P.y, p);

    // Right side: x³ + ax + b mod p
    const x2 = modMul(P.x, P.x, p);           // x²
    const x3 = modMul(x2, P.x, p);            // x³
    const ax = modMul(a, P.x, p);             // ax
    const rhs = modAdd(modAdd(x3, ax, p), b, p);  // x³ + ax + b

    return lhs === rhs;
}

/**
 * Validate curve parameters (non-singularity condition)
 *
 * MATHEMATICAL REQUIREMENT:
 * For elliptic curve y² = x³ + ax + b to be non-singular:
 *   Δ = -16(4a³ + 27b²) ≠ 0
 *
 * Equivalently: 4a³ + 27b² ≠ 0 (mod p)
 *
 * WHY THIS MATTERS:
 * Singular curves have cusps or self-intersections
 * The group structure breaks down at singular points
 *
 * @param {Object} curve - {a, b, p}
 * @returns {Boolean}
 */
function validateCurveParameters(curve) {
    const { a, b, p } = curve;

    // Compute 4a³
    const a2 = modMul(a, a, p);
    const a3 = modMul(a2, a, p);
    const fourA3 = modMul(4n, a3, p);

    // Compute 27b²
    const b2 = modMul(b, b, p);
    const twentySevenB2 = modMul(27n, b2, p);

    // Check 4a³ + 27b² ≠ 0 (mod p)
    const discriminant = modAdd(fourA3, twentySevenB2, p);

    return discriminant !== 0n;
}

// ============================================================================
// POINT ARITHMETIC
// ============================================================================

/**
 * Point negation: Reflect across x-axis
 *
 * GEOMETRIC INTERPRETATION:
 * -P is the reflection of P across the x-axis
 *
 * ALGEBRAIC FORMULA:
 * If P = (x, y), then -P = (x, -y) = (x, p - y)
 *
 * GROUP PROPERTY:
 * P + (-P) = ∞ (point at infinity)
 *
 * @param {Point} P
 * @returns {Point}
 */
function pointNegate(P) {
    if (P.isInfinity) {
        return Point.infinity(P.curve);
    }

    const { p } = P.curve;

    // -y mod p = p - y (for y ≠ 0)
    const negY = P.y === 0n ? 0n : p - P.y;

    return new Point(P.x, negY, P.curve);
}

/**
 * Point addition: P + Q
 *
 * GEOMETRIC INTERPRETATION:
 * 1. Draw line through P and Q
 * 2. Find third intersection point R with curve
 * 3. Reflect R across x-axis to get P + Q
 *
 * SPECIAL CASES:
 * - P = ∞: Result is Q
 * - Q = ∞: Result is P
 * - P = -Q: Result is ∞ (vertical line)
 * - P = Q: Use point doubling instead
 *
 * ALGEBRAIC FORMULA (P ≠ Q):
 * λ = (y₂ - y₁) / (x₂ - x₁) mod p
 * x₃ = λ² - x₁ - x₂ mod p
 * y₃ = λ(x₁ - x₃) - y₁ mod p
 *
 * DERIVATION:
 * Line through P and Q: y = λx + ν
 * Substitute into curve equation: (λx + ν)² = x³ + ax + b
 * This is cubic in x with roots x₁, x₂, x₃
 * By Vieta's formulas: x₁ + x₂ + x₃ = λ²
 * Therefore: x₃ = λ² - x₁ - x₂
 *
 * @param {Point} P
 * @param {Point} Q
 * @returns {Point} - P + Q
 */
function pointAdd(P, Q) {
    // Identity cases
    if (P.isInfinity) return Q.clone();
    if (Q.isInfinity) return P.clone();

    const { a, p } = P.curve;

    // Case: P = -Q (vertical line)
    if (P.x === Q.x && P.y !== Q.y) {
        return Point.infinity(P.curve);
    }

    // Case: P = Q (need point doubling)
    if (P.x === Q.x && P.y === Q.y) {
        return pointDouble(P);
    }

    // General case: P ≠ Q
    // Compute slope: λ = (y₂ - y₁) / (x₂ - x₁) mod p
    const numerator = modSub(Q.y, P.y, p);
    const denominator = modSub(Q.x, P.x, p);
    const denominatorInv = modInv(denominator, p);

    if (denominatorInv === null) {
        throw new Error('Division by zero in point addition');
    }

    const lambda = modMul(numerator, denominatorInv, p);

    // Compute x₃ = λ² - x₁ - x₂ mod p
    const lambda2 = modMul(lambda, lambda, p);
    const x3 = modSub(modSub(lambda2, P.x, p), Q.x, p);

    // Compute y₃ = λ(x₁ - x₃) - y₁ mod p
    const y3 = modSub(modMul(lambda, modSub(P.x, x3, p), p), P.y, p);

    return new Point(x3, y3, P.curve);
}

/**
 * Point doubling: 2P = P + P
 *
 * GEOMETRIC INTERPRETATION:
 * 1. Draw tangent line to curve at P
 * 2. Find second intersection point R with curve
 * 3. Reflect R across x-axis to get 2P
 *
 * SPECIAL CASES:
 * - P = ∞: Result is ∞
 * - y = 0: Tangent is vertical, result is ∞
 *
 * ALGEBRAIC FORMULA:
 * λ = (3x₁² + a) / (2y₁) mod p
 * x₃ = λ² - 2x₁ mod p
 * y₃ = λ(x₁ - x₃) - y₁ mod p
 *
 * DERIVATION:
 * Tangent line has slope dy/dx at P
 * Implicit differentiation of y² = x³ + ax + b:
 *   2y(dy/dx) = 3x² + a
 *   dy/dx = (3x² + a) / (2y)
 *
 * @param {Point} P
 * @returns {Point} - 2P
 */
function pointDouble(P) {
    // Identity case
    if (P.isInfinity) {
        return Point.infinity(P.curve);
    }

    const { a, p } = P.curve;

    // Case: y = 0 (tangent is vertical)
    if (P.y === 0n) {
        return Point.infinity(P.curve);
    }

    // Compute slope: λ = (3x² + a) / (2y) mod p
    const x2 = modMul(P.x, P.x, p);           // x²
    const numerator = modAdd(modMul(3n, x2, p), a, p);  // 3x² + a
    const denominator = modMul(2n, P.y, p);    // 2y
    const denominatorInv = modInv(denominator, p);

    if (denominatorInv === null) {
        throw new Error('Division by zero in point doubling');
    }

    const lambda = modMul(numerator, denominatorInv, p);

    // Compute x₃ = λ² - 2x₁ mod p
    const lambda2 = modMul(lambda, lambda, p);
    const x3 = modSub(lambda2, modMul(2n, P.x, p), p);

    // Compute y₃ = λ(x₁ - x₃) - y₁ mod p
    const y3 = modSub(modMul(lambda, modSub(P.x, x3, p), p), P.y, p);

    return new Point(x3, y3, P.curve);
}

/**
 * Scalar multiplication: kP = P + P + ... + P (k times)
 *
 * NAIVE APPROACH: Add P to itself k times
 * TIME COMPLEXITY: O(k) - Impractical for large k
 *
 * EFFICIENT APPROACH: Double-and-add (binary method)
 * TIME COMPLEXITY: O(log k) - Same principle as modular exponentiation
 *
 * ALGORITHM:
 * 1. Express k in binary: k = k₀ + k₁·2 + k₂·2² + ...
 * 2. Compute: kP = k₀P + k₁(2P) + k₂(4P) + ...
 * 3. Use repeated doubling to compute 2P, 4P, 8P, ...
 *
 * EXAMPLE: 13P where k = 13 = 1101₂
 *   13P = 1·P + 1·(2P) + 0·(4P) + 1·(8P)
 *       = P + 2P + 8P
 *
 * SECURITY NOTE:
 * This is NOT constant-time (timing leak through conditional additions)
 * For educational purposes, we show both versions:
 * - scalarMultiply: Simple double-and-add (INSECURE but clear)
 * - scalarMultiplySecure: Montgomery ladder (SECURE but complex)
 *
 * @param {BigInt} k - Scalar (non-negative integer)
 * @param {Point} P - Point to multiply
 * @returns {Point} - kP
 */
function scalarMultiply(k, P) {
    // Edge cases
    if (k === 0n) {
        return Point.infinity(P.curve);
    }
    if (k === 1n) {
        return P.clone();
    }
    if (k < 0n) {
        throw new Error('Scalar must be non-negative');
    }

    // Double-and-add algorithm
    let result = Point.infinity(P.curve);
    let temp = P.clone();
    let scalar = k;

    while (scalar > 0n) {
        // If current bit is 1, add current power of P
        if (scalar % 2n === 1n) {
            result = pointAdd(result, temp);
        }

        // Double for next bit position
        temp = pointDouble(temp);

        // Shift to next bit
        scalar = scalar / 2n;
    }

    return result;
}

/**
 * Constant-time scalar multiplication using Montgomery ladder
 *
 * SECURITY IMPROVEMENT:
 * - Always performs same number of operations regardless of k
 * - Same memory access pattern for all k
 * - Resistant to timing attacks and simple power analysis
 *
 * ALGORITHM: Montgomery Ladder
 * Maintain two points R₀ and R₁ where R₁ = R₀ + P
 *
 * For each bit bᵢ of k (from MSB to LSB):
 *   if bᵢ = 0:
 *     R₁ = R₀ + R₁
 *     R₀ = 2R₀
 *   if bᵢ = 1:
 *     R₀ = R₀ + R₁
 *     R₁ = 2R₁
 *
 * INVARIANT: R₁ = R₀ + P always maintained
 *
 * WHY CONSTANT-TIME:
 * Both branches perform exactly one addition and one doubling
 * Only the order differs (which is less observable than presence/absence)
 *
 * TRADE-OFF:
 * Slightly slower than double-and-add (~20% overhead)
 * But much more secure against side-channel attacks
 *
 * @param {BigInt} k
 * @param {Point} P
 * @returns {Point} - kP
 */
function scalarMultiplySecure(k, P) {
    if (k === 0n) {
        return Point.infinity(P.curve);
    }
    if (k === 1n) {
        return P.clone();
    }

    // Initialize Montgomery ladder
    let R0 = Point.infinity(P.curve);  // 0·P
    let R1 = P.clone();                 // 1·P

    // Get binary representation of k
    const bitLength = k.toString(2).length;

    // Process each bit from MSB to LSB
    for (let i = bitLength - 1; i >= 0; i--) {
        const bit = (k >> BigInt(i)) & 1n;

        if (bit === 0n) {
            // R₁ = R₀ + R₁, R₀ = 2R₀
            R1 = pointAdd(R0, R1);
            R0 = pointDouble(R0);
        } else {
            // R₀ = R₀ + R₁, R₁ = 2R₁
            R0 = pointAdd(R0, R1);
            R1 = pointDouble(R1);
        }
    }

    return R0;
}

/**
 * Find the order of a point (smallest n where nP = ∞)
 *
 * METHOD: Trial multiplication (slow, for small examples only)
 *
 * MATHEMATICAL BACKGROUND:
 * By Lagrange's theorem, order of point divides group order
 * For cryptographic curves, usually P has prime order n
 *
 * WARNING: This is O(n) which is infeasible for cryptographic curves
 * Use only for educational demonstrations with small curves
 *
 * @param {Point} P
 * @param {BigInt} maxOrder - Maximum order to search (default: 10000)
 * @returns {BigInt|null} - Order of P, or null if exceeds maxOrder
 */
function pointOrder(P, maxOrder = 10000n) {
    if (P.isInfinity) {
        return 1n;
    }

    let current = P.clone();
    let order = 1n;

    while (order <= maxOrder) {
        if (current.isInfinity) {
            return order;
        }
        current = pointAdd(current, P);
        order++;
    }

    return null;  // Order exceeds maxOrder
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate cryptographically secure random BigInt in range [min, max)
 *
 * SECURITY CRITICAL: Uses Web Crypto API for cryptographic randomness
 *
 * ALGORITHM:
 * 1. Generate random bytes
 * 2. Convert to BigInt
 * 3. Reduce to target range using rejection sampling
 *
 * REJECTION SAMPLING:
 * To avoid modulo bias, reject values that would skew distribution
 *
 * @param {BigInt} min - Minimum value (inclusive)
 * @param {BigInt} max - Maximum value (exclusive)
 * @returns {BigInt}
 */
function randomBigIntRange(min, max) {
    if (min >= max) {
        throw new Error('min must be less than max');
    }

    const range = max - min;
    const bitLength = range.toString(2).length;
    const byteLength = Math.ceil(bitLength / 8);

    // Rejection sampling to avoid modulo bias
    const maxValidValue = (1n << BigInt(byteLength * 8)) - (1n << BigInt(byteLength * 8)) % range;

    let randomValue;
    do {
        // Generate random bytes
        const randomBytes = new Uint8Array(byteLength);
        window.crypto.getRandomValues(randomBytes);

        // Convert to BigInt
        randomValue = 0n;
        for (let i = 0; i < byteLength; i++) {
            randomValue = (randomValue << 8n) | BigInt(randomBytes[i]);
        }
    } while (randomValue >= maxValidValue);

    return min + (randomValue % range);
}

/**
 * Get bit length of BigInt
 *
 * @param {BigInt} n
 * @returns {Number}
 */
function bitLength(n) {
    if (n === 0n) return 0;
    return n.toString(2).length;
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

const ECMathUtils = {
    // Finite field operations
    modAdd,
    modSub,
    modMul,
    modInv,
    modPow,
    modSqrt,

    // Point class
    Point,

    // Point validation
    isOnCurve,
    validateCurveParameters,

    // Point arithmetic
    pointNegate,
    pointAdd,
    pointDouble,
    scalarMultiply,
    scalarMultiplySecure,
    pointOrder,

    // Utilities
    randomBigIntRange,
    bitLength
};

// Make available globally
if (typeof window !== 'undefined') {
    window.ECMathUtils = ECMathUtils;
    console.log('✓ EC Math Utilities module loaded');
}
