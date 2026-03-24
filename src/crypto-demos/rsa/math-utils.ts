/**
 * ============================================================================
 * RSA CRYPTOSYSTEM - MATHEMATICAL UTILITIES
 *
 * This module contains the core mathematical operations needed for RSA.
 * All functions use JavaScript BigInt for arbitrary-precision arithmetic.
 * ============================================================================
 */

import { Config } from "../../config";

export interface ExtendedGCDResult {
  gcd: bigint;
  x: bigint;
  y: bigint;
}

/**
 * Greatest Common Divisor (GCD) - Euclidean Algorithm
 */
export function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;

  while (b !== 0n) {
    const temp = b;
    b = a % b;
    a = temp;
  }

  return a;
}

/**
 * Extended Euclidean Algorithm
 * Finds x, y such that ax + by = gcd(a, b)  (Bézout's identity)
 */
export function extendedGCD(a: bigint, b: bigint): ExtendedGCDResult {
  if (b === 0n) {
    return { gcd: a, x: 1n, y: 0n };
  }

  const result = extendedGCD(b, a % b);

  const x = result.y;
  const y = result.x - (a / b) * result.y;

  return { gcd: result.gcd, x, y };
}

/**
 * Modular Multiplicative Inverse
 * Returns a^(-1) mod m.  Throws if gcd(a, m) ≠ 1.
 */
export function modInverse(a: bigint, m: bigint): bigint {
  const result = extendedGCD(a, m);

  if (result.gcd !== 1n) {
    throw new Error("Modular inverse does not exist: gcd(a, m) ≠ 1");
  }

  let inverse = result.x % m;
  if (inverse < 0n) {
    inverse += m;
  }

  return inverse;
}

/**
 * Modular Exponentiation (Binary / Square-and-Multiply)
 */
export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  if (exp === 0n) return 1n;
  if (exp === 1n) return base % mod;

  base = base % mod;

  let result = 1n;
  let currentBase = base;
  let currentExponent = exp;

  while (currentExponent > 0n) {
    if (currentExponent % 2n === 1n) {
      result = (result * currentBase) % mod;
    }
    currentBase = (currentBase * currentBase) % mod;
    currentExponent = currentExponent / 2n;
  }

  return result;
}

/**
 * Modular Exponentiation (Constant-Time / Montgomery Ladder)
 */
export function modPowConstantTime(
  base: bigint,
  exp: bigint,
  mod: bigint,
): bigint {
  if (mod === 1n) return 0n;
  if (exp === 0n) return 1n;
  if (exp === 1n) return base % mod;

  base = base % mod;

  const expBinary = exp.toString(2);
  const bitLen = expBinary.length;

  let R0 = base;
  let R1 = base * base;

  for (let i = 1; i < bitLen; i++) {
    const bit = expBinary[i];

    if (bit === "0") {
      R1 = (R0 * R1) % mod;
      R0 = (R0 * R0) % mod;
    } else {
      R0 = (R0 * R1) % mod;
      R1 = (R1 * R1) % mod;
    }
  }

  return R0;
}

/**
 * Check if two numbers are coprime (gcd = 1)
 */
export function areCoprime(a: bigint, b: bigint): boolean {
  return gcd(a, b) === 1n;
}

/**
 * Euler's Totient Function φ(p·q) = (p-1)(q-1)
 */
export function eulerTotient(p: bigint, q: bigint): bigint {
  return (p - 1n) * (q - 1n);
}

/**
 * Convert string to BigInt (base-256 encoding)
 */
export function stringToBigInt(str: string): bigint {
  let result = 0n;

  for (let i = 0; i < str.length; i++) {
    const charCode = BigInt(str.charCodeAt(i));
    result = result * 256n + charCode;
  }

  return result;
}

/**
 * Convert BigInt back to string (inverse of stringToBigInt)
 */
export function bigIntToString(num: bigint): string {
  if (num === 0n) return "\0";

  const chars: string[] = [];
  let remaining = num;

  while (remaining > 0n) {
    const charCode = Number(remaining % 256n);
    chars.unshift(String.fromCharCode(charCode));
    remaining = remaining / 256n;
  }

  return chars.join("");
}

/**
 * Get bit length of a BigInt.
 * Returns number — explicit bigint/number boundary.
 */
export function bitLength(n: bigint): number {
  if (n === 0n) return 0;
  return n.toString(2).length;
}

/**
 * Generate a random BigInt with the specified bit length.
 * Takes number — explicit bigint/number boundary.
 */
export function randomBigInt(bits: number): bigint {
  const bytes = Math.ceil(bits / 8);

  const randomBytes = new Uint8Array(bytes);
  // DOM Crypto interface — no import needed in browser environment
  crypto.getRandomValues(randomBytes);

  let result = 0n;
  for (let i = 0; i < bytes; i++) {
    result = (result << 8n) | BigInt(randomBytes[i]);
  }

  // Set MSB to ensure exactly 'bits' bits
  const mask = 1n << BigInt(bits - 1);
  result = result | mask;

  // Clear any overflow beyond 'bits' bits
  const maxValue = (1n << BigInt(bits)) - 1n;
  result = result & maxValue;

  return result;
}

/**
 * Check if a number is divisible by any small prime.
 * Quick composite elimination before Miller-Rabin.
 */
export function isDivisibleBySmallPrime(num: bigint): boolean {
  const smallPrimes: readonly number[] = Config.SMALL_PRIMES;
  // Config.SMALL_PRIMES is readonly number[]; each element must be cast to
  // bigint at this boundary since all modular arithmetic uses bigint.
  for (const p of smallPrimes) {
    if (num % BigInt(p) === 0n && num !== BigInt(p)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// FINITE FIELD ARITHMETIC (shared with EC)
// ============================================================================

export function modAdd(a: bigint, b: bigint, mod: bigint): bigint {
  return (a + b) % mod;
}

export function modSub(a: bigint, b: bigint, mod: bigint): bigint {
  let result = (a - b) % mod;
  if (result < 0n) {
    result += mod;
  }
  return result;
}

export function modMul(a: bigint, b: bigint, mod: bigint): bigint {
  return (a * b) % mod;
}

/**
 * Legendre symbol: (a|p) = a^((p-1)/2) mod p.
 * Returns number — explicit boundary (-1, 0, or 1).
 */
export function legendreSymbol(a: bigint, p: bigint): number {
  const ls = modPow(a, (p - 1n) / 2n, p);
  if (ls === 0n) return 0;
  if (ls === 1n) return 1;
  // ls = p-1, which is ≡ -1 (mod p)
  return -1;
}

/**
 * Tonelli-Shanks algorithm for modular square root.
 * Finds x such that x² ≡ a (mod p) for any odd prime p.
 * Returns null if no square root exists.
 */
export function modSqrt(a: bigint, p: bigint): bigint | null {
  if (a === 0n) return 0n;

  a = a % p;
  if (a < 0n) a += p;

  if (legendreSymbol(a, p) !== 1) {
    return null; // No quadratic residue: a is not a perfect square mod p
  }

  if (p === 2n) return a;

  // Special case: p ≡ 3 (mod 4)
  if (p % 4n === 3n) {
    return modPow(a, (p + 1n) / 4n, p);
  }

  // General case: Tonelli-Shanks for p ≡ 1 (mod 4)

  // Factor p-1 = Q * 2^S (Q odd)
  let Q = p - 1n;
  let S = 0n;
  while ((Q & 1n) === 0n) {
    Q >>= 1n;
    S += 1n;
  }

  // Find a quadratic non-residue z
  let z = 2n;
  while (legendreSymbol(z, p) !== -1) {
    z += 1n;
  }

  let c = modPow(z, Q, p);
  let t = modPow(a, Q, p);
  let R = modPow(a, (Q + 1n) / 2n, p);

  while (t !== 1n) {
    let m = 0n;
    let t2m = t;

    while (t2m !== 1n && m < S) {
      t2m = (t2m * t2m) % p;
      m += 1n;
    }

    if (m === 0n) break;

    if (m === S) {
      console.error("Error: m == S in Tonelli-Shanks");
      break;
    }

    let exponent = 1n;
    // Number(S - m - 1n): explicit bigint→number cast for loop bound
    for (let i = 0; i < Number(S - m - 1n); i++) {
      exponent <<= 1n;
    }
    const b = modPow(c, exponent, p);

    R = (R * b) % p;
    c = (b * b) % p;
    t = (t * c) % p;
    S = m;
  }

  return R <= p - R ? R : p - R;
}
