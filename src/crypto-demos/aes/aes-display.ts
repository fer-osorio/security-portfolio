/**
 * ============================================================================
 * AES DISPLAY COMPONENTS
 *
 * Pure functions returning HTML strings. No fetch calls, no state,
 * no direct DOM mutation.
 * ============================================================================
 */

import { DisplayComponents } from '../../display-components';
import { UIUtils } from '../../ui-utils';
import { AESMode, EncryptResponse, ImageFormat } from './aes-api';

// ============================================================================
// TYPES
// ============================================================================

export interface DecryptParameterState {
    keyChanged:  boolean;
    ivChanged:   boolean;
    modeChanged: boolean;
}

// ============================================================================
// MODE DESCRIPTIONS
// ============================================================================

export function getModeDescription(mode: AESMode): string {
    const descriptions: Record<AESMode, string> = {
        ECB: 'Each 16-byte block encrypted independently — structural patterns leak through',
        CBC: 'Each block XOR\'d with previous ciphertext — requires an IV',
        OFB: 'Keystream XOR\'d with plaintext — stream cipher from a block cipher',
        CTR: 'Counter-based keystream — parallelisable stream cipher',
    };
    return descriptions[mode];
}

// ============================================================================
// OUTCOME MESSAGE
// ============================================================================

export function getOutcomeMessage(mode: AESMode, state: DecryptParameterState): string {
    const changedCount = [state.keyChanged, state.ivChanged, state.modeChanged].filter(Boolean).length;

    if (changedCount === 0) {
        return `
        <div class="alert alert--success">
            <p><strong>Decryption successful</strong> — output matches original.</p>
        </div>`;
    }

    if (changedCount > 1) {
        return `
        <div class="alert alert--warning">
            <p><strong>Wrong parameters:</strong> Multiple fields were changed. AES is highly
            sensitive to key, IV, and mode — any mismatch produces unrecoverable output.</p>
        </div>`;
    }

    if (state.keyChanged) {
        return `
        <div class="alert alert--warning">
            <p><strong>Wrong key:</strong> AES produces pseudorandom output; the entire image
            is noise when the wrong key is used.</p>
        </div>`;
    }

    if (state.ivChanged) {
        return `
        <div class="alert alert--warning">
            <p><strong>Wrong IV (${mode} mode):</strong> In CBC mode, only the first block of
            each row is corrupted; the rest is recoverable. In stream-cipher modes the IV
            corruption propagates throughout.</p>
        </div>`;
    }

    // modeChanged
    return `
    <div class="alert alert--warning">
        <p><strong>Wrong mode:</strong> Mismatched padding and chaining rules produce garbled
        output — the decrypted image will be unrecognisable.</p>
    </div>`;
}

// ============================================================================
// IMAGE COMPARISON PANELS
// ============================================================================

function imagePanelHtml(label: string, dataUrl: string): string {
    return `
    <div class="image-panel">
        <p class="image-panel__label">${UIUtils.escapeHtml(label)}</p>
        <img src="${dataUrl}" alt="${UIUtils.escapeHtml(label)}" class="image-panel__img" />
    </div>`;
}

// ============================================================================
// KEY MATERIAL TABLE
// ============================================================================

function keyMaterialHtml(response: EncryptResponse): string {
    const truncatedKey = response.key.length > 32
        ? response.key.substring(0, 32) + '...'
        : response.key;

    const ivRow = response.iv !== null ? `
        <tr>
            <th>IV</th>
            <td>
                <code id="key-material-iv">${UIUtils.escapeHtml(response.iv)}</code>
                <button class="copy-btn" data-copy="key-material-iv">Copy</button>
            </td>
        </tr>` : `
        <tr>
            <th>IV</th>
            <td><span class="text-muted">None (ECB mode)</span></td>
        </tr>`;

    return `
    <div class="card card--key-material">
        <h4>Key Material</h4>
        <table class="metadata-table key-material-table"><tbody>
            <tr>
                <th>Mode</th>
                <td>${UIUtils.escapeHtml(response.mode)} — ${UIUtils.escapeHtml(getModeDescription(response.mode))}</td>
            </tr>
            <tr>
                <th>Key Length</th>
                <td>${UIUtils.escapeHtml(String(response.keyLength))} bits</td>
            </tr>
            <tr>
                <th>Key</th>
                <td>
                    <code id="key-material-key" class="key-truncated">${UIUtils.escapeHtml(truncatedKey)}</code>
                    <code id="key-material-key-full" class="key-full" style="display:none">${UIUtils.escapeHtml(response.key)}</code>
                    <button type="button" id="reveal-key-btn" class="btn btn-sm">Reveal</button>
                    <button class="copy-btn" data-copy="key-material-key-full">Copy</button>
                </td>
            </tr>
            ${ivRow}
        </tbody></table>
    </div>`;
}

// ============================================================================
// DECRYPTION FORM
// ============================================================================

function decryptFormHtml(response: EncryptResponse): string {
    const modes: AESMode[] = ['ECB', 'CBC', 'OFB', 'CTR'];
    const modeOptions = modes.map(m =>
        `<option value="${m}"${m === response.mode ? ' selected' : ''}>${UIUtils.escapeHtml(m)}</option>`
    ).join('');

    const ivValue  = response.iv ?? '';
    const ivHidden = response.mode === 'ECB' ? ' style="display:none"' : '';

    return `
    <div class="card card--decrypt-form">
        <h4>Decrypt this image</h4>
        <p class="form-description">The fields below are pre-filled with the correct parameters.
        Try modifying them to see how AES responds to wrong keys, IVs, or modes.</p>
        <form id="decrypt-form">
            <div class="form-row">
                <label for="decrypt-mode-select">Mode</label>
                <select id="decrypt-mode-select">${modeOptions}</select>
                <button type="button" id="restore-mode-btn" class="btn btn-sm">Restore</button>
            </div>
            <div class="form-row" id="decrypt-iv-row"${ivHidden}>
                <label for="decrypt-iv-input">IV</label>
                <input id="decrypt-iv-input" type="text" value="${UIUtils.escapeHtml(ivValue)}"
                    spellcheck="false" autocomplete="off" />
                <button type="button" id="restore-iv-btn" class="btn btn-sm">Restore</button>
            </div>
            <div class="form-row">
                <label for="decrypt-key-input">Key</label>
                <input id="decrypt-key-input" type="text" value="${UIUtils.escapeHtml(response.key)}"
                    spellcheck="false" autocomplete="off" />
                <button type="button" id="restore-key-btn" class="btn btn-sm">Restore</button>
            </div>
            <div class="form-actions">
                <button type="button" id="restore-all-btn" class="btn">Use correct parameters</button>
                <button type="button" id="decrypt-btn" class="btn btn-primary">Decrypt</button>
            </div>
        </form>
    </div>`;
}

// ============================================================================
// CALLOUT CARDS
// ============================================================================

function ecbCalloutHtml(): string {
    return DisplayComponents.createSecurityAlert(
        'ECB mode encrypts each 16-byte block independently. Identical plaintext blocks ' +
        'produce identical ciphertext blocks, so large uniform areas (backgrounds, solid ' +
        'colours) remain visually recognisable in the encrypted image.',
        'warning'
    );
}

function jpgCalloutHtml(): string {
    return DisplayComponents.createEducationalNote(
        'JPEG images are converted to PNG before encryption. JPEG\'s lossy compression ' +
        'is incompatible with block-level encryption — the encrypted output is stored as PNG.'
    );
}

// ============================================================================
// PUBLIC DISPLAY FUNCTIONS
// ============================================================================

export function displayEncryptionResult(
    originalDataUrl:  string,
    encryptedDataUrl: string,
    response:         EncryptResponse,
): string {
    const showEcbCallout = response.mode === 'ECB';
    const showJpgCallout = response.originalFormat === 'jpg' as ImageFormat;

    return `
    <div class="aes-result aes-result--encrypt">
        <h3>Encryption result</h3>

        <div class="image-comparison image-comparison--two">
            ${imagePanelHtml('Original', originalDataUrl)}
            ${imagePanelHtml('Encrypted', encryptedDataUrl)}
        </div>

        <div class="result-actions">
            <button type="button" id="download-encrypted-btn" class="btn">Download encrypted image</button>
        </div>

        ${showEcbCallout ? ecbCalloutHtml() : ''}
        ${showJpgCallout ? jpgCalloutHtml() : ''}

        ${keyMaterialHtml(response)}
        ${decryptFormHtml(response)}
    </div>`;
}

export function displayDecryptionResult(
    originalDataUrl:  string,
    encryptedDataUrl: string,
    decryptedDataUrl: string,
    parameterState:   DecryptParameterState,
    mode:             AESMode,
): string {
    return `
    <div class="aes-result aes-result--decrypt">
        <h3>Decryption result</h3>

        <div class="image-comparison image-comparison--three">
            ${imagePanelHtml('Original', originalDataUrl)}
            ${imagePanelHtml('Encrypted', encryptedDataUrl)}
            ${imagePanelHtml('Decrypted', decryptedDataUrl)}
        </div>

        <div class="result-actions">
            <button type="button" id="download-decrypted-btn" class="btn">Download decrypted image</button>
            <button type="button" id="try-again-btn" class="btn">Try different parameters</button>
            <button type="button" id="start-over-btn" class="btn">Start over</button>
        </div>

        ${getOutcomeMessage(mode, parameterState)}
    </div>`;
}
