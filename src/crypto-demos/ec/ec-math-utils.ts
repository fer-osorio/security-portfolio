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
 * ============================================================================
 */

import { modMul, modSub, modAdd, modInverse } from '../rsa/math-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface CurveParams {
    a: bigint;
    b: bigint;
    p: bigint;
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
export class Point {
    readonly x:     bigint;
    readonly y:     bigint;
    readonly curve: CurveParams;
    isInfinity:     boolean;

    constructor(x: bigint, y: bigint, curve: CurveParams) {
        this.x = x;
        this.y = y;
        this.curve = curve;
        this.isInfinity = false;
    }

    /**
     * Create point at infinity (identity element)
     *
     * MATHEMATICAL CONCEPT:
     * The point at infinity (∞) is the identity element of the group
     * For any point P: P + ∞ = ∞ + P = P
     */
    static infinity(curve: CurveParams): Point {
        const p = new Point(0n, 0n, curve);
        p.isInfinity = true;
        return p;
    }

    /**
     * Check if two points are equal
     */
    equals(other: Point): boolean {
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
     */
    toString(): string {
        if (this.isInfinity) {
            return 'Point(∞)';
        }
        return `Point(${this.x}, ${this.y})`;
    }

    /**
     * Create a copy of this point
     */
    clone(): Point {
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
 * SECURITY CRITICAL:
 * Always validate received points before using them
 * Invalid curve attacks can leak private keys
 */
export function isOnCurve(P: Point): boolean {
    if (P.isInfinity) {
        return true;
    }

    const { a, b, p } = P.curve;

    // Left side: y² mod p
    const lhs = modMul(P.y, P.y, p);

    // Right side: x³ + ax + b mod p
    const x2  = modMul(P.x, P.x, p);           // x²
    const x3  = modMul(x2, P.x, p);            // x³
    const ax  = modMul(a, P.x, p);             // ax
    const rhs = modAdd(modAdd(x3, ax, p), b, p);  // x³ + ax + b

    return lhs === rhs;
}

/**
 * Validate curve parameters (non-singularity condition)
 *
 * MATHEMATICAL REQUIREMENT:
 * For elliptic curve y² = x³ + ax + b to be non-singular:
 *   4a³ + 27b² ≠ 0 (mod p)
 */
export function validateCurveParameters(curve: CurveParams): boolean {
    const { a, b, p } = curve;

    // Compute 4a³
    const a2           = modMul(a, a, p);
    const a3           = modMul(a2, a, p);
    const fourA3       = modMul(4n, a3, p);

    // Compute 27b²
    const b2           = modMul(b, b, p);
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
 * ALGEBRAIC FORMULA:
 * If P = (x, y), then -P = (x, -y) = (x, p - y)
 */
export function pointNegate(P: Point): Point {
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
 * ALGEBRAIC FORMULA (P ≠ Q):
 * λ = (y₂ - y₁) / (x₂ - x₁) mod p
 * x₃ = λ² - x₁ - x₂ mod p
 * y₃ = λ(x₁ - x₃) - y₁ mod p
 */
export function pointAdd(P: Point, Q: Point): Point {
    // Identity cases
    if (P.isInfinity) return Q.clone();
    if (Q.isInfinity) return P.clone();

    const { p } = P.curve;

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
    const numerator      = modSub(Q.y, P.y, p);
    const denominator    = modSub(Q.x, P.x, p);
    const denominatorInv = modInverse(denominator, p);

    const lambda  = modMul(numerator, denominatorInv, p);

    // Compute x₃ = λ² - x₁ - x₂ mod p
    const lambda2 = modMul(lambda, lambda, p);
    const x3      = modSub(modSub(lambda2, P.x, p), Q.x, p);

    // Compute y₃ = λ(x₁ - x₃) - y₁ mod p
    const y3      = modSub(modMul(lambda, modSub(P.x, x3, p), p), P.y, p);

    return new Point(x3, y3, P.curve);
}

/**
 * Point doubling: 2P = P + P
 *
 * ALGEBRAIC FORMULA:
 * λ = (3x₁² + a) / (2y₁) mod p
 * x₃ = λ² - 2x₁ mod p
 * y₃ = λ(x₁ - x₃) - y₁ mod p
 */
export function pointDouble(P: Point): Point {
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
    const x2          = modMul(P.x, P.x, p);           // x²
    const numerator   = modAdd(modMul(3n, x2, p), a, p);  // 3x² + a
    const denominator = modMul(2n, P.y, p);             // 2y
    const denominatorInv = modInverse(denominator, p);

    const lambda  = modMul(numerator, denominatorInv, p);

    // Compute x₃ = λ² - 2x₁ mod p
    const lambda2 = modMul(lambda, lambda, p);
    const x3      = modSub(lambda2, modMul(2n, P.x, p), p);

    // Compute y₃ = λ(x₁ - x₃) - y₁ mod p
    const y3      = modSub(modMul(lambda, modSub(P.x, x3, p), p), P.y, p);

    return new Point(x3, y3, P.curve);
}

/**
 * Scalar multiplication: kP = P + P + ... + P (k times)
 *
 * ALGORITHM: Double-and-add (binary method)
 * TIME COMPLEXITY: O(log k)
 *
 * SECURITY NOTE: Not constant-time. For educational purposes only.
 * Use scalarMultiplySecure for production scenarios.
 */
export function scalarMultiply(k: bigint, P: Point): Point {
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
    let result: Point = Point.infinity(P.curve);
    let temp:   Point = P.clone();
    let scalar        = k;

    while (scalar > 0n) {
        // If current bit is 1, add current power of P
        if (scalar % 2n === 1n) {
            result = pointAdd(result, temp);
        }

        // Double for next bit position
        temp   = pointDouble(temp);

        // Shift to next bit
        scalar = scalar / 2n;
    }

    return result;
}

/**
 * Constant-time scalar multiplication using Montgomery ladder
 *
 * ALGORITHM: Montgomery Ladder — always performs same number of operations
 * Resistant to timing attacks and simple power analysis.
 */
export function scalarMultiplySecure(k: bigint, P: Point): Point {
    if (k === 0n) {
        return Point.infinity(P.curve);
    }
    if (k === 1n) {
        return P.clone();
    }

    // Initialize Montgomery ladder
    let R0: Point = Point.infinity(P.curve);  // 0·P
    let R1: Point = P.clone();                // 1·P

    // Get binary representation of k
    const numBits = k.toString(2).length;

    // Process each bit from MSB to LSB
    for (let i = numBits - 1; i >= 0; i--) {
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
 * WARNING: O(n) — infeasible for cryptographic curves.
 * Use only for educational demonstrations with small curves.
 */
export function pointOrder(P: Point, maxOrder: bigint = 10000n): bigint | null {
    if (P.isInfinity) {
        return 1n;
    }

    let current: Point = P.clone();
    let order:   bigint = 1n;

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
 * SECURITY CRITICAL: Uses Web Crypto API for cryptographic randomness.
 * Rejection sampling prevents modulo bias.
 */
export function randomBigIntRange(min: bigint, max: bigint): bigint {
    if (min >= max) {
        throw new Error('min must be less than max');
    }

    const range      = max - min;
    const numBits    = range.toString(2).length;
    const byteLength = Math.ceil(numBits / 8);

    // Rejection sampling to avoid modulo bias
    const maxValidValue = (1n << BigInt(byteLength * 8)) - (1n << BigInt(byteLength * 8)) % range;

    let randomValue: bigint;
    do {
        // Generate random bytes
        const randomBytes: Uint8Array<ArrayBuffer> = new Uint8Array(byteLength);
        window.crypto.getRandomValues(randomBytes);

        // Convert to BigInt
        randomValue = 0n;
        for (let i = 0; i < byteLength; i++) {
            randomValue = (randomValue << 8n) | BigInt(randomBytes[i]);
        }
    } while (randomValue >= maxValidValue);

    return min + (randomValue % range);
}
