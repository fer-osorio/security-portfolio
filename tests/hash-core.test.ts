import {
    sha256,
    sha512,
    md5,
    sha3,
    computeHash,
    isCryptoJSAvailable,
} from '../src/crypto-demos/hash/hash-core';

describe('sha256() — known vectors', () => {
    it('hashes the empty string correctly', async () => {
        const result = await sha256('');
        expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('hashes "Hello, World!" correctly', async () => {
        const result = await sha256('Hello, World!');
        expect(result).toBe('dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986d');
    });

    it('returns a 64-char lowercase hex string', async () => {
        const result = await sha256('test');
        expect(result).toMatch(/^[0-9a-f]{64}$/);
    });
});

describe('sha512() — known vector', () => {
    it('hashes the empty string correctly', async () => {
        const result = await sha512('');
        expect(result).toBe(
            'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce' +
            '47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e'
        );
    });

    it('returns a 128-char lowercase hex string', async () => {
        const result = await sha512('test');
        expect(result).toMatch(/^[0-9a-f]{128}$/);
    });
});

describe('computeHash() dispatcher', () => {
    it('routes "sha256" correctly', async () => {
        const direct = await sha256('abc');
        const dispatched = await computeHash('abc', 'sha256');
        expect(dispatched).toBe(direct);
    });

    it('routes "sha-256" alias correctly', async () => {
        const direct = await sha256('abc');
        const dispatched = await computeHash('abc', 'sha-256');
        expect(dispatched).toBe(direct);
    });

    it('routes "sha512" correctly', async () => {
        const direct = await sha512('abc');
        const dispatched = await computeHash('abc', 'sha512');
        expect(dispatched).toBe(direct);
    });
});

describe('isCryptoJSAvailable()', () => {
    it('returns true after setup.ts has run', () => {
        expect(isCryptoJSAvailable()).toBe(true);
    });
});

describe('md5() — CryptoJS', () => {
    it('hashes "abc" to the known MD5 value', async () => {
        const result = await md5('abc');
        expect(result).toBe('900150983cd24fb0d6963f7d28e17f72');
    });

    it('hashes the empty string to the known MD5 value', async () => {
        const result = await md5('');
        expect(result).toBe('d41d8cd98f00b204e9800998ecf8427e');
    });

    it('returns a 32-char lowercase hex string', async () => {
        const result = await md5('test');
        expect(result).toMatch(/^[0-9a-f]{32}$/);
    });
});

describe('sha3() — CryptoJS (Keccak)', () => {
    it('returns a 64-char hex string for 256-bit output', async () => {
        const result = await sha3('abc', 256);
        expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns a 128-char hex string for 512-bit output', async () => {
        const result = await sha3('abc', 512);
        expect(result).toMatch(/^[0-9a-f]{128}$/);
    });

    it('produces the known Keccak-256 of "abc"', async () => {
        const result = await sha3('abc', 256);
        expect(result).toBe('4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45');
    });
});
