import re
from fastapi import HTTPException

ALLOWED_MODES       = {"ECB", "CBC", "OFB", "CTR"}
ALLOWED_KEY_LENGTHS = {128, 192, 256}
ALLOWED_MIME_TYPES  = {"image/bmp", "image/png", "image/jpeg"}
MAX_FILE_SIZE_BYTES         = 8 * 1024 * 1024   # 8 MB
MAX_DECRYPT_FILE_SIZE_BYTES = 64 * 1024 * 1024  # 64 MB
HEX_IV_PATTERN      = re.compile(r'^[0-9A-Fa-f]{32}$')

def validate_mode(mode: str) -> str:
    if mode not in ALLOWED_MODES:
        raise HTTPException(400, f"Invalid mode. Must be one of: {ALLOWED_MODES}")
    return mode

def validate_key_length(key_length: int) -> int:
    if key_length not in ALLOWED_KEY_LENGTHS:
        raise HTTPException(400, f"Invalid key_length. Must be one of: {ALLOWED_KEY_LENGTHS}")
    return key_length

def validate_iv(iv: str | None, mode: str, required: bool = False) -> str | None:
    if mode == "ECB":
        return None   # IV is irrelevant for ECB
    if required and not iv:
        raise HTTPException(400, "iv is required for decryption with mode " + mode)
    if iv and not HEX_IV_PATTERN.match(iv):
        raise HTTPException(400, "iv must be exactly 32 hexadecimal characters")
    return iv

def validate_key_hex(key: str, key_length: int) -> str:
    expected_chars = key_length // 4
    pattern = re.compile(f'^[0-9A-Fa-f]{{{expected_chars}}}$')
    if not pattern.match(key):
        raise HTTPException(
            400,
            f"key must be exactly {expected_chars} hexadecimal characters for {key_length}-bit AES"
        )
    return key

def validate_file_size(size: int) -> None:
    if size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, "File exceeds maximum allowed size of 8 MB")

def validate_decrypt_file_size(size: int) -> None:
    if size > MAX_DECRYPT_FILE_SIZE_BYTES:
        raise HTTPException(413, "File exceeds maximum allowed size of 64 MB")

def validate_mime_type(content_type: str) -> str:
    base_type = content_type.split(";")[0].strip().lower()
    if base_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(415, f"Unsupported file type: {base_type}")
    return base_type
