import CryptoJS from 'crypto-js';
// Expose CryptoJS as the global the CDN script would normally provide
(globalThis as unknown as Record<string, unknown>).CryptoJS = CryptoJS;
