/**
 * ============================================================================
 * HASH DISPLAY COMPONENTS
 *
 * Hash-specific UI components for the hash function visualizer.
 *
 * DEPENDENCIES: DisplayComponents, HashUtils, UIUtils, Config
 * ============================================================================
 */

import { DisplayComponents, StatItem } from '../../display-components';
import { Config, AlgorithmInfo } from '../../config';
import { UIUtils } from '../../ui-utils';
import { AvalancheResult, hexToBinary, formatBinary } from './hash-utils';

export interface HashOutputDisplayOptions {
    algorithm:   string;
    hash:        string;
    time:        string;
    showBinary?: boolean;
}

export type AvalancheQuality = 'Excellent' | 'Good' | 'Poor';

export interface ProbabilityRow {
    label:       string;
    probability: number;
    assessment:  string;
}

/**
 * Create algorithm security badge HTML
 */
export function createAlgorithmSecurityBadge(algorithm: string): string {
    const info: AlgorithmInfo | null = Config.getAlgorithmInfo(algorithm);

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
}

/**
 * Create hash output display with multiple formats
 */
export function createHashOutputDisplay(options: HashOutputDisplayOptions): string {
    const { algorithm, hash, time, showBinary = true } = options;
    const info: AlgorithmInfo | null = Config.getAlgorithmInfo(algorithm);

    const outputBits  = info ? info.outputBits : 0;
    const outputBytes = info ? info.outputBits / 8 : 0;
    const usage       = info ? info.usage : '';

    let html = `
    <div class="card card--result">
        <h4>${createAlgorithmSecurityBadge(algorithm)}</h4>
        <div class="hash-details">
            ${DisplayComponents.createCodeValueDisplay('Hash (Hex)', hash, `hash-${algorithm}`)}
            <div class="hash-metadata">
                <p><strong>Output size:</strong> ${outputBits} bits (${outputBytes} bytes)</p>
                <p><strong>Computation time:</strong> ${time}ms</p>
                <p><strong>Status:</strong> ${UIUtils.escapeHtml(usage)}</p>
            </div>
    `;

    if (showBinary) {
        const binary = hexToBinary(hash);
        html += `
                <details class="hash-binary">
                    <summary>View as binary (${binary.length} bits)</summary>
                    <div class="code-value">
                        <code class="binary-display" style="word-break: normal;">
                            ${formatBinary(binary)}
                        </code>
                    </div>
                </details>
        `;
    }

    html += '</div></div>';
    return html;
}

/**
 * Create avalanche effect summary
 */
export function createAvalancheSummary(avalanche: AvalancheResult, quality: AvalancheQuality): string {
    const percentage = parseFloat(avalanche.percentage);
    let color: string;

    if (percentage >= 45 && percentage <= 55) {
        color = 'green';
    } else if (percentage >= 40 && percentage <= 60) {
        color = 'blue';
    } else {
        color = 'red';
    }

    const stats: StatItem[] = [
        { label: 'Bits Flipped', value: avalanche.flipped.toString(), color },
        { label: 'Total Bits',   value: avalanche.total.toString() },
        { label: 'Percentage',   value: `${avalanche.percentage}%`, color },
        { label: 'Quality',      value: quality, color }
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
}

/**
 * Create birthday attack probability table
 */
export function createBirthdayProbabilityTable(probabilities: ProbabilityRow[]): string {
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
            <td>${UIUtils.escapeHtml(label)}</td>
            <td>${probDisplay}</td>
            <td>${assessment}</td>
        </tr>
        `;
    });

    html += '</tbody></table>';
    return html;
}
