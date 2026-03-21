// CryptoJS is loaded from CDN. Only the members used by hash-core.ts are declared.
declare const CryptoJS: {
    MD5(message: string): { toString(encoder: object): string };
    SHA3(message: string, options: { outputLength: number }): { toString(encoder: object): string };
    enc: { Hex: object };
};
