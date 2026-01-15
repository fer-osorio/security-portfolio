/**
 * ============================================================================
 * RSA INTERACTIVE TOOL - UI CONTROLLER
 *
 * This module handles all user interactions and updates the DOM.
 * It acts as the "controller" in MVC architecture.
 *
 * - Uses shared UIUtils for common DOM operations
 * - Uses DisplayComponents for consistent HTML generation
 * - Uses Config for all constants and configuration
 * - Removed duplicate code (escapeHtml, setupCopyButtons, setupTabs, etc.)
 * - Kept RSA-specific logic (key generation UI, progress updates)
 *
 * ============================================================================
 */

// ============================================================================
// GLOBAL STATE (stored in memory, never persisted)
// ============================================================================

let currentKeys = null;
let lastCiphertext = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the RSA demo when page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('RSA Demo initialized');

    // Check if we're in a secure context (required for crypto operations)
    if (!window.isSecureContext) {
        showSecurityWarning();
    }

    // Set up event listeners
    setupEventListeners();

    // Display initial educational content
    displayWelcomeMessage();
});

// ============================================================================
// EVENT HANDLER SETUP
// ============================================================================

/**
 * Set up all event listeners for user interactions
 */
function setupEventListeners() {
    // Key generation
    const generateBtn = document.getElementById('generate-keys-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateKeys);
    }

    // Encryption
    const encryptBtn = document.getElementById('encrypt-btn');
    if (encryptBtn) {
        encryptBtn.addEventListener('click', handleEncrypt);
    }

    // Decryption
    const decryptBtn = document.getElementById('decrypt-btn');
    if (decryptBtn) {
        decryptBtn.addEventListener('click', handleDecrypt);
    }

    // Use shared utilities for common patterns
    UIUtils.setupCopyButtons();
    UIUtils.setupTabs();
}

// ============================================================================
// KEY GENERATION HANDLERS
// ============================================================================

/**
 * Handle key generation button click
 */
async function handleGenerateKeys() {
    const keySizeSelect = document.getElementById('key-size');
    const keySize = parseInt(keySizeSelect.value);

    // Use shared button state management
    const generateBtn = document.getElementById('generate-keys-btn');
    UIUtils.setButtonLoading(generateBtn, 'Generating...');

    // Use shared result clearing
    UIUtils.clearResults(['key-gen-results', 'encryption-results', 'decryption-results']);

    // Show progress using shared utility
    const progressDiv = document.getElementById('key-gen-progress');
    UIUtils.showLoading(progressDiv, 'Initializing key generation...');

    try {
        const startTime = performance.now();

        // Generate keys with progress callback
        const keys = await RSACore.generateKeyPair(keySize, (stage, data) => {
            updateProgress(stage, data);
        });

        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        // Store keys in memory (NEVER persist to localStorage!)
        currentKeys = keys;

        // Display results
        displayKeys(keys, duration);

        // Enable encryption/decryption
        document.getElementById('encrypt-btn').disabled = false;

        console.log('Key generation successful:', keys);

    } catch (error) {
        console.error('Key generation failed:', error);
        UIUtils.showError('Key generation failed: ' + error.message);
    } finally {
        // Re-enable button using shared utility
        UIUtils.resetButton(generateBtn, 'Generate RSA Keys');
        UIUtils.hideLoading(progressDiv);
    }
}

/**
 * Update progress display during key generation
 *
 * RSA-SPECIFIC
 */
function updateProgress(stage, data) {
    const progressDiv = document.getElementById('key-gen-progress');

    // Use shared scroll utility
    UIUtils.scrollToElement(progressDiv, Config.UI.SCROLL_BLOCK_CENTER);

    // RSA-SPECIFIC progress messages
    let message = '';
    switch(stage) {
        case 'Generating prime p':
            message = '<p><strong>Step 1/4:</strong> Generating prime p...</p>';
            if (data) {
                message += `<p class="progress-detail">Attempt ${data.attempt}${data.isPrime ? ' ✓ Prime found!' : ''}</p>`;
            }
            break;
        case 'Generating prime q':
            message = '<p><strong>Step 2/4:</strong> Generating prime q...</p>';
            if (data) {
                message += `<p class="progress-detail">Attempt ${data.attempt}${data.isPrime ? ' ✓ Prime found!' : ''}</p>`;
            }
            break;
        case 'Computing modulus n':
            message = '<p><strong>Step 3/4:</strong> Computing modulus n = p × q...</p>';
            break;
        case 'Computing φ(n)':
            message = '<p><strong>Step 3/4:</strong> Computing Euler\'s totient φ(n)...</p>';
            break;
        case 'Computing private exponent d':
            message = '<p><strong>Step 4/4:</strong> Computing private exponent d...</p>';
            break;
        case 'Complete':
            message = '<p><strong>✓ Key generation complete!</strong></p>';
            break;
    }

    progressDiv.innerHTML = message;
}

/**
 * Display generated keys in the UI
 */
function displayKeys(keys, duration) {
    const resultsDiv = document.getElementById('key-gen-results');

    // Use DisplayComponents for consistent HTML generation
    const keyDisplay = DisplayComponents.createKeyDisplayCard({
        title: `✓ RSA Keys Generated (${duration}s)`,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        educational: {
            p: keys.p,
            q: keys.q,
            phi: keys.phi
        }
    });

    // Use shared display utility
    UIUtils.displayResults('key-gen-results', keyDisplay, true);

    // Setup copy buttons for the newly rendered content
    UIUtils.setupCopyButtons();
}

// ============================================================================
// ENCRYPTION HANDLERS
// ============================================================================

/**
 * Handle encryption button click
 */
async function handleEncrypt() {
    if (!currentKeys) {
        UIUtils.showError('Please generate keys first!');
        return;
    }

    const messageInput = document.getElementById('plaintext-input');
    const message = messageInput.value.trim();

    if (!message) {
        UIUtils.showError('Please enter a message to encrypt');
        return;
    }

    try {
        // Convert message to BigInt
        const messageInt = MathUtils.stringToBigInt(message);

        // Check if message is too large
        if (messageInt >= currentKeys.publicKey.n) {
            const maxBytes = Math.floor(MathUtils.bitLength(currentKeys.publicKey.n) / 8) - 1;
            UIUtils.showError(`Message too large! Maximum message length: ~${maxBytes} bytes. Your message: ${message.length} bytes.`);
            return;
        }

        // Encrypt
        const startTime = performance.now();
        const ciphertext = RSACore.encrypt(messageInt, currentKeys.publicKey);
        const endTime = performance.now();
        const duration = ((endTime - startTime)).toFixed(2);

        // Store ciphertext for decryption
        lastCiphertext = ciphertext;

        // Display results using shared component
        displayEncryptionResults(message, messageInt, ciphertext, duration);

        // Enable decryption
        document.getElementById('decrypt-btn').disabled = false;

        console.log('Encryption successful');

    } catch (error) {
        console.error('Encryption failed:', error);
        UIUtils.showError('Encryption failed: ' + error.message);
    }
}

/**
 * Display encryption results
 */
function displayEncryptionResults(originalMessage, messageInt, ciphertext, duration) {
    const encryptionDisplay = DisplayComponents.createEncryptionResult({
        originalMessage,
        messageInt: messageInt.toString(),
        ciphertext: ciphertext.toString(),
        duration,
        publicKey: currentKeys.publicKey
    });

    UIUtils.displayResults('encryption-results', encryptionDisplay, true);

    // Populate ciphertext in decryption input
    const decryptInput = document.getElementById('ciphertext-input');
    if (decryptInput) {
        decryptInput.value = ciphertext.toString();
    }

    // Setup copy buttons for the newly rendered content
    UIUtils.setupCopyButtons();
}

// ============================================================================
// DECRYPTION HANDLERS
// ============================================================================

/**
 * Handle decryption button click
 */
async function handleDecrypt() {
    if (!currentKeys) {
        UIUtils.showError('Please generate keys first!');
        return;
    }

    const ciphertextInput = document.getElementById('ciphertext-input');
    let ciphertextStr = ciphertextInput.value.trim();

    if (!ciphertextStr) {
        UIUtils.showError('Please enter ciphertext to decrypt');
        return;
    }

    try {
        // Parse ciphertext as BigInt
        const ciphertext = BigInt(ciphertextStr);

        // Decrypt
        const startTime = performance.now();
        const plaintextInt = RSACore.decrypt(ciphertext, currentKeys.privateKey);
        const endTime = performance.now();
        const duration = ((endTime - startTime)).toFixed(2);

        // Convert back to string
        const plaintextStr = MathUtils.bigIntToString(plaintextInt);

        // Display results using shared component
        displayDecryptionResults(ciphertext, plaintextInt, plaintextStr, duration);

        console.log('Decryption successful');

    } catch (error) {
        console.error('Decryption failed:', error);
        UIUtils.showError('Decryption failed: ' + error.message);
    }
}

/**
 * Display decryption results
 */
function displayDecryptionResults(ciphertext, plaintextInt, plaintextStr, duration) {
    const decryptionDisplay = DisplayComponents.createDecryptionResult({
        ciphertext: ciphertext.toString(),
        plaintextInt: plaintextInt.toString(),
        plaintextStr,
        duration,
        privateKey: currentKeys.privateKey
    });

    UIUtils.displayResults('decryption-results', decryptionDisplay, true);
}

// ============================================================================
// INITIAL DISPLAY
// ============================================================================

/**
 * Display welcome message with instructions
 *
 * RSA-SPECIFIC: Welcome content is tool-specific
 */
function displayWelcomeMessage() {
    const welcomeDiv = document.getElementById('welcome-message');
    if (welcomeDiv) {
        welcomeDiv.innerHTML = `
        <div class="welcome-content">
            <h2>Welcome to the RSA Interactive Tool</h2>
            <p>This tool demonstrates the RSA cryptosystem in action. Follow these steps:</p>
            <ol>
                <li><strong>Generate Keys:</strong> Create an RSA key pair (public and private)</li>
                <li><strong>Encrypt:</strong> Enter a message and encrypt it with the public key</li>
                <li><strong>Decrypt:</strong> Use the private key to recover the original message</li>
            </ol>
        ${DisplayComponents.createEducationalNote(
            'This tool is designed for learning. It implements "textbook RSA" without padding schemes. ' +
            'Real-world RSA uses OAEP padding and proper key management in Hardware Security Modules (HSMs).'
        )}
        </div>
        `;
    }
}

/**
 * Show security warning if not in secure context
 */
function showSecurityWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'alert alert--banner alert--warning';
    warningDiv.innerHTML = DisplayComponents.createWarningAlert(
        'Security Warning',
        'This page is not in a secure context (HTTPS). Cryptographic operations may be limited. ' +
        'For full functionality, please access via HTTPS or localhost.'
    );
    document.body.insertBefore(warningDiv, document.body.firstChild);
}
