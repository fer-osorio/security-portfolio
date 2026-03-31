import {
    hammingDistance,
    arrayBufferToHex,
    hexToBinary,
    binaryToHex,
    isValidHash,
    constantTimeCompare,
    birthdayAttackProbability,
    formatLargeNumber,
} from '../src/crypto-demos/hash/hash-utils';

describe('hammingDistance()', () => {
    it('equal binary strings have distance 0', () => {
        expect(hammingDistance('10101010', '10101010')).toBe(0);
    });

    it('all bits differ: hammingDistance of "00" hex converted = 8', () => {
        // hexToBinary('00') = '0000', hexToBinary('ff') = '11111111'
        const bin00 = hexToBinary('00');
        const binFF = hexToBinary('ff');
        expect(hammingDistance(bin00, binFF)).toBe(8);
    });

    it('throws when strings have different lengths', () => {
        expect(() => hammingDistance('0101', '01')).toThrow();
    });
});

describe('arrayBufferToHex()', () => {
    it('converts [0x00, 0xff] to "00ff"', () => {
        const buf = new Uint8Array([0x00, 0xff]).buffer;
        expect(arrayBufferToHex(buf)).toBe('00ff');
    });

    it('converts [0xde, 0xad, 0xbe, 0xef] to "deadbeef"', () => {
        const buf = new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer;
        expect(arrayBufferToHex(buf)).toBe('deadbeef');
    });

    it('converts empty buffer to empty string', () => {
        const buf = new Uint8Array([]).buffer;
        expect(arrayBufferToHex(buf)).toBe('');
    });
});

describe('hexToBinary() / binaryToHex() round-trip', () => {
    it('round-trips "deadbeef"', () => {
        const hex = 'deadbeef';
        expect(binaryToHex(hexToBinary(hex))).toBe(hex);
    });

    it('hexToBinary("f") produces "1111"', () => {
        expect(hexToBinary('f')).toBe('1111');
    });

    it('hexToBinary("0") produces "0000"', () => {
        expect(hexToBinary('0')).toBe('0000');
    });

    it('binaryToHex pads short binary to valid hex', () => {
        expect(binaryToHex('1111')).toBe('f');
    });
});

describe('isValidHash()', () => {
    it('accepts a valid 64-char lowercase sha256 hex', () => {
        expect(isValidHash('a'.repeat(64), 'sha256')).toBe(true);
    });

    it('rejects a hash with the wrong length', () => {
        expect(isValidHash('a'.repeat(63), 'sha256')).toBe(false);
    });

    it('rejects a hash with non-hex characters', () => {
        expect(isValidHash('z'.repeat(64), 'sha256')).toBe(false);
    });

    it('accepts a valid 128-char sha512 hex', () => {
        expect(isValidHash('0'.repeat(128), 'sha512')).toBe(true);
    });

    it('rejects an unknown algorithm', () => {
        expect(isValidHash('a'.repeat(64), 'unknown')).toBe(false);
    });
});

describe('constantTimeCompare()', () => {
    it('returns true for equal strings', () => {
        expect(constantTimeCompare('abc', 'abc')).toBe(true);
    });

    it('returns false for different strings of same length', () => {
        expect(constantTimeCompare('abc', 'abd')).toBe(false);
    });

    it('returns false for strings of different lengths', () => {
        expect(constantTimeCompare('abc', 'abcd')).toBe(false);
    });
});

describe('birthdayAttackProbability()', () => {
    it('probability for 1 attempt with 128-bit hash is effectively 0', () => {
        const p = birthdayAttackProbability(128, 1);
        expect(p).toBeCloseTo(0, 10);
    });

    it('probability increases with more attempts', () => {
        const p1 = birthdayAttackProbability(32, 100);
        const p2 = birthdayAttackProbability(32, 10000);
        expect(p2).toBeGreaterThan(p1);
    });
});

describe('formatLargeNumber()', () => {
    it('formats numbers below 1000 as-is', () => {
        expect(formatLargeNumber(999)).toBe('999');
    });

    it('formats thousands with K suffix', () => {
        expect(formatLargeNumber(5000)).toBe('5.0K');
    });

    it('formats millions with M suffix', () => {
        expect(formatLargeNumber(2500000)).toBe('2.5M');
    });
});
