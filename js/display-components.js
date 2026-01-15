/**
 * ============================================================================
 * DISPLAY COMPONENTS
 *
 * Reusable UI components for displaying cryptographic data consistently
 * across different tools.
 *
 * ARCHITECTURE:
 * - Each function returns HTML string (can be used with innerHTML)
 * - Component-based approach (similar to React components, but vanilla JS)
 * - Parameterized for flexibility
 * - Security-aware (uses UIUtils.escapeHtml for user data)
 *
 * DEPENDENCIES:
 * - Config module (js/config.js)
 * - UIUtils module (js/ui-utils.js)
 * ============================================================================
 */

const DisplayComponents = {

    // ========================================================================
    // CARD COMPONENTS
    // ========================================================================

    /**
     * Create a result card with consistent styling
     *
     * USED IN: Both RSA and hash tools for displaying computation results
     *
     * @param {Object} options - Card configuration
     * @param {string} options.title - Card title
     * @param {string} options.content - Card content (HTML)
     * @param {string} options.className - Additional CSS classes (optional)
     * @param {string} options.icon - Emoji/icon prefix (optional)
     * @returns {string} - HTML string
     *
     * EXAMPLE:
     *   createResultCard({
     *     title: 'Encryption Complete',
     *     content: '<p>Ciphertext: abc123...</p>',
     *     icon: '✓'
     *   })
     */
    createResultCard(options) {
        const {
            title,
            content,
            className = '',
            icon = ''
        } = options;

        return `
        <div class="card card--result ${className}">
        <h3>${icon} ${UIUtils.escapeHtml(title)}</h3>
        ${content}
        </div>
        `;
    },

    /**
     * Create a key display card (for RSA public/private keys)
     *
     * @param {Object} options
     * @param {string} options.title - Card title
     * @param {Object} options.publicKey - { e, n }
     * @param {Object} options.privateKey - { d } (optional)
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
                ${this.createCodeValueDisplay('Modulus (n)', n.toString(), 'display-n')}
                ${this.createCodeValueDisplay('Public Exponent (e)', e.toString(), 'display-e')}
                <p class="key-info">Bit length: ${this._bitLength(n)} bits</p>
            </div>
        `;

        const { d } = privateKey;
        if (privateKey) {
            html += `
            <div class="card--key-section private-key">
                <h4>🔒 Private Key (keep secret!)</h4>
                ${this.createCodeValueDisplay('Private Exponent (d)', d.toString(), 'display-d')}
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
                ${this.createCodeValueDisplay('Prime p', p.toString(), 'display-p')}
                ${this.createCodeValueDisplay('Prime q', q.toString(), 'display-q')}
                ${this.createCodeValueDisplay('φ(n) = (p-1)(q-1)', phi.toString(), 'display-phi')}
                <div class="math-explanation">
                    <p><strong>Key Relationship:</strong></p>
                    <p>e × d ≡ 1 (mod φ(n))</p>
                    <p>Verification: (e × d) mod φ(n) = ${((e * d) % phi).toString()}</p>
                </div>
            </div>
            `;
        }

        html += '</div>';
        return html;
    },

    /**
     * Create a code value display with copy button
     *
     * PATTERN: Label + code block + copy button
     * USED IN: RSA keys, hash outputs, ciphertext
     *
     * @param {string} label - Display label
     * @param {string} value - Code value (will be escaped)
     * @param {string} id - Unique ID for copy functionality
     * @param {boolean} showCopyButton - Whether to show copy button (default: true)
     * @returns {string} - HTML string
     */
    createCodeValueDisplay(label, value, id, showCopyButton = true) {
        return `
        <div class="code-value">
            <label>${UIUtils.escapeHtml(label)}:</label>
            <code id="${id}">${UIUtils.escapeHtml(value)}</code>
            ${showCopyButton ? `<button class="copy-btn" data-copy="${id}">Copy</button>` : ''}
        </div>
        `;
    },

    /**
     * Create a mathematical breakdown display
     *
     * USED IN: RSA encryption/decryption, showing step-by-step computation
     *
     * @param {Object} options
     * @param {string} options.title - Section title
     * @param {string} options.operation - Mathematical operation (e.g., "c = m^e mod n")
     * @param {Array<Object>} options.values - Array of {label, value} objects
     * @param {string} options.result - Final result description
     * @param {string} options.decoded - Final result description decoded (from number to string of characters)
     * @returns {string} - HTML string
     */
    createMathBreakdown(options) {
        const { title, operation, values, result, decoded } = options;

        let valuesHtml = '';
        if (values && values.length > 0) {
            valuesHtml = '<ul>';
            values.forEach(({ label, value }) => {
                valuesHtml += `<li>${UIUtils.escapeHtml(label)} = ${UIUtils.escapeHtml(value)}</li>`;
            });
            valuesHtml += '</ul>';
        }

        return `
        <div class="math-breakdown">
            <h4>${UIUtils.escapeHtml(title)}</h4>
            <div class="calculation">
                <p><strong>Operation:</strong> ${operation}</p>
                ${values  ? '<p><strong>Values:</strong></p>' + valuesHtml : ''}
                ${result  ? `<p><strong>Result:</strong> ${UIUtils.escapeHtml(result)}</p>` : ''}
                ${decoded ? `<p><strong>Decoded:</strong> ${UIUtils.escapeHtml(decoded)}</p>` : ''}
            </div>
        </div>
        `;
    },

    // ========================================================================
    // ALERT COMPONENTS
    // ========================================================================

    /**
     * Create a security alert/warning
     *
     * @param {string} message - Alert message
     * @param {string} type - Alert type: 'warning', 'danger', 'info'
     * @returns {string} - HTML string
     *
     * EXTRACTED FROM: Multiple locations in rsa-demo.js
     */
    createSecurityAlert(message, type = 'warning') {
        const icons = {
            warning: '⚠️',
            danger: '⛔',
            info: 'ℹ️'
        };

        const icon = icons[type] || icons.warning;

        return `
        <div class="alert alert--security-note alert--${type}">
            <p><strong>${icon} Security Note:</strong> ${UIUtils.escapeHtml(message)}</p>
        </div>
        `;
    },

    /**
     * Create an educational note
     *
     * @param {string} message - Educational message
     * @returns {string} - HTML string
     */
    createEducationalNote(message) {
        return `
        <div class="educational-note">
            <p><strong>📚 Educational Note:</strong> ${UIUtils.escapeHtml(message)}</p>
        </div>
        `;
    },

    /**
     * Create a general warning alert
     *
     * @param {string} title - Alert title
     * @param {string} message - Alert message
     * @returns {string} - HTML string
     */
    createWarningAlert(title, message) {
        return `
        <div class="alert alert--warning">
            <p><strong>⚠️ ${UIUtils.escapeHtml(title)}</strong></p>
            <p>${UIUtils.escapeHtml(message)}</p>
        </div>
        `;
    },

    // ========================================================================
    // DATA VISUALIZATION COMPONENTS
    // ========================================================================

    /**
     * Create bit-level visualization for avalanche effect
     *
     * USED IN: Hash tool avalanche effect display
     *
     * @param {Array<Object>} bitDiff - Array of {bit, status, position}
     * @param {number} bitsPerRow - Bits to display per row (default: 64)
     * @returns {string} - HTML string
     */
    createBitVisualization(bitDiff, bitsPerRow = 64) {
        let html = '<div class="bit-visualization">';

        for (let i = 0; i < bitDiff.length; i += bitsPerRow) {
            const row = bitDiff.slice(i, i + bitsPerRow);
            html += '<div class="bit-row">';

            for (const bitInfo of row) {
                const className = bitInfo.status === 'same' ? 'bit-same' : 'bit-different';
                html += `<span class="${className}" title="Bit ${bitInfo.position}: ${bitInfo.bit}">${bitInfo.bit}</span>`;
            }

            html += '</div>';
        }

        html += `
            <div class="bit-legend">
                <span class="legend-item"><span class="bit-same">█</span> Same bit</span>
                <span class="legend-item"><span class="bit-different">█</span> Flipped bit</span>
            </div>
        </div>`;

        return html;
    },

    /**
     * Create progress display for key generation
     *
     * @param {string} stage - Current stage description
     * @param {Object} data - Progress data (optional)
     * @returns {string} - HTML string
     */
    createProgressDisplay(stage, data = null) {
        let html = `<p><strong>${UIUtils.escapeHtml(stage)}</strong></p>`;

        if (data) {
            if (data.attempt) {
                html += `<p class="progress-detail">Attempt ${data.attempt}${data.isPrime ? ' ✓ Prime found!' : ''}</p>`;
            }
            if (data.percent) {
                html +=
                `<div class="progress-bar">
                    <div class="progress-fill" style="width: ${data.percent}%">
                    </div>
                </div>`;
            }
        }

        return html;
    },

    /**
     * Create statistics grid
     *
     * USED IN: Hash tool avalanche effect, birthday attack
     *
     * @param {Array<Object>} stats - Array of {label, value, color} objects
     * @returns {string} - HTML string
     */
    createStatisticsGrid(stats) {
        let html = '<div class="stat-grid">';

        stats.forEach(({ label, value, color }) => {
            const style = color ? `style="color: ${color}"` : '';
            html += `
            <div class="stat-item">
                <span class="stat-value" ${style}>${UIUtils.escapeHtml(value)}</span>
                <span class="stat-label">${UIUtils.escapeHtml(label)}</span>
            </div>
            `;
        });

        html += '</div>';
        return html;
    },

    /**
     * Create comparison display (before/after, original/modified)
     *
     * USED IN: Hash tool avalanche effect
     *
     * @param {Object} options
     * @param {Object} options.original - {title, content}
     * @param {Object} options.modified - {title, content}
     * @param {string} options.arrow - Arrow/indicator between items (default: '→')
     * @returns {string} - HTML string
     */
    createComparisonDisplay(options) {
        const { original, modified, arrow = '→' } = options;

        return `
        <div class="comparison-section">
            <div class="comparison-item">
                <h4>${UIUtils.escapeHtml(original.title)}</h4>
                ${original.content}
            </div>

            <div class="comparison-arrow">${arrow}</div>

            <div class="comparison-item">
                <h4>${UIUtils.escapeHtml(modified.title)}</h4>
                ${modified.content}
            </div>
        </div>
        `;
    },

    // ========================================================================
    // METADATA & INFO COMPONENTS
    // ========================================================================

    /**
     * Create metadata table
     *
     * @param {Array<Object>} rows - Array of {label, value} objects
     * @returns {string} - HTML string
     */
    createMetadataTable(rows) {
        let html = '<table class="metadata-table"><tbody>';

        rows.forEach(({ label, value }) => {
            html += `
            <tr>
            <th>${UIUtils.escapeHtml(label)}</th>
            <td>${UIUtils.escapeHtml(value)}</td>
            </tr>
            `;
        });

        html += '</tbody></table>';
        return html;
    },

    /**
     * Create timing display
     *
     * @param {number} duration - Duration in milliseconds
     * @param {string} operation - Operation description
     * @returns {string} - HTML string
     */
    createTimingDisplay(duration, operation) {
        const formatted = duration >= 1000
        ? `${(duration / 1000).toFixed(2)}s`
        : `${duration.toFixed(2)}ms`;

        return `
        <p class="timing-info">
        <strong>⏱️ ${UIUtils.escapeHtml(operation)}:</strong> ${formatted}
        </p>
        `;
    },

    /**
     * Create algorithm security badge
     *
     * USED IN: Hash tool to show security status
     *
     * @param {string} algorithm - Algorithm name (e.g., 'SHA-256', 'MD5')
     * @returns {string} - HTML string with security badge
     */
    createAlgorithmSecurityBadge(algorithm) {
        const info = Config.getAlgorithmInfo(algorithm);

        if (!info) {
            return `<span class="security-badge">${UIUtils.escapeHtml(algorithm)}</span>`;
        }

        const badgeClass = info.security === 'SECURE' ? 'secure'
        : info.security === 'DEPRECATED' ? 'deprecated'
        : 'broken';

        return `
        <span class="security-badge ${badgeClass}">
        ${info.status} ${UIUtils.escapeHtml(info.name)}
        </span>
        `;
    },

    // ========================================================================
    // HASH-SPECIFIC COMPONENTS
    // ========================================================================

    /**
     * Create hash output display with multiple formats
     *
     * @param {Object} options
     * @param {string} options.algorithm - Algorithm name
     * @param {string} options.hash - Hash value (hex)
     * @param {string} options.time - Computation time
     * @param {boolean} options.showBinary - Show binary representation (default: true)
     * @returns {string} - HTML string
     */
    createHashOutputDisplay(options) {
        const { algorithm, hash, time, showBinary = true } = options;
        const info = Config.getAlgorithmInfo(algorithm);

        let html = `
        <div class="card card--result">
            <h4>${this.createAlgorithmSecurityBadge(algorithm)}</h4>
            <div class="hash-details">
                ${this.createCodeValueDisplay('Hash (Hex)', hash, `hash-${algorithm}`)}
                <div class="hash-metadata">
                    <p><strong>Output size:</strong> ${info.outputBits} bits (${info.outputBits / 8} bytes)</p>
                    <p><strong>Computation time:</strong> ${time}ms</p>
                    <p><strong>Status:</strong> ${info.usage}</p>
                </div>
        `;

        if (showBinary) {
            const binary = this._hexToBinary(hash);
            html += `
                    <details class="hash-binary">
                        <summary>View as binary (${binary.length} bits)</summary>
                        <code class="binary-display">${this._formatBinary(binary)}</code>
                    </details>
            `;
        }

        html += '</div></div>';
        return html;
    },

    /**
     * Create avalanche effect summary
     *
     * @param {Object} avalanche - {flipped, total, percentage}
     * @param {string} quality - Quality assessment (Excellent/Good/Poor)
     * @returns {string} - HTML string
     */
    createAvalancheSummary(avalanche, quality) {
        const percentage = parseFloat(avalanche.percentage);
        let color;

        if (percentage >= 45 && percentage <= 55) {
            color = 'green';
        } else if (percentage >= 40 && percentage <= 60) {
            color = 'blue';
        } else {
            color = 'red';
        }

        const stats = [
            { label: 'Bits Flipped', value: avalanche.flipped, color },
            { label: 'Total Bits', value: avalanche.total },
            { label: 'Percentage', value: `${avalanche.percentage}%`, color },
            { label: 'Quality', value: quality, color }
        ];

        return `
        <div class="avalanche-stats">
            <h4>Avalanche Statistics</h4>
            ${this.createStatisticsGrid(stats)}
            <p class="avalanche-explanation">
            <strong>Ideal avalanche:</strong> ~50% of bits flip when input changes by 1 bit.
            This indicates good diffusion (no correlation between input and output).
            </p>
        </div>
        `;
    },

    /**
     * Create birthday attack probability table
     *
     * @param {Array<Object>} probabilities - Array of {attempts, probability, label, assessment}
     * @returns {string} - HTML string
     */
    createBirthdayProbabilityTable(probabilities) {
        let html = `
        <table class="probability-table">
            <thead>
                <tr>
                    <th>Attempts</th>
                    <th>Collision Probability</th>
                    <th>Security Assessment</th>
                </tr>
            </thead>
        <tbody>
        `;

        probabilities.forEach(({ label, probability, assessment }) => {
            const probDisplay = probability >= 0.01
            ? `${probability.toFixed(2)}%`
            : probability >= 0.000001
            ? `${probability.toFixed(6)}%`
            : '< 0.000001%';

            html += `
            <tr>
                <td>${label}</td>
                <td>${probDisplay}</td>
                <td>${assessment}</td>
            </tr>
            `;
        });

        html += '</tbody></table>';
        return html;
    },

    // ========================================================================
    // RSA-SPECIFIC COMPONENTS
    // ========================================================================

    /**
     * Create encryption result display
     *
     * @param {Object} options
     * @param {string} options.originalMessage - Original plaintext
     * @param {string} options.messageInt - Message as BigInt
     * @param {string} options.ciphertext - Encrypted ciphertext
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
                ${this.createCodeValueDisplay('Numeric Representation', messageInt, 'message-int')}
            </div>

            <div class="card--result">
                <p>Encrypted value: c = m<sup>e</sup> mod n</p>
                ${this.createCodeValueDisplay('Ciphertext', ciphertext, 'ciphertext')}
            </div>

            ${this.createMathBreakdown({
                title: 'Mathematical Breakdown',
                operation: 'c = m<sup>e</sup> mod n',
                values: [
                    { label: 'm (message)', value: messageInt },
                    { label: 'e (public exponent)', value: e.toString() },
                    { label: 'n (modulus)', value: n.toString().substring(0, 50) + '...' }
                ],
                result: `c = ${ciphertext}`
        })}

        ${this.createSecurityAlert('This is "textbook RSA" without padding. In production, always use OAEP padding to prevent attacks.')}
        </div>
        `;
    },

    /**
     * Create decryption result display
     *
     * @param {Object} options
     * @param {string} options.ciphertext - Input ciphertext
     * @param {string} options.plaintextInt - Decrypted as BigInt
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
                ${this.createCodeValueDisplay('Ciphertext', ciphertext, 'decrypt-ciphertext', false)}
            </div>

            <div class="card--result">
                <h4>Decrypted Number</h4>
                ${this.createCodeValueDisplay('Decrypted', plaintextInt, 'decrypt-plaintext-int', false)}
            </div>

            <div class="card--result success">
                <h4>Recovered Message</h4>
                <code class="message-display">${UIUtils.escapeHtml(plaintextStr)}</code>
            </div>

            ${this.createMathBreakdown({
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
    },

    // ========================================================================
    // HELPER METHODS (Private)
    // ========================================================================

    /**
     * Get bit length of BigInt (helper)
     * @private
     */
    _bitLength(n) {
        if (typeof n === 'bigint') {
            return n === 0n ? 0 : n.toString(2).length;
        }
        return 0;
    },

    /**
     * Convert hex to binary (helper)
     * @private
     */
    _hexToBinary(hex) {
        let binary = '';
        for (let i = 0; i < hex.length; i++) {
            const decimal = parseInt(hex[i], 16);
            binary += decimal.toString(2).padStart(4, '0');
        }
        return binary;
    },

    /**
     * Format binary string with spaces (helper)
     * @private
     */
    _formatBinary(binary) {
        let formatted = '';
        for (let i = 0; i < binary.length; i += 8) {
            formatted += binary.substring(i, i + 8) + ' ';
        }
        return formatted.trim();
    }
};

// ============================================================================
// MAKE AVAILABLE GLOBALLY
// ============================================================================

if (typeof window !== 'undefined') {
    window.DisplayComponents = DisplayComponents;
    console.log('✓ Display Components module loaded');

    // Freeze to prevent modification
    Object.freeze(DisplayComponents);
}
