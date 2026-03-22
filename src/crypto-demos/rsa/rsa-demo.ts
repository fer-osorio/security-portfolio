/**
 * ============================================================================
 * RSA INTERACTIVE TOOL - UI CONTROLLER
 * ============================================================================
 */

import '../../dark-mode-toggle';
import { generateKeyPair, encrypt, decrypt, RSAKeyPair } from './rsa-core';
import {
    createKeyDisplayCard,
    createEncryptionResult,
    createDecryptionResult,
} from './rsa-display';
import { stringToBigInt, bigIntToString, bitLength } from './math-utils';
import { DisplayComponents, ProgressData } from '../../display-components';
import { UIUtils } from '../../ui-utils';
import { Config } from '../../config';

// ============================================================================
// MODULE STATE
// ============================================================================

let currentKeys: RSAKeyPair | null = null;
let lastCiphertext: string | null = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('RSA Demo initialized');

    if (!window.isSecureContext) {
        showSecurityWarning();
    }

    setupEventListeners();
    displayWelcomeMessage();
});

// ============================================================================
// EVENT HANDLER SETUP
// ============================================================================

function setupEventListeners(): void {
    const generateBtn = document.getElementById('generate-keys-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateKeys);
    }

    const encryptBtn = document.getElementById('encrypt-btn');
    if (encryptBtn) {
        encryptBtn.addEventListener('click', handleEncrypt);
    }

    const decryptBtn = document.getElementById('decrypt-btn');
    if (decryptBtn) {
        decryptBtn.addEventListener('click', handleDecrypt);
    }

    UIUtils.setupCopyButtons();
    UIUtils.setupTabs();
}

// ============================================================================
// KEY GENERATION HANDLERS
// ============================================================================

async function handleGenerateKeys(): Promise<void> {
    const keySizeEl = document.getElementById('key-size');
    if (!keySizeEl) return;
    const keySize = parseInt((keySizeEl as HTMLSelectElement).value, 10);

    const generateBtn = document.getElementById('generate-keys-btn');
    UIUtils.setButtonLoading(generateBtn, 'Generating...');

    UIUtils.clearResults(['key-gen-results', 'encryption-results', 'decryption-results']);

    UIUtils.showLoading('key-gen-progress', 'Initializing key generation...');

    try {
        const startTime = performance.now();

        const keys = await generateKeyPair(keySize, (stage, data) => {
            updateProgress(stage, data);
        });

        const endTime = performance.now();
        const duration = endTime - startTime;

        currentKeys = keys;
        displayKeys(keys, duration);

        const encryptBtnEl = document.getElementById('encrypt-btn');
        if (encryptBtnEl) (encryptBtnEl as HTMLButtonElement).disabled = false;

        console.log('Key generation successful:', keys);

    } catch (error) {
        console.error('Key generation failed:', error);
        UIUtils.showError('Key generation failed: ' + (error as Error).message);
    } finally {
        UIUtils.resetButton(generateBtn, 'Generate RSA Keys');
        UIUtils.hideLoading('key-gen-progress');
    }
}

function updateProgress(stage: string, data: ProgressData | null): void {
    const progressDiv = document.getElementById('key-gen-progress');
    if (!progressDiv) return;

    UIUtils.scrollToElement(progressDiv, Config.UI.SCROLL_BLOCK_CENTER);

    let message = '';
    switch (stage) {
        case 'Generating prime p':
            message = '<p><strong>Step 1/4:</strong> Generating prime p...</p>';
            if (data && data.attempt) {
                message += `<p class="progress-detail">Attempt ${data.attempt}${data.isPrime ? ' ✓ Prime found!' : ''}</p>`;
            }
            break;
        case 'Generating prime q':
            message = '<p><strong>Step 2/4:</strong> Generating prime q...</p>';
            if (data && data.attempt) {
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

function displayKeys(keys: RSAKeyPair, duration: number): void {
    const keyDisplay = createKeyDisplayCard({
        title: `✓ RSA Keys Generated (${(duration / 1000).toFixed(2)}s)`,
        publicKey:  keys.publicKey,
        privateKey: keys.privateKey,
        educational: {
            p:   keys.p,
            q:   keys.q,
            phi: keys.phi,
        },
    });

    UIUtils.displayResults('key-gen-results', keyDisplay, true);
    UIUtils.setupCopyButtons();
}

// ============================================================================
// ENCRYPTION HANDLERS
// ============================================================================

async function handleEncrypt(): Promise<void> {
    if (!currentKeys) {
        UIUtils.showError('Please generate keys first!');
        return;
    }
    const keys = currentKeys;

    const messageInputEl = document.getElementById('plaintext-input');
    if (!messageInputEl) return;
    const message = (messageInputEl as HTMLInputElement).value.trim();

    if (!message) {
        UIUtils.showError('Please enter a message to encrypt');
        return;
    }

    try {
        const messageInt = stringToBigInt(message);

        if (messageInt >= keys.publicKey.n) {
            const maxBytes = Math.floor(bitLength(keys.publicKey.n) / 8) - 1;
            UIUtils.showError(
                `Message too large! Maximum message length: ~${maxBytes} bytes. Your message: ${message.length} bytes.`
            );
            return;
        }

        const startTime = performance.now();
        const ciphertext = encrypt(messageInt, keys.publicKey);
        const endTime = performance.now();
        const duration = endTime - startTime;

        lastCiphertext = ciphertext.toString();
        displayEncryptionResults(message, messageInt, ciphertext, duration);

        const decryptBtnEl = document.getElementById('decrypt-btn');
        if (decryptBtnEl) (decryptBtnEl as HTMLButtonElement).disabled = false;

        console.log('Encryption successful');

    } catch (error) {
        console.error('Encryption failed:', error);
        UIUtils.showError('Encryption failed: ' + (error as Error).message);
    }
}

function displayEncryptionResults(
    originalMessage: string,
    messageInt: bigint,
    ciphertext: bigint,
    duration: number
): void {
    if (!currentKeys) return;

    const encryptionDisplay = createEncryptionResult({
        originalMessage,
        messageInt: messageInt.toString(),
        ciphertext: ciphertext.toString(),
        duration:   duration.toFixed(2),
        publicKey:  currentKeys.publicKey,
    });

    UIUtils.displayResults('encryption-results', encryptionDisplay, true);

    const decryptInputEl = document.getElementById('ciphertext-input');
    if (decryptInputEl) {
        (decryptInputEl as HTMLInputElement).value = ciphertext.toString();
    }

    UIUtils.setupCopyButtons();
}

// ============================================================================
// DECRYPTION HANDLERS
// ============================================================================

async function handleDecrypt(): Promise<void> {
    if (!currentKeys) {
        UIUtils.showError('Please generate keys first!');
        return;
    }
    const keys = currentKeys;

    const ciphertextInputEl = document.getElementById('ciphertext-input');
    if (!ciphertextInputEl) return;
    let ciphertextStr = (ciphertextInputEl as HTMLInputElement).value.trim();

    // Fall back to stored ciphertext if the input field is empty
    if (!ciphertextStr && lastCiphertext) {
        ciphertextStr = lastCiphertext;
    }

    if (!ciphertextStr) {
        UIUtils.showError('Please enter ciphertext to decrypt');
        return;
    }

    let ciphertext: bigint;
    try {
        ciphertext = BigInt(ciphertextStr);
    } catch {
        UIUtils.showError('Invalid ciphertext: must be a valid integer');
        return;
    }

    try {
        const startTime = performance.now();
        const plaintextInt = decrypt(ciphertext, keys.privateKey);
        const endTime = performance.now();
        const duration = endTime - startTime;

        const plaintextStr = bigIntToString(plaintextInt);

        displayDecryptionResults(ciphertext, plaintextInt, plaintextStr, duration);

        console.log('Decryption successful');

    } catch (error) {
        console.error('Decryption failed:', error);
        UIUtils.showError('Decryption failed: ' + (error as Error).message);
    }
}

function displayDecryptionResults(
    ciphertext: bigint,
    plaintextInt: bigint,
    plaintextStr: string,
    duration: number
): void {
    if (!currentKeys) return;

    const decryptionDisplay = createDecryptionResult({
        ciphertext:   ciphertext.toString(),
        plaintextInt: plaintextInt.toString(),
        plaintextStr,
        duration:     duration.toFixed(2),
        privateKey:   currentKeys.privateKey,
    });

    UIUtils.displayResults('decryption-results', decryptionDisplay, true);
}

// ============================================================================
// INITIAL DISPLAY
// ============================================================================

function displayWelcomeMessage(): void {
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

function showSecurityWarning(): void {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'alert alert--banner alert--warning';
    warningDiv.innerHTML = DisplayComponents.createWarningAlert(
        'Security Warning',
        'This page is not in a secure context (HTTPS). Cryptographic operations may be limited. ' +
        'For full functionality, please access via HTTPS or localhost.'
    );
    document.body.insertBefore(warningDiv, document.body.firstChild);
}

export {};
