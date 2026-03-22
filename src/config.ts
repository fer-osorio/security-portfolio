export type SecurityStatus = 'SECURE' | 'DEPRECATED' | 'BROKEN';

export interface AlgorithmInfo {
    name:          string;
    outputBits:    number;
    blockSize:     number;
    security:      SecurityStatus;
    status:        string;
    year:          number;
    designer:      string;
    usage:         string;
    vulnerability: string;
    description:   string;
}

export type AlgorithmName =
    | 'MD5' | 'SHA1' | 'SHA256' | 'SHA384' | 'SHA512'
    | 'SHA3-256' | 'SHA3-384' | 'SHA3-512';

export const Config = {

    // ========================================================================
    // UI BEHAVIOR CONSTANTS
    // ========================================================================

    UI: {
        SCROLL_BEHAVIOR:      'smooth' as ScrollBehavior,
        SCROLL_BLOCK_DEFAULT: 'start'  as ScrollLogicalPosition,
        SCROLL_BLOCK_CENTER:  'center' as ScrollLogicalPosition,
        COPY_FEEDBACK_DURATION:   2000,
        ERROR_DISPLAY_DURATION:   5000,
        WARNING_DISPLAY_DURATION: 7000,
        SUCCESS_DISPLAY_DURATION: 3000,
        DEBOUNCE_DELAY:           500,
        MAX_PROGRESS_UPDATES:     100,
        PROGRESS_UPDATE_INTERVAL: 100,
    },

    // ========================================================================
    // SECURITY CONSTANTS
    // ========================================================================

    SECURITY: {
        MAX_INPUT_LENGTH:      10000,
        MAX_FILE_SIZE:         5 * 1024 * 1024,
        ALLOWED_PATH_REGEX:    /^[a-zA-Z0-9\-\/]+\.html$/ as RegExp,
        CSP_ENABLED:           true,
        REQUIRE_SECURE_CONTEXT: true,
        MIN_ENTROPY_BITS:      128,
    },

    // ========================================================================
    // CRYPTOGRAPHIC ALGORITHM METADATA
    // ========================================================================

    ALGORITHMS: {
        MD5: {
            name: 'MD5',
            outputBits: 128,
            blockSize: 512,
            security: 'BROKEN',
            status: '⛔',
            year: 1991,
            designer: 'Ron Rivest',
            usage: 'Educational only - DO NOT USE for security',
            vulnerability: 'Practical collision attacks (2^21 complexity)',
            description: 'Message Digest Algorithm 5. Completely broken for cryptographic use. ' +
                'Collisions can be found in seconds on modern hardware. ' +
                'Still used for non-cryptographic checksums and legacy systems.'
        },
        SHA1: {
            name: 'SHA-1',
            outputBits: 160,
            blockSize: 512,
            security: 'DEPRECATED',
            status: '⚠️',
            year: 1995,
            designer: 'NSA',
            usage: 'Legacy systems only - migrate to SHA-256',
            vulnerability: 'Collision attack demonstrated (2017 SHAttered)',
            description: 'Secure Hash Algorithm 1. Deprecated due to practical collision attacks. ' +
                "Google's SHAttered attack in 2017 found the first collision. " +
                'Being phased out in TLS, certificates, and Git.'
        },
        SHA256: {
            name: 'SHA-256',
            outputBits: 256,
            blockSize: 512,
            security: 'SECURE',
            status: '✅',
            year: 2001,
            designer: 'NSA',
            usage: 'Current standard - Bitcoin, TLS, certificates',
            vulnerability: 'None known',
            description: 'Secure Hash Algorithm 256-bit. Part of SHA-2 family. ' +
                'Current industry standard. Used in Bitcoin mining, TLS/SSL, ' +
                'digital signatures, and certificate verification. ' +
                'No known practical attacks as of 2025.'
        },
        SHA384: {
            name: 'SHA-384',
            outputBits: 384,
            blockSize: 1024,
            security: 'SECURE',
            status: '✅',
            year: 2001,
            designer: 'NSA',
            usage: 'High security applications',
            vulnerability: 'None known',
            description: 'Secure Hash Algorithm 384-bit. Truncated version of SHA-512. ' +
                'Higher security margin than SHA-256. Faster than SHA-512 on ' +
                '64-bit systems. Used in TLS 1.2+ cipher suites.'
        },
        SHA512: {
            name: 'SHA-512',
            outputBits: 512,
            blockSize: 1024,
            security: 'SECURE',
            status: '✅',
            year: 2001,
            designer: 'NSA',
            usage: 'Maximum security, password hashing',
            vulnerability: 'None known',
            description: 'Secure Hash Algorithm 512-bit. Highest security margin in SHA-2 family. ' +
                'Faster than SHA-256 on 64-bit processors due to 64-bit word operations. ' +
                'Used in PBKDF2-HMAC-SHA512 for password hashing.'
        },
        'SHA3-256': {
            name: 'SHA3-256',
            outputBits: 256,
            blockSize: 1088,
            security: 'SECURE',
            status: '✅',
            year: 2015,
            designer: 'Keccak team (Bertoni, Daemen, Peeters, Van Assche)',
            usage: 'Modern alternative to SHA-2, Ethereum',
            vulnerability: 'None known',
            description: 'SHA-3 with 256-bit output. Based on Keccak sponge construction. ' +
                'Completely different design from SHA-2 (not vulnerable to same attacks). ' +
                'Used in Ethereum blockchain. Immune to length extension attacks.'
        },
        'SHA3-384': {
            name: 'SHA3-384',
            outputBits: 384,
            blockSize: 832,
            security: 'SECURE',
            status: '✅',
            year: 2015,
            designer: 'Keccak team',
            usage: 'High security SHA-3 variant',
            vulnerability: 'None known',
            description: 'SHA-3 with 384-bit output. Higher security margin than SHA3-256. ' +
                'Sponge construction provides elegant security proof.'
        },
        'SHA3-512': {
            name: 'SHA3-512',
            outputBits: 512,
            blockSize: 576,
            security: 'SECURE',
            status: '✅',
            year: 2015,
            designer: 'Keccak team',
            usage: 'Maximum security SHA-3 variant',
            vulnerability: 'None known',
            description: 'SHA-3 with 512-bit output. Highest security variant of SHA-3. ' +
                'Future-proof against quantum computers (for hash functions). ' +
                'Used in post-quantum cryptography signatures.'
        },
    } as Record<AlgorithmName, AlgorithmInfo>,

    /**
     * First 97 primes (up to 509) for trial division optimization.
     * Eliminates ~90% of composite candidates before Miller-Rabin.
     */
    SMALL_PRIMES: [
        2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
        73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151,
        157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233,
        239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317,
        331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419,
        421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503,
        509,
    ] as readonly number[],

    getAlgorithmInfo(algorithmName: string): AlgorithmInfo | null {
        const normalized = algorithmName.toUpperCase().replace(/[-_\s]/g, '');

        if (algorithmName in this.ALGORITHMS) {
            return this.ALGORITHMS[algorithmName as AlgorithmName];
        }

        for (const [key, value] of Object.entries(this.ALGORITHMS)) {
            const normalizedKey = key.toUpperCase().replace(/[-_\s]/g, '');
            if (normalizedKey === normalized) {
                return value;
            }
        }

        return null;
    },

    // ========================================================================
    // RSA CONFIGURATION
    // ========================================================================

    RSA: {
        KEY_SIZES:              [512, 1024, 2048, 4096] as number[],
        DEFAULT_KEY_SIZE:       1024,
        PUBLIC_EXPONENT:        65537,
        PRIMALITY_TEST_ROUNDS:  40,
        MAX_MESSAGE_SIZE_RATIO: 0.95,
        MIN_PQ_DIFFERENCE_BITS: 10,
    },

    // ========================================================================
    // ECC CONFIGURATION
    // ========================================================================

    ECC: {
        STANDARD_CURVES: ['secp256k1', 'P-256', 'Curve25519'] as string[],
        DEFAULT_CURVE:   'secp256k1',
        CANVAS_WIDTH:    800,
        CANVAS_HEIGHT:   600,

        POINT_RADIUS: {
            BIG:        5,
            MEDIUM:     3.66,
            SMALL:      2.33,
            TINY:       1,
            EXTRA_TINY: 0.8,
        } as { BIG: number; MEDIUM: number; SMALL: number; TINY: number; EXTRA_TINY: number },

        ANIMATION_DURATION: 1000,
        ANIMATION_STEPS:    60,
        MAX_POINT_AMOUNT:   131072,
        MAX_POINT_AMOUNTn:  131072n as bigint,

        MAX_SCALAR_BITS: 256,
        MIN_COFACTOR:    1,
        MAX_COFACTOR:    8,

        COLORS: {
            POINT:          '#0468ab',
            OPERATION_LINE: '#e74c3c',
            RESULT:         '#27ae60',
            CURVE:          '#2c3e50',
        } as { POINT: string; OPERATION_LINE: string; RESULT: string; CURVE: string },
    },

    // ========================================================================
    // DISPLAY TEMPLATES
    // ========================================================================

    TEMPLATES: {
        ERROR_GENERIC:     '❌ Error: {message}',
        ERROR_NETWORK:     '🌐 Network Error: {message}',
        ERROR_COMPUTATION: '🔢 Computation Error: {message}',
        ERROR_VALIDATION:  '🚫 Validation Error: {message}',

        SUCCESS_GENERIC:   '✓ {message}',
        SUCCESS_COPIED:    '✓ Copied to clipboard!',
        SUCCESS_GENERATED: '✓ {item} generated successfully',
        SUCCESS_COMPUTED:  '✓ Computation complete ({duration})',

        WARNING_GENERIC:    '⚠️ Warning: {message}',
        WARNING_SECURITY:   '🔒 Security Warning: {message}',
        WARNING_DEPRECATED: '⚠️ Deprecated: {message}',

        INFO_LOADING:    'Loading...',
        INFO_PROCESSING: 'Processing...',
        INFO_COMPUTING:  'Computing {operation}...',

        LOADING_SPINNER:  '<div class="loading"><div class="spinner"></div>{message}</div>',
        LOADING_PROGRESS: '<div class="loading-progress"><div class="progress-bar" style="width: {percent}%"></div>{message}</div>',

        EDUCATIONAL_NOTE: '<div class="educational-note"><strong>📚 Educational Note:</strong> {message}</div>',
        SECURITY_NOTE:    '<div class="security-note"><strong>🔒 Security Note:</strong> {message}</div>',
    },

    formatTemplate(template: string, values: Record<string, string>): string {
        return template.replace(/\{(\w+)\}/g, (match, key: string) => {
            return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
        });
    },

    // ========================================================================
    // FEATURE FLAGS
    // ========================================================================

    FEATURES: {
        ENABLE_AUTO_INIT_UI:       true,
        ENABLE_REALTIME_HASH:      true,
        ENABLE_WEB_WORKERS:        false,
        ENABLE_PERFORMANCE_METRICS: true,
        ENABLE_DEBUG_LOGGING:      false,
        ENABLE_EXPERIMENTAL:       false,
    },

    // ========================================================================
    // DEVELOPMENT & DEBUGGING
    // ========================================================================

    DEBUG: {
        VERBOSE:           false,
        LOG_FUNCTION_CALLS: false,
        LOG_PERFORMANCE:   true,
        SHOW_DEBUG_UI:     false,
        LOG_PREFIX:        '[Mathematical-Foundations]',
    },

    // ========================================================================
    // ACCESSIBILITY
    // ========================================================================

    A11Y: {
        MIN_CONTRAST_RATIO:   4.5,
        RESPECT_REDUCED_MOTION: true,
        SHOW_KEYBOARD_HINTS:  true,
        ENABLE_ARIA_LIVE:     true,
    },

    // ========================================================================
    // PERFORMANCE
    // ========================================================================

    PERFORMANCE: {
        YIELD_INTERVAL:    10,
        BATCH_DOM_UPDATES: true,
        USE_RAF_FOR_UPDATES: true,
        MAX_BLOCKING_TIME: 100,
    },
};
