/**
 * ============================================================================
 * RSA DISPLAY COMPONENTS
 *
 * RSA-specific UI components for rendering keys and operation results.
 * ============================================================================
 */

import { DisplayComponents } from '../../display-components';
import { UIUtils } from '../../ui-utils';
import { bitLength } from './math-utils';
import { RSAPublicKey, RSAPrivateKey } from './rsa-core';

export interface KeyDisplayOptions {
    title:       string;
    publicKey:   RSAPublicKey;
    privateKey:  RSAPrivateKey;
    educational?: {
        p:   bigint;
        q:   bigint;
        phi: bigint;
    };
}

export interface EncryptionResultOptions {
    originalMessage: string;
    messageInt:      string;   // BigInt serialised to string for display
    ciphertext:      string;   // BigInt serialised to string for display
    duration:        string;
    publicKey:       RSAPublicKey;
}

export interface DecryptionResultOptions {
    ciphertext:   string;
    plaintextInt: string;
    plaintextStr: string;
    duration:     string;
    privateKey:   RSAPrivateKey;
}

export function createKeyDisplayCard(options: KeyDisplayOptions): string {
    const { title, publicKey, privateKey, educational } = options;
    const { e, n } = publicKey;

    let html = `
    <div class="card card--key-section">
        <h3>${UIUtils.escapeHtml(title)}</h3>

        <div class="card--key-section">
            <h4>🔓 Public Key (shareable)</h4>
            ${DisplayComponents.createCodeValueDisplay('Modulus (n)', n.toString(), 'display-n')}
            ${DisplayComponents.createCodeValueDisplay('Public Exponent (e)', e.toString(), 'display-e')}
            <p class="key-info">Bit length: ${bitLength(n)} bits</p>
        </div>
    `;

    const { d } = privateKey;
    html += `
    <div class="card--key-section private-key">
        <h4>🔒 Private Key (keep secret!)</h4>
        ${DisplayComponents.createCodeValueDisplay('Private Exponent (d)', d.toString(), 'display-d')}
        <div class="alert alert--warning">
            ⚠️ Never share your private key! In production systems, this would be stored in a Hardware Security Module (HSM).
        </div>
    </div>
    `;

    if (educational) {
        const { p, q, phi } = educational;
        // e, d, phi are all bigint — arithmetic stays in bigint domain
        html += `
        <div class="card--key-section educational">
            <h4>📚 Educational Details (not normally shown)</h4>
            ${DisplayComponents.createCodeValueDisplay('Prime p', p.toString(), 'display-p')}
            ${DisplayComponents.createCodeValueDisplay('Prime q', q.toString(), 'display-q')}
            ${DisplayComponents.createCodeValueDisplay('φ(n) = (p-1)(q-1)', phi.toString(), 'display-phi')}
            <div class="math-explanation">
                <p><strong>Key Relationship:</strong></p>
                <p>e × d ≡ 1 (mod φ(n))</p>
                <p>Verification:</p>
                <p> (e × d) mod φ(n) = ${((e * d) % phi).toString()}</p>
            </div>
        </div>
        `;
    }

    html += '</div>';
    return html;
}

export function createEncryptionResult(options: EncryptionResultOptions): string {
    const { originalMessage, messageInt, ciphertext, duration, publicKey } = options;
    const { e, n } = publicKey;

    return `
    <div class="card card--result">
        <h3>✓ Encryption Complete (${duration}ms)</h3>

        <div class="card--result">
            <h4>Original Message</h4>
            <code class="message-display">${UIUtils.escapeHtml(originalMessage)}</code>
        </div>

        <div class="card--result">
            <p>Message converted to number (base-256 encoding):</p>
            ${DisplayComponents.createCodeValueDisplay('Numeric Representation', messageInt, 'message-int')}
        </div>

        <div class="card--result">
            <p>Encrypted value: c = m<sup>e</sup> mod n</p>
            ${DisplayComponents.createCodeValueDisplay('Ciphertext', ciphertext, 'ciphertext')}
        </div>

        ${DisplayComponents.createMathBreakdown({
            title: 'Mathematical Breakdown',
            operation: 'c = m<sup>e</sup> mod n',
            values: [
                { label: 'm (message)', value: messageInt },
                { label: 'e (public exponent)', value: e.toString() },
                { label: 'n (modulus)', value: n.toString().substring(0, 50) + '...' },
            ],
            result: `c = ${ciphertext}`,
        })}

        ${DisplayComponents.createSecurityAlert('This is "textbook RSA" without padding. In production, always use OAEP padding to prevent attacks.')}
    </div>
    `;
}

export function createDecryptionResult(options: DecryptionResultOptions): string {
    const { ciphertext, plaintextInt, plaintextStr, duration, privateKey } = options;
    const { d, n } = privateKey;

    return `
    <div class="card card--result">
        <h3>✓ Decryption Complete (${duration}ms)</h3>

        <div class="card--result">
            <h4>Original Ciphertext</h4>
            ${DisplayComponents.createCodeValueDisplay('Ciphertext', ciphertext, 'decrypt-ciphertext', false)}
        </div>

        <div class="card--result">
            <h4>Decrypted Number</h4>
            ${DisplayComponents.createCodeValueDisplay('Decrypted', plaintextInt, 'decrypt-plaintext-int', false)}
        </div>

        <div class="card--result success">
            <h4>Recovered Message</h4>
            <code class="message-display">${UIUtils.escapeHtml(plaintextStr)}</code>
        </div>

        ${DisplayComponents.createMathBreakdown({
            title: 'Mathematical Breakdown',
            operation: 'm = c<sup>d</sup> mod n',
            values: [
                { label: 'c (ciphertext)', value: ciphertext },
                { label: 'd (private exponent)', value: d.toString().substring(0, 50) + '...' },
                { label: 'n (modulus)', value: n.toString().substring(0, 50) + '...' },
            ],
            result: `m = ${plaintextInt}`,
            decoded: `${plaintextStr}`,
        })}
    </div>
    `;
}
