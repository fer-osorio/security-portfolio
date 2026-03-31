import { UIUtils } from './ui-utils';

export interface ResultCardOptions {
    title:      string;
    content:    string;
    className?: string;
    icon?:      string;
}

export interface MathBreakdownValue {
    label: string;
    value: string;
}

export interface MathBreakdownOptions {
    title:     string;
    operation: string;
    values?:   MathBreakdownValue[];
    result?:   string;
    decoded?:  string;
}

export interface ComparisonItem {
    title:   string;
    content: string;
}

export interface ComparisonDisplayOptions {
    original: ComparisonItem;
    modified: ComparisonItem;
    arrow?:   string;
}

export interface BitDiffEntry {
    bit:      string;
    status:   'same' | 'different';
    position: number;
}

export interface ProgressData {
    attempt?: number;
    isPrime?: boolean;
    percent?: number;
}

export interface StatItem {
    label:  string;
    value:  string;
    color?: string;
}

export interface MetadataRow {
    label: string;
    value: string;
}

export type SecurityAlertType = 'warning' | 'danger' | 'info';

export const DisplayComponents = {

    // ========================================================================
    // CARD COMPONENTS
    // ========================================================================

    createResultCard(options: ResultCardOptions): string {
        const { title, content, className = '', icon = '' } = options;

        return `
        <div class="card card--result ${className}">
        <h3>${icon} ${UIUtils.escapeHtml(title)}</h3>
        ${content}
        </div>
        `;
    },

    createCodeValueDisplay(label: string, value: string, id: string, showCopyButton = true): string {
        return `
        <div class="code-value">
            <label>${UIUtils.escapeHtml(label)}:</label>
            <code id="${id}">${UIUtils.escapeHtml(value)}</code>
            ${showCopyButton ? `<button class="copy-btn" data-copy="${id}">Copy</button>` : ''}
        </div>
        `;
    },

    createMathBreakdown(options: MathBreakdownOptions): string {
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

    createSecurityAlert(message: string, type: SecurityAlertType = 'warning'): string {
        const icons: Record<SecurityAlertType, string> = {
            warning: '⚠️',
            danger:  '⛔',
            info:    'ℹ️',
        };

        const icon = icons[type];

        return `
        <div class="alert alert--security-note alert--${type}">
            <p><strong>${icon} Security Note:</strong> ${UIUtils.escapeHtml(message)}</p>
        </div>
        `;
    },

    createEducationalNote(message: string): string {
        return `
        <div class="educational-note">
            <p><strong>📚 Educational Note:</strong> ${UIUtils.escapeHtml(message)}</p>
        </div>
        `;
    },

    createWarningAlert(title: string, message: string): string {
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

    createBitVisualization(bitDiff: BitDiffEntry[], bitsPerRow = 64): string {
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

    createProgressDisplay(stage: string, data: ProgressData | null = null): string {
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

    createStatisticsGrid(stats: StatItem[]): string {
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

    createComparisonDisplay(options: ComparisonDisplayOptions): string {
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

    createMetadataTable(rows: MetadataRow[]): string {
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

    createTimingDisplay(duration: number, operation: string): string {
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
