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
        let html = `
            <div class="bit-visualization">
                <div class="bit-diff-display">
        `;

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
            </div>
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
