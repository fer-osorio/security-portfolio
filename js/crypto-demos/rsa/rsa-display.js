/**
 * ============================================================================
 * RSA DISPLAY COMPONENTS
 *
 * RSA-specific UI components extracted from display-components.js.
 *
 * DEPENDENCIES: DisplayComponents, MathUtils, UIUtils, Config
 * ============================================================================
 */

const RSADisplay = {

    /**
     * Create a key display card (for RSA public/private keys)
     *
     * @param {Object} options
     * @param {string} options.title - Card title
     * @param {Object} options.publicKey - { e, n }
     * @param {Object} options.privateKey - { d }
     * @param {Object} options.educational - { p, q, phi } (optional)
     * @returns {string} - HTML string
     */
    createKeyDisplayCard(options) {
        const { title, publicKey, privateKey, educational } = options;
        const { e, n } = publicKey;

        let html = `
        <div class="card card--key-section">
            <h3>${UIUtils.escapeHtml(title)}</h3>

            <div class="card--key-section">
                <h4>🔓 Public Key (shareable)</h4>
                ${DisplayComponents.createCodeValueDisplay('Modulus (n)', n.toString(), 'display-n')}
                ${DisplayComponents.createCodeValueDisplay('Public Exponent (e)', e.toString(), 'display-e')}
                <p class="key-info">Bit length: ${MathUtils.bitLength(n)} bits</p>
            </div>
        `;

        const { d } = privateKey;
        if (privateKey) {
            html += `
            <div class="card--key-section private-key">
                <h4>🔒 Private Key (keep secret!)</h4>
                ${DisplayComponents.createCodeValueDisplay('Private Exponent (d)', d.toString(), 'display-d')}
                <div class="alert alert--warning">
                    ⚠️ Never share your private key! In production systems, this would be stored in a Hardware Security Module (HSM).
                </div>
            </div>
            `;
        }

        if (educational) {
            const { p, q, phi } = educational;
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
    },

    /**
     * Create encryption result display
     *
     * @param {Object} options
     * @param {string} options.originalMessage - Original plaintext
     * @param {string} options.messageInt - Message as BigInt string
     * @param {string} options.ciphertext - Encrypted ciphertext string
     * @param {string} options.duration - Computation time
     * @param {Object} options.publicKey - {e, n}
     * @returns {string} - HTML string
     */
    createEncryptionResult(options) {
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
                    { label: 'n (modulus)', value: n.toString().substring(0, 50) + '...' }
                ],
                result: `c = ${ciphertext}`
            })}

            ${DisplayComponents.createSecurityAlert('This is "textbook RSA" without padding. In production, always use OAEP padding to prevent attacks.')}
        </div>
        `;
    },

    /**
     * Create decryption result display
     *
     * @param {Object} options
     * @param {string} options.ciphertext - Input ciphertext
     * @param {string} options.plaintextInt - Decrypted as BigInt string
     * @param {string} options.plaintextStr - Recovered message
     * @param {string} options.duration - Computation time
     * @param {Object} options.privateKey - {d, n}
     * @returns {string} - HTML string
     */
    createDecryptionResult(options) {
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
                    { label: 'n (modulus)', value: n.toString().substring(0, 50) + '...' }
                ],
                result: `m = ${plaintextInt}`,
                decoded: `${plaintextStr}`
            })}
        </div>
        `;
    }
};

if (typeof window !== 'undefined') {
    window.RSADisplay = RSADisplay;
}
