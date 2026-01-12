/**
 * ============================================================================
 * RSA INTERACTIVE TOOL - UI CONTROLLER
 *
 * This module handles all user interactions and updates the DOM.
 * It acts as the "controller" in MVC architecture.
 *
 * SEPARATION OF CONCERNS:
 * - rsa-core.js: Pure cryptographic logic (no UI dependencies)
 * - rsa-demo.js: UI logic (DOM manipulation, event handling)
 *
 * This separation allows:
 * - Testing crypto logic independently
 * - Reusing crypto code in other contexts
 * - Changing UI without touching crypto implementation
 *
 * ============================================================================
 */

// Global state (stored in memory, never persisted)
let currentKeys = null;
let lastCiphertext = null;

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

    // Copy buttons
    setupCopyButtons();

    // Tab switching
    setupTabs();
}

/**
 * Handle key generation button click
 */
async function handleGenerateKeys() {
    const keySizeSelect = document.getElementById('key-size');
    const keySize = parseInt(keySizeSelect.value);

    // Disable button during generation
    const generateBtn = document.getElementById('generate-keys-btn');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    // Clear previous results
    clearResults();

    // Show progress
    const progressDiv = document.getElementById('key-gen-progress');

    progressDiv.hidden = false;
    progressDiv.innerHTML = '<p>Initializing key generation...</p>';

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
        showError('Key generation failed: ' + error.message);
    } finally {
        // Re-enable button
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate RSA Keys';
        progressDiv.style.display = 'none';
    }
}

/**
 * Update progress display during key generation
 */
function updateProgress(stage, data) {
    const progressDiv = document.getElementById('key-gen-progress');

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
    resultsDiv.style.display = 'block';

    const { publicKey, privateKey, p, q, phi } = keys;
    const { e, n } = publicKey;
    const { d } = privateKey;

    resultsDiv.innerHTML = `
    <div class="card card--key-section">
        <h3>✓ RSA Keys Generated (${duration}s)</h3>

        <div class="card--key-section">
            <h4>🔓 Public Key (shareable)</h4>
            <div class="code-value">
                <label>Modulus (n):</label>
                <code id="display-n">${n.toString()}</code>
                <button class="copy-btn" data-copy="display-n">Copy</button>
            </div>
            <div class="code-value">
                <label>Public Exponent (e):</label>
                <code id="display-e">${e.toString()}</code>
                <button class="copy-btn" data-copy="display-e">Copy</button>
            </div>
            <p class="key-info">Bit length: ${MathUtils.bitLength(n)} bits</p>
        </div>

        <div class="card--key-section private-key">
            <h4>🔐 Private Key (keep secret!)</h4>
            <div class="code-value">
                <label>Private Exponent (d):</label>
                <code id="display-d">${d.toString()}</code>
                <button class="copy-btn" data-copy="display-d">Copy</button>
            </div>
            <p class="alert alert--warning">
            ⚠️ Never share your private key! In production systems, this would be stored in a Hardware Security Module (HSM).
            </p>
        </div>

        <div class="card--key-section educational">
            <h4>📚 Educational Details (not normally shown)</h4>
            <div class="code-value">
                <label>Prime p:</label>
                <code id="display-p">${p.toString()}</code>
            </div>
            <div class="code-value">
                <label>Prime q:</label>
                <code id="display-q">${q.toString()}</code>
            </div>
            <div class="code-value">
                <label>φ(n) = (p-1)(q-1):</label>
                <code id="display-phi">${phi.toString()}</code>
            </div>
            <div class="math-explanation">
                <p><strong>Key Relationship:</strong></p>
                <p>e × d ≡ 1 (mod φ(n))</p>
                <p>
                    Verification: <br>
                    (e × d) mod φ(n) = ${((e * d) % phi).toString()}</p>
            </div>
        </div>
    </div>
    `;

    // Setup copy buttons
    setupCopyButtons();
}

/**
 * Handle encryption button click
 */
async function handleEncrypt() {
    if (!currentKeys) {
        showError('Please generate keys first!');
        return;
    }

    const messageInput = document.getElementById('plaintext-input');
    const message = messageInput.value.trim();

    if (!message) {
        showError('Please enter a message to encrypt');
        return;
    }

    try {
        // Convert message to BigInt
        const messageInt = MathUtils.stringToBigInt(message);

        // Check if message is too large
        if (messageInt >= currentKeys.publicKey.n) {
            const maxBytes = Math.floor(MathUtils.bitLength(currentKeys.publicKey.n) / 8) - 1;
            showError(`Message too large! Maximum message length: ~${maxBytes} bytes. Your message: ${message.length} bytes.`);
            return;
        }

        // Encrypt
        const startTime = performance.now();
        const ciphertext = RSACore.encrypt(messageInt, currentKeys.publicKey);
        const endTime = performance.now();
        const duration = ((endTime - startTime)).toFixed(2);

        // Store ciphertext for decryption
        lastCiphertext = ciphertext;

        // Display results
        displayEncryptionResults(message, messageInt, ciphertext, duration);

        // Enable decryption
        document.getElementById('decrypt-btn').disabled = false;

        console.log('Encryption successful');

    } catch (error) {
        console.error('Encryption failed:', error);
        showError('Encryption failed: ' + error.message);
    }
}

/**
 * Display encryption results
 */
function displayEncryptionResults(originalMessage, messageInt, ciphertext, duration) {
    const resultsDiv = document.getElementById('encryption-results');
    resultsDiv.style.display = 'block';

    const { e, n } = currentKeys.publicKey;

    resultsDiv.innerHTML = `
    <div class="card card--result">
        <h3>✓ Encryption Complete (${duration}ms)</h3>

        <div class="card--result">
            <h4>Original Message</h4>
            <code class="message-display">${escapeHtml(originalMessage)}</code>
        </div>

        <div class="card--result">
            <p>Message converted to number (base-256 encoding):</p>
            <div class="code-value">
                <label>Numeric Representation</label>
                <code id="message-int">${messageInt.toString()}</code>
            </div>
            <button class="copy-btn" data-copy="message-int">Copy</button>
        </div>

        <div class="card--result">
            <p>Encrypted value: c = m<sup>e</sup> mod n</p>
            <div class="code-value">
                <label>Ciphertext</label>
                <code id="ciphertext">${ciphertext.toString()}</code>
            </div>
            <button class="copy-btn" data-copy="ciphertext">Copy</button>
        </div>

        <div class="math-breakdown">
            <h4>Mathematical Breakdown</h4>
            <div class="calculation">
                <p><strong>Operation:</strong> c = m<sup>e</sup> mod n</p>
                <p><strong>Values:</strong></p>
                <ul>
                    <li>m (message) = ${messageInt.toString()}</li>
                    <li>e (public exponent) = <br> ${e.toString()}</li>
                    <li>n (modulus) = ${n.toString().substring(0, 50)}...</li>
                </ul>
                <p><strong>Result:</strong> c = ${ciphertext.toString()}</p>
            </div>
        </div>

        <div class="alert alert--security-note">
            <p><strong>⚠️ Security Note:</strong> This is "textbook RSA" without padding.</p>
            <p>In production, always use OAEP padding to prevent attacks.</p>
        </div>
    </div>
    `;

    // Populate ciphertext in decryption input
    const decryptInput = document.getElementById('ciphertext-input');
    if (decryptInput) {
        decryptInput.value = ciphertext.toString();
    }

    setupCopyButtons();
}

/**
 * Handle decryption button click
 */
async function handleDecrypt() {
    if (!currentKeys) {
        showError('Please generate keys first!');
        return;
    }

    const ciphertextInput = document.getElementById('ciphertext-input');
    let ciphertextStr = ciphertextInput.value.trim();

    if (!ciphertextStr) {
        showError('Please enter ciphertext to decrypt');
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

        // Display results
        displayDecryptionResults(ciphertext, plaintextInt, plaintextStr, duration);

        console.log('Decryption successful');

    } catch (error) {
        console.error('Decryption failed:', error);
        showError('Decryption failed: ' + error.message);
    }
}

/**
 * Display decryption results
 */
function displayDecryptionResults(ciphertext, plaintextInt, plaintextStr, duration) {
    const resultsDiv = document.getElementById('decryption-results');
    resultsDiv.style.display = 'block';

    const { d, n } = currentKeys.privateKey;

    resultsDiv.innerHTML = `
    <div class="card card--result">
        <h3>✓ Decryption Complete (${duration}ms)</h3>

        <div class="card--result">
            <h4>Original Ciphertext</h4>
            <div class="code-value">
                <label>Ciphertext</label>
                <code>${ciphertext.toString()}</code>
            </div>
        </div>

        <div class="card--result">
            <h4>Decrypted Number</h4>
            <div class="code-value">
                <label>Decrypted</label>
                <code>${plaintextInt.toString()}</code>
            </div>
        </div>

        <div class="card--result success">
            <h4>Recovered Message</h4>
            <code class="message-display">${escapeHtml(plaintextStr)}</code>
        </div>

        <div class="math-breakdown">
            <h4>Mathematical Breakdown</h4>
            <div class="calculation">
                <p><strong>Operation:</strong> m = c<sup>d</sup> mod n</p>
                <p><strong>Values:</strong></p>
                <ul>
                    <li>c (ciphertext) = ${ciphertext.toString()}</li>
                    <li>d (private exponent) = ${d.toString().substring(0, 50)}...</li>
                    <li>n (modulus) = ${n.toString().substring(0, 50)}...</li>
                </ul>
                <p><strong>Result:</strong> m = ${plaintextInt.toString()}</p>
                <p><strong>Decoded:</strong> "${escapeHtml(plaintextStr)}"</p>
            </div>
        </div>
    </div>
    `;
}

/**
 * Setup copy-to-clipboard functionality
 */
function setupCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-btn');

    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-copy');
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                const text = targetElement.textContent;

                navigator.clipboard.writeText(text).then(() => {
                    // Visual feedback
                    const originalText = this.textContent;
                    this.textContent = '✓ Copied!';
                    this.classList.add('copied');

                    setTimeout(() => {
                        this.textContent = originalText;
                        this.classList.remove('copied');
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    showError('Failed to copy to clipboard');
                });
            }
        });
    });
}

/**
 * Setup tab switching functionality
 */
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-button');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

            // Add active class to clicked tab and corresponding panel
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

/**
 * Display welcome message with instructions
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
            <div class="educational-note">
                <p><strong>📚 Educational Purpose:</strong> This tool is designed for learning. It implements "textbook RSA" without padding schemes. Real-world RSA uses OAEP padding and proper key management in Hardware Security Modules (HSMs).</p>
            </div>
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
    warningDiv.innerHTML = `
    <p><strong>⚠️ Security Warning:</strong> This page is not in a secure context (HTTPS). Cryptographic operations may be limited. For full functionality, please access via HTTPS or localhost.</p>
    `;
    document.body.insertBefore(warningDiv, document.body.firstChild);
}

/**
 * Show error message to user
 */
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert('Error: ' + message);
    }
}

/**
 * Clear all results
 */
function clearResults() {
    const resultsIds = ['key-gen-results', 'encryption-results', 'decryption-results'];
    resultsIds.forEach(id => {
        const div = document.getElementById(id);
        if (div) {
            div.innerHTML = '';
            div.style.display = 'none';
        }
    });
}

/**
 * Escape HTML to prevent XSS
 * SECURITY: Always escape user input before displaying
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
