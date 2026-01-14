/**
 * ============================================================================
 * CRYPTOGRAPHY PORTFOLIO - APPLICATION CONFIGURATION
 *
 * Centralized configuration, constants, and data structures shared across
 * cryptographic tools.
 *
 * DESIGN PRINCIPLES:
 * 1. Single Source of Truth: All configuration in one place
 * 2. Immutability: Configuration should not be modified at runtime
 * 3. Organization: Grouped by functional area
 * 4. Documentation: Every constant explained
 *
 * WHY CENTRALIZE CONFIGURATION:
 * - Eliminates magic numbers scattered throughout code
 * - Makes updates easier (change once, apply everywhere)
 * - Improves consistency across tools
 * - Facilitates testing (can override config in tests)
 * - Better code review (see all constants in one place)
 *
 * ============================================================================
 */

const Config = {

    // ========================================================================
    // UI BEHAVIOR CONSTANTS
    // ========================================================================

    /**
     * UI behavior settings for consistent user experience
     */
    UI: {
        /**
         * Scroll behavior for programmatic scrolling
         * Options: 'smooth' (animated), 'auto' (instant), 'instant'
         *
         * WHY SMOOTH: Better UX - users can follow the movement
         * Trade-off: Slightly slower, but worth it for clarity
         */
        SCROLL_BEHAVIOR: 'smooth',

        /**
         * Scroll block alignment
         * Options: 'start', 'center', 'end', 'nearest'
         *
         * 'start': Aligns element to top of viewport
         * 'center': Centers element in viewport (used for errors)
         */
        SCROLL_BLOCK_DEFAULT: 'start',
        SCROLL_BLOCK_CENTER: 'center',

        /**
         * Duration (ms) to show "Copied!" feedback after copy-to-clipboard
         *
         * RATIONALE: 2 seconds is enough to see, not so long it's annoying
         * Based on: Nielsen Norman Group usability guidelines
         */
        COPY_FEEDBACK_DURATION: 2000,

        /**
         * Duration (ms) to display error messages before auto-hiding
         *
         * RATIONALE: 5 seconds allows reading ~15 words (250 WPM average)
         * User can still dismiss manually if needed
         */
        ERROR_DISPLAY_DURATION: 5000,

        /**
         * Duration (ms) to display warning messages
         */
        WARNING_DISPLAY_DURATION: 7000,

        /**
         * Duration (ms) to display success messages
         */
        SUCCESS_DISPLAY_DURATION: 3000,

        /**
         * Debounce delay (ms) for real-time input handlers
         *
         * RATIONALE: 500ms feels responsive but doesn't fire too often
         * Reduces computational load for expensive operations (hashing)
         */
        DEBOUNCE_DELAY: 500,

        /**
         * Maximum number of progress updates to show during long operations
         * Prevents UI from being overwhelmed with updates
         */
        MAX_PROGRESS_UPDATES: 100,

        /**
         * Interval (ms) between progress updates
         */
        PROGRESS_UPDATE_INTERVAL: 100,
    },

    // ========================================================================
    // SECURITY CONSTANTS
    // ========================================================================

    /**
     * Security-related configuration and validation rules
     */
    SECURITY: {
        /**
         * Maximum input length for text fields (characters)
         *
         * PURPOSE: Prevent DoS attacks via extremely large inputs
         * RATIONALE: 10,000 chars is ~1,500 words (enough for any demo)
         *
         * FOR YOUR BACKGROUND:
         * This is similar to MAX_PATH in Windows or PATH_MAX in POSIX,
         * but for user input instead of file paths.
         */
        MAX_INPUT_LENGTH: 10000,

        /**
         * Maximum file size for uploads (bytes)
         * Not currently used, but reserved for future file upload features
         */
        MAX_FILE_SIZE: 5 * 1024 * 1024,  // 5 MB

        /**
         * Allowed path regex for navigation
         *
         * SECURITY: Prevents path traversal attacks
         * Pattern: alphanumeric, hyphens, forward slashes, must end in .html
         *
         * ALLOWS: pages/rsa-tool.html, tools/crypto/hash.html
         * BLOCKS: ../../admin.html, pages/../admin.html, pages\tool.html
         */
        ALLOWED_PATH_REGEX: /^[a-zA-Z0-9\-\/]+\.html$/,

        /**
         * Content Security Policy enabled
         * If true, checks for CSP meta tag on page load
         */
        CSP_ENABLED: true,

        /**
         * Require secure context (HTTPS or localhost)
         * If true, warns user if page loaded over HTTP
         */
        REQUIRE_SECURE_CONTEXT: true,

        /**
         * Minimum password/key entropy (bits) for security warnings
         * Used for educational warnings about weak keys
         */
        MIN_ENTROPY_BITS: 128,
    },

    // ========================================================================
    // CRYPTOGRAPHIC ALGORITHM METADATA
    // ========================================================================

    /**
     * Hash algorithm information and security status
     *
     * MOVED FROM: hash-core.js getAlgorithmInfo()
     *
     * WHY CENTRALIZE:
     * - Used by both hash-core.js (implementation) and hash-demo.js (display)
     * - Easier to update security status as new attacks emerge
     * - Single source of truth for algorithm properties
     *
     * STRUCTURE:
     * Each algorithm has:
     * - name: Display name
     * - outputBits: Hash output size in bits
     * - blockSize: Internal block size (for construction details)
     * - security: Current security status (SECURE, DEPRECATED, BROKEN)
     * - status: Emoji indicator (✅, ⚠️, ⛔)
     * - year: Year of standardization
     * - designer: Who designed it
     * - usage: Current recommended usage
     * - vulnerability: Known attacks or "None known"
     */
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
            'Google\'s SHAttered attack in 2017 found the first collision. ' +
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
    },

    /**
     * Helper function to get algorithm info by name
     * Case-insensitive lookup
     *
     * @param {string} algorithmName - Algorithm name (e.g., 'md5', 'SHA-256', 'sha3-512')
     * @returns {Object|null} - Algorithm info object or null if not found
     */
    getAlgorithmInfo(algorithmName) {
        const normalized = algorithmName.toUpperCase().replace(/[-_\s]/g, '');

        // Try direct lookup first
        if (this.ALGORITHMS[algorithmName]) {
            return this.ALGORITHMS[algorithmName];
        }

        // Try normalized lookup
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

    /**
     * RSA key generation and encryption settings
     */
    RSA: {
        /**
         * Available key sizes (bits)
         *
         * SECURITY LEVELS:
         * - 512: INSECURE - factorable with modest resources (demonstration only)
         * - 1024: DEPRECATED - considered breakable by well-funded adversaries
         * - 2048: MINIMUM recommended for production (NIST, 2023)
         * - 4096: HIGH SECURITY - recommended for long-term protection
         *
         * PERFORMANCE:
         * Key generation time grows ~O(bits³)
         * - 512-bit: ~100-500ms
         * - 1024-bit: ~500-2000ms
         * - 2048-bit: ~2-10 seconds
         * - 4096-bit: ~30-120 seconds
         */
        KEY_SIZES: [512, 1024, 2048, 4096],

        /**
         * Default key size for initial display
         */
        DEFAULT_KEY_SIZE: 1024,

        /**
         * Public exponent (e) - standard value
         *
         * WHY 65537:
         * - Large enough to resist small exponent attacks
         * - Only two 1-bits in binary (10000000000000001₂)
         * - Fast encryption (only 17 multiplications)
         * - Fermat prime F₄ = 2^16 + 1
         */
        PUBLIC_EXPONENT: 65537,

        /**
         * Miller-Rabin primality test rounds
         *
         * ERROR PROBABILITY: ≤ (1/4)^k
         * - 20 rounds: ≤ 2^-40 (one in a trillion)
         * - 40 rounds: ≤ 2^-80 (cryptographically negligible)
         *
         * RATIONALE: 40 rounds provides security beyond birthday bound
         */
        PRIMALITY_TEST_ROUNDS: 40,

        /**
         * Small primes for trial division optimization
         *
         * PURPOSE: Quick elimination of obviously composite numbers
         * BENEFIT: ~80% of candidates eliminated before expensive Miller-Rabin test
         *
         * First 36 primes (up to 151)
         */
        SMALL_PRIMES: [
            2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
            73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151
        ],

        /**
         * Maximum message size as fraction of modulus
         * For educational RSA without padding
         *
         * RATIONALE: Message must be < n for unambiguous encryption/decryption
         */
        MAX_MESSAGE_SIZE_RATIO: 0.95,

        /**
         * Minimum difference between p and q as fraction of key size
         *
         * SECURITY: If |p - q| is too small, Fermat factorization can break RSA
         * REQUIREMENT: |p - q| should be > 2^(bits/2 - 10)
         */
        MIN_PQ_DIFFERENCE_BITS: 10,
    },

    // ========================================================================
    // DISPLAY TEMPLATES
    // ========================================================================

    /**
     * HTML/text templates for consistent messaging
     *
     * USE PLACEHOLDERS: {variable} will be replaced at runtime
     */
    TEMPLATES: {
        // Error messages
        ERROR_GENERIC: '⚠️ Error: {message}',
        ERROR_NETWORK: '🌐 Network Error: {message}',
        ERROR_COMPUTATION: '🔢 Computation Error: {message}',
        ERROR_VALIDATION: '❌ Validation Error: {message}',

        // Success messages
        SUCCESS_GENERIC: '✓ {message}',
        SUCCESS_COPIED: '✓ Copied to clipboard!',
        SUCCESS_GENERATED: '✓ {item} generated successfully',
        SUCCESS_COMPUTED: '✓ Computation complete ({duration})',

        // Warning messages
        WARNING_GENERIC: '⚠️ Warning: {message}',
        WARNING_SECURITY: '🔒 Security Warning: {message}',
        WARNING_DEPRECATED: '⚠️ Deprecated: {message}',

        // Info messages
        INFO_LOADING: 'Loading...',
        INFO_PROCESSING: 'Processing...',
        INFO_COMPUTING: 'Computing {operation}...',

        // Loading indicators
        LOADING_SPINNER: '<div class="loading"><div class="spinner"></div>{message}</div>',
        LOADING_PROGRESS: '<div class="loading-progress"><div class="progress-bar" style="width: {percent}%"></div>{message}</div>',

        // Educational notes
        EDUCATIONAL_NOTE: '<div class="educational-note"><strong>📚 Educational Note:</strong> {message}</div>',
        SECURITY_NOTE: '<div class="security-note"><strong>🔒 Security Note:</strong> {message}</div>',
    },

    /**
     * Replace placeholders in template strings
     *
     * @param {string} template - Template string with {placeholder} syntax
     * @param {Object} values - Object with placeholder values
     * @returns {string} - Template with values substituted
     *
     * EXAMPLE:
     *   formatTemplate('Error: {message}', { message: 'Invalid input' })
     *   => 'Error: Invalid input'
     */
    formatTemplate(template, values) {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return values.hasOwnProperty(key) ? values[key] : match;
        });
    },

    // ========================================================================
    // FEATURE FLAGS
    // ========================================================================

    /**
     * Feature flags for enabling/disabling functionality
     *
     * USE CASE: Gradual rollout, A/B testing, development features
     */
    FEATURES: {
        /**
         * Enable auto-setup common UI patterns when DOM is ready
         */
        ENABLE_AUTO_INIT_UI: true,

        /**
         * Enable real-time hash computation (as user types)
         */
        ENABLE_REALTIME_HASH: true,

        /**
         * Enable Web Workers for background computation
         * (Not yet implemented, but reserved for Phase 2)
         */
        ENABLE_WEB_WORKERS: false,

        /**
         * Enable detailed performance metrics
         */
        ENABLE_PERFORMANCE_METRICS: true,

        /**
         * Enable debug logging to console
         */
        ENABLE_DEBUG_LOGGING: false,

        /**
         * Enable experimental features (use with caution)
         */
        ENABLE_EXPERIMENTAL: false,
    },

    // ========================================================================
    // DEVELOPMENT & DEBUGGING
    // ========================================================================

    /**
     * Development and debugging configuration
     */
    DEBUG: {
        /**
         * Enable verbose console logging
         */
        VERBOSE: false,

        /**
         * Log all function calls (for debugging)
         */
        LOG_FUNCTION_CALLS: false,

        /**
         * Log performance metrics
         */
        LOG_PERFORMANCE: true,

        /**
         * Show debug UI elements
         */
        SHOW_DEBUG_UI: false,

        /**
         * Prefix for debug log messages
         */
        LOG_PREFIX: '[Mathematical-Foundations]',
    },

    // ========================================================================
    // ACCESSIBILITY
    // ========================================================================

    /**
     * Accessibility settings (WCAG 2.1 compliance)
     */
    A11Y: {
        /**
         * Minimum contrast ratio for text (WCAG AA: 4.5:1, AAA: 7:1)
         */
        MIN_CONTRAST_RATIO: 4.5,

        /**
         * Enable reduced motion for animations (respects prefers-reduced-motion)
         */
        RESPECT_REDUCED_MOTION: true,

        /**
         * Enable keyboard navigation hints
         */
        SHOW_KEYBOARD_HINTS: true,

        /**
         * Enable screen reader announcements for state changes
         */
        ENABLE_ARIA_LIVE: true,
    },

    // ========================================================================
    // PERFORMANCE
    // ========================================================================

    /**
     * Performance optimization settings
     */
    PERFORMANCE: {
        /**
         * Yield to event loop every N iterations
         * Prevents UI freezing during long computations
         */
        YIELD_INTERVAL: 10,

        /**
         * Batch DOM updates (wait for multiple changes, apply once)
         */
        BATCH_DOM_UPDATES: true,

        /**
         * Use requestAnimationFrame for visual updates
         */
        USE_RAF_FOR_UPDATES: true,

        /**
         * Maximum time (ms) before yielding to event loop
         */
        MAX_BLOCKING_TIME: 100,
    },
};

// ============================================================================
// MAKE AVAILABLE GLOBALLY
// ============================================================================

/**
 * Export Config object to global scope
 *
 * WHY GLOBAL:
 * - Configuration needs to be accessible everywhere
 * - ES6 modules not yet universally supported in older browsers
 * - Simpler than import/export for this educational project
 *
 * ALTERNATIVE APPROACH (for production):
 * Use ES6 modules: export default Config;
 * Then: import Config from './config.js';
 */
if (typeof window !== 'undefined') {
    window.Config = Config;

    // Freeze config to prevent accidental modification
    // This makes Config immutable (can't change values at runtime)
    Object.freeze(Config.UI);
    Object.freeze(Config.SECURITY);
    Object.freeze(Config.ALGORITHMS);
    Object.freeze(Config.RSA);
    Object.freeze(Config.TEMPLATES);
    Object.freeze(Config.FEATURES);
    Object.freeze(Config.DEBUG);
    Object.freeze(Config.A11Y);
    Object.freeze(Config.PERFORMANCE);

    console.log('✓ Configuration module loaded');

    // Debug logging (only if enabled)
    if (Config.DEBUG.VERBOSE) {
        console.log('Configuration:', Config);
    }
}

// ============================================================================
// VALIDATION & SANITY CHECKS
// ============================================================================

/**
 * Validate configuration on load
 * Catches configuration errors early
 */
(function validateConfig() {
    // Check that all required sections exist
    const requiredSections = ['UI', 'SECURITY', 'ALGORITHMS', 'RSA', 'TEMPLATES', 'FEATURES'];

    for (const section of requiredSections) {
        if (!Config[section]) {
            console.error(`❌ Configuration error: Missing required section '${section}'`);
        }
    }

    // Validate RSA key sizes are reasonable
    for (const keySize of Config.RSA.KEY_SIZES) {
        if (keySize < 512 || keySize > 8192) {
            console.warn(`⚠️ Configuration warning: Unusual RSA key size ${keySize} bits`);
        }
        if (keySize % 2 !== 0) {
            console.error(`❌ Configuration error: RSA key size ${keySize} must be even`);
        }
    }

    // Validate algorithm info completeness
    for (const [algo, info] of Object.entries(Config.ALGORITHMS)) {
        const requiredFields = ['name', 'outputBits', 'blockSize', 'security', 'status'];
        for (const field of requiredFields) {
            if (!info[field]) {
                console.error(`❌ Configuration error: Algorithm ${algo} missing field '${field}'`);
            }
        }
    }

    console.log('✓ Configuration validation passed');
})();
