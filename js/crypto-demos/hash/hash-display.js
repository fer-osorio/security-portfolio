/**
 * ============================================================================
 * HASH DISPLAY COMPONENTS
 *
 * Hash-specific UI components extracted from display-components.js.
 *
 * DEPENDENCIES: DisplayComponents, HashUtils, UIUtils, Config
 * ============================================================================
 */

const HashDisplay = {

    /**
     * Create algorithm security badge
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
                ${DisplayComponents.createCodeValueDisplay('Hash (Hex)', hash, `hash-${algorithm}`)}
                <div class="hash-metadata">
                    <p><strong>Output size:</strong> ${info.outputBits} bits (${info.outputBits / 8} bytes)</p>
                    <p><strong>Computation time:</strong> ${time}ms</p>
                    <p><strong>Status:</strong> ${info.usage}</p>
                </div>
        `;

        if (showBinary) {
            const binary = HashUtils.hexToBinary(hash);
            html += `
                    <details class="hash-binary">
                        <summary>View as binary (${binary.length} bits)</summary>
                        <div class="code-value">
                            <code class="binary-display" style="word-break: normal;">
                                ${HashUtils.formatBinary(binary)}
                            </code>
                        </div>
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
            ${DisplayComponents.createStatisticsGrid(stats)}
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
    }
};

if (typeof window !== 'undefined') {
    window.HashDisplay = HashDisplay;
}
