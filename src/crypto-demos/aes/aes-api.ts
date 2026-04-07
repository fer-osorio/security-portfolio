/**
 * ============================================================================
 * AES API LAYER
 *
 * Typed fetch wrappers for /api/encrypt and /api/decrypt.
 * No DOM dependencies.
 * ============================================================================
 */

import { Config } from '../../config';

// ============================================================================
// TYPES
// ============================================================================

export type AESMode     = 'ECB' | 'CBC' | 'OFB' | 'CTR';
export type KeyLength   = 128 | 192 | 256;
export type ImageFormat = 'bmp' | 'png' | 'jpg';

export interface EncryptionMetadata {
    mode:              AESMode;
    iv?:               string;
    pixel_data_size?:  number;
    tail?:             string;
}

export interface EncryptRequest {
    image:     File;
    mode:      AESMode;
    keyLength: KeyLength;
    iv?:       string;
}

export interface EncryptResponse {
    encryptedImage: string;       // base64
    outputFormat:   ImageFormat;
    originalFormat: ImageFormat;
    key:            string;       // hex
    iv:             string | null;
    mode:           AESMode;
    keyLength:      KeyLength;
    metadata:       EncryptionMetadata;
}

export interface DecryptRequest {
    image:     Blob;
    keyLength: KeyLength;
    key:       string;
    metadata:  EncryptionMetadata;
}

export interface DecryptResponse {
    decryptedImage: string;   // base64
    outputFormat:   ImageFormat;
}

// ============================================================================
// FETCH WRAPPERS
// ============================================================================

export async function encryptImage(req: EncryptRequest): Promise<EncryptResponse> {
    const form = new FormData();
    form.append('image', req.image);
    form.append('mode', req.mode);
    form.append('key_length', String(req.keyLength));
    if (req.iv) {
        form.append('iv', req.iv);
    }

    const res = await fetch(`${Config.API_BASE_URL}/api/encrypt`, {
        method: 'POST',
        body:   form,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail ?? `Encryption failed (${res.status})`);
    }

    const data = await res.json();
    return {
        encryptedImage: data.encrypted_image,
        outputFormat:   data.output_format   as ImageFormat,
        originalFormat: data.original_format as ImageFormat,
        key:            data.key,
        iv:             data.iv   ?? null,
        mode:           data.mode as AESMode,
        keyLength:      data.key_length as KeyLength,
        metadata:       data.metadata  as EncryptionMetadata,
    };
}

export async function decryptImage(req: DecryptRequest): Promise<DecryptResponse> {
    const form = new FormData();
    form.append('image',      req.image);
    form.append('key_length', String(req.keyLength));
    form.append('key',        req.key);
    form.append('metadata',   JSON.stringify(req.metadata));

    const res = await fetch(`${Config.API_BASE_URL}/api/decrypt`, {
        method: 'POST',
        body:   form,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail ?? `Decryption failed (${res.status})`);
    }

    const data = await res.json();
    return {
        decryptedImage: data.decrypted_image,
        outputFormat:   data.output_format as ImageFormat,
    };
}

// ============================================================================
// HELPERS
// ============================================================================

export function base64ToDataUrl(base64: string, format: ImageFormat): string {
    const mime = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
    return `data:${mime};base64,${base64}`;
}

export function base64ToBlob(base64: string, format: ImageFormat): Blob {
    const mime   = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
}
