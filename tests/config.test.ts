import { Config } from '../src/config';

describe('Config — structure', () => {
    it('has UI section', () => { expect(Config.UI).toBeDefined(); });
    it('has SECURITY section', () => { expect(Config.SECURITY).toBeDefined(); });
    it('has ALGORITHMS section', () => { expect(Config.ALGORITHMS).toBeDefined(); });
    it('has RSA section', () => { expect(Config.RSA).toBeDefined(); });
    it('has TEMPLATES section', () => { expect(Config.TEMPLATES).toBeDefined(); });
});

describe('Config.getAlgorithmInfo()', () => {
    it('finds SHA-256 by exact display name', () => {
        expect(Config.getAlgorithmInfo('SHA-256')).not.toBeNull();
    });

    it('finds sha-256 case-insensitively', () => {
        expect(Config.getAlgorithmInfo('sha-256')).not.toBeNull();
    });

    it('returns null for unknown algorithm', () => {
        expect(Config.getAlgorithmInfo('unknown-algo')).toBeNull();
    });
});

describe('Config — algorithm metadata', () => {
    it('SHA-256 has 256-bit output', () => {
        expect(Config.getAlgorithmInfo('SHA-256')!.outputBits).toBe(256);
    });

    it('SHA-256 security status is SECURE', () => {
        expect(Config.getAlgorithmInfo('SHA-256')!.security).toBe('SECURE');
    });

    it('MD5 security status is BROKEN', () => {
        expect(Config.getAlgorithmInfo('MD5')!.security).toBe('BROKEN');
    });
});

describe('Config.formatTemplate()', () => {
    it('replaces a single placeholder', () => {
        const result = Config.formatTemplate('Hello, {name}!', { name: 'World' });
        expect(result).toBe('Hello, World!');
    });

    it('replaces multiple placeholders', () => {
        const result = Config.formatTemplate('{a} + {b}', { a: 'foo', b: 'bar' });
        expect(result).toBe('foo + bar');
    });

    it('leaves unknown keys unchanged', () => {
        const result = Config.formatTemplate('{missing}', {});
        expect(result).toBe('{missing}');
    });
});

describe('Config — constants', () => {
    it('SECURITY.MAX_INPUT_LENGTH is positive', () => {
        expect(Config.SECURITY.MAX_INPUT_LENGTH).toBeGreaterThan(0);
    });

    it('ECC.MAX_POINT_AMOUNT equals 131072', () => {
        expect(Config.ECC.MAX_POINT_AMOUNT).toBe(131072);
    });
});
