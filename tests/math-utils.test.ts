import {
    gcd,
    extendedGCD,
    modInverse,
    modPow,
    modPowConstantTime,
    stringToBigInt,
    bigIntToString,
    modSqrt,
    modAdd,
    modSub,
    modMul,
} from '../src/crypto-demos/rsa/math-utils';

describe('gcd()', () => {
    it('gcd(48n, 18n) === 6n', () => { expect(gcd(48n, 18n)).toBe(6n); });
    it('gcd(0n, 5n) === 5n', () => { expect(gcd(0n, 5n)).toBe(5n); });
    it('gcd(7n, 13n) === 1n (coprime)', () => { expect(gcd(7n, 13n)).toBe(1n); });
    it('gcd(100n, 75n) === 25n', () => { expect(gcd(100n, 75n)).toBe(25n); });
});

describe('extendedGCD()', () => {
    it('satisfies Bézout identity: a·x + b·y === gcd(a, b)', () => {
        const pairs: [bigint, bigint][] = [
            [35n, 15n],
            [48n, 18n],
            [3n, 11n],
            [100n, 37n],
        ];

        for (const [a, b] of pairs) {
            const { gcd: g, x, y } = extendedGCD(a, b);
            expect(a * x + b * y).toBe(g);
        }
    });
});

describe('modInverse()', () => {
    it('modInverse(3n, 11n) === 4n', () => {
        expect(modInverse(3n, 11n)).toBe(4n);
    });

    it('modInverse(7n, 23n) === 10n', () => {
        // 7 × 10 = 70 = 3 × 23 + 1
        expect(modInverse(7n, 23n)).toBe(10n);
    });

    it('throws when inverse does not exist', () => {
        // gcd(4, 6) = 2 ≠ 1
        expect(() => modInverse(4n, 6n)).toThrow();
    });
});

describe('modPow()', () => {
    it('2^10 mod 1000 === 24', () => {
        expect(modPow(2n, 10n, 1000n)).toBe(24n);
    });

    it('base case: any^0 mod m === 1', () => {
        expect(modPow(999n, 0n, 997n)).toBe(1n);
    });

    it('mod 1 always returns 0', () => {
        expect(modPow(999n, 999n, 1n)).toBe(0n);
    });

    it('3^7 mod 13 === 3', () => {
        // 3^7 = 2187, 2187 mod 13 = 2187 - 168*13 = 2187-2184 = 3
        expect(modPow(3n, 7n, 13n)).toBe(3n);
    });
});

describe('modPow vs modPowConstantTime', () => {
    const cases: [bigint, bigint, bigint][] = [
        [2n, 10n, 1000n],
        [3n, 7n, 13n],
        [5n, 20n, 97n],
        [7n, 15n, 23n],
    ];

    for (const [base, exp, mod] of cases) {
        it(`${base}^${exp} mod ${mod} matches`, () => {
            expect(modPow(base, exp, mod)).toBe(modPowConstantTime(base, exp, mod));
        });
    }
});

describe('stringToBigInt() / bigIntToString() round-trip', () => {
    it('round-trips ASCII text', () => {
        const original = 'Hello';
        expect(bigIntToString(stringToBigInt(original))).toBe(original);
    });

    it('round-trips a single character', () => {
        expect(bigIntToString(stringToBigInt('A'))).toBe('A');
    });

    it('round-trips a longer sentence', () => {
        const original = 'The quick brown fox';
        expect(bigIntToString(stringToBigInt(original))).toBe(original);
    });
});

describe('modSqrt()', () => {
    const p = 23n;

    it('returns a root for a quadratic residue mod 23', () => {
        // 2 is a QR mod 23: 5² = 25 ≡ 2 (mod 23)
        const root = modSqrt(2n, p);
        expect(root).not.toBeNull();
        expect((root! * root!) % p).toBe(2n);
    });

    it('returns the smaller of the two roots', () => {
        // sqrt(2) mod 23: roots are 5 and 18; smaller is 5
        expect(modSqrt(2n, p)).toBe(5n);
    });

    it('returns null for a quadratic non-residue mod 23', () => {
        // 5 is a non-residue mod 23
        expect(modSqrt(5n, p)).toBeNull();
    });
});

describe('modAdd / modSub / modMul', () => {
    const p = 23n;

    it('modAdd(15n, 12n, 23n) === 4n', () => {
        expect(modAdd(15n, 12n, p)).toBe(4n);
    });

    it('modSub(5n, 10n, 23n) === 18n', () => {
        expect(modSub(5n, 10n, p)).toBe(18n);
    });

    it('modMul(7n, 8n, 23n) === 10n', () => {
        expect(modMul(7n, 8n, p)).toBe(10n);
    });
});
