/**
 * ============================================================================
 * AES INTERACTIVE TOOL - UI CONTROLLER
 * ============================================================================
 */

import '../../dark-mode-toggle';
import { UIUtils } from '../../ui-utils';
import { DisplayComponents } from '../../display-components';
import {
    encryptImage,
    decryptImage,
    base64ToDataUrl,
    base64ToBlob,
    AESMode,
    KeyLength,
    ImageFormat,
    EncryptionMetadata,
} from './aes-api';
import {
    displayEncryptionResult,
    displayDecryptionResult,
    DecryptParameterState,
} from './aes-display';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_IMAGE_SIZE  = 8 * 1024 * 1024;   // 8 MB
const ALLOWED_MIMES   = ['image/png', 'image/jpeg', 'image/bmp'];

// ============================================================================
// SESSION STATE
// ============================================================================

interface AESSession {
    correctKey:      string;
    correctMode:     AESMode;
    correctIv:       string | null;
    keyLength:       KeyLength;
    correctMetadata: EncryptionMetadata;
    originalFile:    File;
    encryptedBlob:   Blob;
    originalDataUrl:  string;
    encryptedDataUrl: string;
    originalFormat:  ImageFormat;
    outputFormat:    ImageFormat;
}

let session: AESSession | null = null;
let decryptedDataUrl: string | null = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    displayWelcomeMessage();
});

// ============================================================================
// EVENT WIRING
// ============================================================================

function setupEventListeners(): void {
    const fileInput    = document.getElementById('image-file-input') as HTMLInputElement | null;
    const uploadZone   = document.getElementById('image-upload-zone');
    const encryptBtn   = document.getElementById('encrypt-btn');
    const ivToggle     = document.getElementById('iv-advanced-toggle');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleFileSelect(e as Event & { target: HTMLInputElement }));
    }

    if (uploadZone) {
        uploadZone.addEventListener('click', () => fileInput?.click());

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = (e as DragEvent).dataTransfer?.files[0];
            if (file) {
                processSelectedFile(file);
            }
        });
    }

    if (encryptBtn) {
        encryptBtn.addEventListener('click', handleEncrypt);
    }

    if (ivToggle) {
        ivToggle.addEventListener('click', () => {
            const ivBody = ivToggle.closest('.iv-advanced')?.querySelector('.iv-advanced__body') as HTMLElement | null;
            if (ivBody) {
                const hidden = ivBody.style.display === 'none' || ivBody.style.display === '';
                ivBody.style.display = hidden ? 'block' : 'none';
            }
        });
    }

    // Decrypt-form listeners are set up after the form HTML is injected.
    // Use event delegation on the results container.
    setupDecryptFormDelegation();
}

function setupDecryptFormDelegation(): void {
    // Delegate from document so it works even after the form is injected.
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        if (target.id === 'decrypt-btn')      { handleDecrypt();                      return; }
        if (target.id === 'restore-mode-btn') { handleRestoreField('mode');           return; }
        if (target.id === 'restore-iv-btn')   { handleRestoreField('iv');             return; }
        if (target.id === 'restore-key-btn')  { handleRestoreField('key');            return; }
        if (target.id === 'restore-all-btn')  { handleRestoreAll();                   return; }
        if (target.id === 'download-encrypted-btn') { handleDownloadEncrypted();      return; }
        if (target.id === 'download-decrypted-btn') { handleDownloadDecrypted();      return; }
        if (target.id === 'try-again-btn')    { handleTryAgain();                     return; }
        if (target.id === 'start-over-btn')   { handleStartOver();                    return; }
        if (target.id === 'reveal-key-btn')   { handleRevealKey(target);              return; }
    });

    document.addEventListener('change', (e) => {
        const target = e.target as HTMLElement;
        if (target.id === 'decrypt-mode-select') {
            handleModeChange();
        }
    });
}

// ============================================================================
// FILE SELECTION
// ============================================================================

function handleFileSelect(e: Event & { target: HTMLInputElement }): void {
    const file = e.target.files?.[0];
    if (file) {
        processSelectedFile(file);
    }
}

function processSelectedFile(file: File): void {
    if (!ALLOWED_MIMES.includes(file.type)) {
        UIUtils.showError('Unsupported file type. Please upload a PNG, JPEG, or BMP image.');
        return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
        UIUtils.showError(`File too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)} MB.`);
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;

        const preview = document.getElementById('image-preview') as HTMLImageElement | null;
        if (preview) {
            preview.src     = dataUrl;
            preview.style.display = 'block';
        }

        const img = new Image();
        img.onload = () => {
            const info = document.getElementById('image-preview-info');
            if (info) {
                info.textContent = `${UIUtils.escapeHtml(file.name)} — ${img.width} × ${img.height}px`;
                info.style.display = 'block';
            }
        };
        img.src = dataUrl;
    };
    reader.readAsDataURL(file);
}

// ============================================================================
// ENCRYPTION
// ============================================================================

async function handleEncrypt(): Promise<void> {
    const fileInput = document.getElementById('image-file-input') as HTMLInputElement | null;
    const file      = fileInput?.files?.[0];

    if (!file) {
        UIUtils.showError('Please select an image first.');
        return;
    }

    const modeEl      = document.getElementById('mode-select')      as HTMLSelectElement | null;
    const keyLenEl    = document.getElementById('key-length-select') as HTMLSelectElement | null;
    const ivInputEl   = document.getElementById('iv-input')          as HTMLInputElement | null;

    const mode      = (modeEl?.value      ?? 'CBC') as AESMode;
    const keyLength = parseInt(keyLenEl?.value ?? '128', 10) as KeyLength;
    const iv        = ivInputEl?.value.trim() || undefined;

    const encryptBtn = document.getElementById('encrypt-btn');
    UIUtils.setButtonLoading(encryptBtn, 'Encrypting...');

    try {
        const response = await encryptImage({ image: file, mode, keyLength, iv });

        const originalDataUrl  = await fileToDataUrl(file);
        const encryptedDataUrl = base64ToDataUrl(response.encryptedImage, response.outputFormat);
        const encryptedBlob    = base64ToBlob(response.encryptedImage, response.outputFormat);

        session = {
            correctKey:      response.key,
            correctMode:     response.mode,
            correctIv:       response.iv,
            keyLength:       response.keyLength,
            correctMetadata: response.metadata,
            originalFile:    file,
            encryptedBlob,
            originalDataUrl,
            encryptedDataUrl,
            originalFormat:  response.originalFormat,
            outputFormat:    response.outputFormat,
        };

        const html = displayEncryptionResult(originalDataUrl, encryptedDataUrl, response);
        UIUtils.displayResults('stage-2-results', html, false);

        const stage2 = document.getElementById('stage-2');
        if (stage2) {
            stage2.style.display = 'block';
            UIUtils.scrollToElement(stage2);
        }

        UIUtils.setupCopyButtons();

    } catch (err) {
        UIUtils.showError((err as Error).message);
    } finally {
        UIUtils.resetButton(encryptBtn, 'Encrypt');
    }
}

// ============================================================================
// DECRYPTION
// ============================================================================

async function handleDecrypt(): Promise<void> {
    if (!session) {
        UIUtils.showError('Please encrypt an image first.');
        return;
    }

    const modeEl  = document.getElementById('decrypt-mode-select') as HTMLSelectElement | null;
    const ivEl    = document.getElementById('decrypt-iv-input')    as HTMLInputElement  | null;
    const keyEl   = document.getElementById('decrypt-key-input')   as HTMLInputElement  | null;

    const submittedMode = (modeEl?.value ?? session.correctMode) as AESMode;
    const submittedIv   = ivEl?.value.trim() ?? '';
    const submittedKey  = keyEl?.value.trim() ?? '';

    // Build metadata: override mode and iv, but preserve pixel_data_size and tail.
    const submittedMetadata: EncryptionMetadata = {
        ...session.correctMetadata,
        mode: submittedMode,
        iv:   submittedMode === 'ECB' ? undefined : (submittedIv || undefined),
    };

    const parameterState: DecryptParameterState = {
        keyChanged:  submittedKey  !== session.correctKey,
        ivChanged:   submittedIv   !== (session.correctIv ?? ''),
        modeChanged: submittedMode !== session.correctMode,
    };

    const decryptBtn = document.getElementById('decrypt-btn');
    UIUtils.setButtonLoading(decryptBtn, 'Decrypting...');

    try {
        const response = await decryptImage({
            image:     session.encryptedBlob,
            keyLength: session.keyLength,
            key:       submittedKey || session.correctKey,
            metadata:  submittedMetadata,
        });

        decryptedDataUrl = base64ToDataUrl(response.decryptedImage, response.outputFormat);

        const html = displayDecryptionResult(
            session.originalDataUrl,
            session.encryptedDataUrl,
            decryptedDataUrl,
            parameterState,
            submittedMode,
        );

        UIUtils.displayResults('stage-3-results', html, false);

        const stage3 = document.getElementById('stage-3');
        if (stage3) {
            stage3.style.display = 'block';
            UIUtils.scrollToElement(stage3);
        }

    } catch (err) {
        UIUtils.showError((err as Error).message);
    } finally {
        UIUtils.resetButton(decryptBtn, 'Decrypt');
    }
}

// ============================================================================
// FORM CONTROL HANDLERS
// ============================================================================

function handleModeChange(): void {
    const modeEl = document.getElementById('decrypt-mode-select') as HTMLSelectElement | null;
    const ivRow  = document.getElementById('decrypt-iv-row');
    const ivEl   = document.getElementById('decrypt-iv-input') as HTMLInputElement | null;

    if (!modeEl) return;

    if (modeEl.value === 'ECB') {
        if (ivEl)  { ivEl.disabled = true; ivEl.value = ''; }
        if (ivRow) { ivRow.style.display = 'none'; }
    } else {
        if (ivEl)  { ivEl.disabled = false; }
        if (ivRow) { ivRow.style.display = ''; }
    }
}

function handleRestoreField(field: 'mode' | 'iv' | 'key'): void {
    if (!session) return;

    if (field === 'mode') {
        const modeEl = document.getElementById('decrypt-mode-select') as HTMLSelectElement | null;
        if (modeEl) {
            modeEl.value = session.correctMode;
            handleModeChange();
        }
    } else if (field === 'iv') {
        const ivEl = document.getElementById('decrypt-iv-input') as HTMLInputElement | null;
        if (ivEl)  { ivEl.value = session.correctIv ?? ''; }
    } else {
        const keyEl = document.getElementById('decrypt-key-input') as HTMLInputElement | null;
        if (keyEl) { keyEl.value = session.correctKey; }
    }
}

function handleRestoreAll(): void {
    handleRestoreField('mode');
    handleRestoreField('iv');
    handleRestoreField('key');
}

// ============================================================================
// DOWNLOAD HANDLERS
// ============================================================================

function handleDownloadEncrypted(): void {
    if (!session) return;
    triggerDownload(session.encryptedDataUrl, `encrypted.${session.outputFormat}`);
}

function handleDownloadDecrypted(): void {
    if (!decryptedDataUrl || !session) return;
    triggerDownload(decryptedDataUrl, `decrypted.${session.outputFormat}`);
}

function triggerDownload(dataUrl: string, filename: string): void {
    const a = document.createElement('a');
    a.href     = dataUrl;
    a.download = filename;
    a.click();
}

// ============================================================================
// NAVIGATION HANDLERS
// ============================================================================

function handleTryAgain(): void {
    const stage2 = document.getElementById('stage-2');
    if (stage2) {
        UIUtils.scrollToElement(stage2);
    }
}

function handleStartOver(): void {
    session          = null;
    decryptedDataUrl = null;

    ['stage-2', 'stage-3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    UIUtils.clearResults(['stage-2-results', 'stage-3-results']);

    const fileInput = document.getElementById('image-file-input') as HTMLInputElement | null;
    if (fileInput) { fileInput.value = ''; }

    const preview = document.getElementById('image-preview') as HTMLImageElement | null;
    if (preview)  { preview.src = ''; preview.style.display = 'none'; }

    const info = document.getElementById('image-preview-info');
    if (info)     { info.style.display = 'none'; }

    UIUtils.scrollToTop();
}

// ============================================================================
// REVEAL KEY TOGGLE
// ============================================================================

function handleRevealKey(btn: HTMLElement): void {
    const truncated = document.getElementById('key-material-key');
    const full      = document.getElementById('key-material-key-full');
    if (!truncated || !full) return;

    const isHidden = full.style.display === 'none';
    truncated.style.display = isHidden ? 'none'  : '';
    full.style.display      = isHidden ? ''      : 'none';
    btn.textContent         = isHidden ? 'Hide'  : 'Reveal';
}

// ============================================================================
// WELCOME MESSAGE
// ============================================================================

function displayWelcomeMessage(): void {
    const welcomeDiv = document.getElementById('welcome-message');
    if (!welcomeDiv) return;

    welcomeDiv.innerHTML = `
    <div class="welcome-content">
        <p>Upload an image and encrypt it with AES to see how different modes — ECB, CBC,
        OFB, CTR — affect the visual output. Then try decrypting with wrong keys, IVs, or
        modes to understand what each parameter does.</p>
        ${DisplayComponents.createEducationalNote(
            'This tool is for learning. Encryption runs server-side; key material is ' +
            'never stored in localStorage or sessionStorage.'
        )}
    </div>`;
}

// ============================================================================
// HELPERS
// ============================================================================

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

export {};
