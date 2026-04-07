import base64
import json
import logging
import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

logger = logging.getLogger(__name__)
from fastapi.responses import JSONResponse

from app.validation import (
    validate_decrypt_file_size, validate_file_size, validate_iv, validate_key_hex,
    validate_key_length, validate_mime_type, validate_mode,
)

router = APIRouter(prefix="/api")

_DEFAULT_BINARY = str(Path(__file__).resolve().parent.parent.parent / "bin" / "image-encryptor")
BINARY = os.environ.get("ENCRYPTOR_BIN", _DEFAULT_BINARY)

def _output_format(original_mime: str) -> str:
    return "bmp" if original_mime == "image/bmp" else "png"

def _original_format(content_type: str) -> str:
    return {"image/bmp": "bmp", "image/png": "png", "image/jpeg": "jpg"}.get(content_type, "png")


@router.post("/encrypt")
async def encrypt(
    image:      UploadFile = File(...),
    mode:       str        = Form(...),
    key_length: int        = Form(...),
    iv:         str | None = Form(None),
):
    mime       = validate_mime_type(image.content_type or "")
    data       = await image.read()
    validate_file_size(len(data))
    mode       = validate_mode(mode)
    key_length = validate_key_length(key_length)
    iv         = validate_iv(iv, mode, required=False)

    out_fmt  = _output_format(mime)
    orig_fmt = _original_format(mime)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp       = Path(tmpdir)
        in_path   = tmp / f"input.{orig_fmt}"
        out_path  = tmp / f"encrypted.{out_fmt}"
        key_path  = tmp / "key.bin"
        meta_path = tmp / "meta.json"

        in_path.write_bytes(data)

        try:
            subprocess.run(
                [BINARY, "--generate-key", "--key-length", str(key_length), "--output", str(key_path)],
                check=True, timeout=10, capture_output=True,
            )
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.decode(errors="replace")
            logger.error("key-gen failed (exit %d): %s", e.returncode, stderr)
            raise HTTPException(500, f"Key generation failed: {stderr}")

        cmd = [
            BINARY,
            "--key",      str(key_path),
            "--input",    str(in_path),
            "--output",   str(out_path),
            "--mode",     mode,
            "--metadata", str(meta_path),
        ]
        if iv:
            cmd += ["--iv", iv]

        try:
            subprocess.run(cmd, check=True, timeout=30, capture_output=True)
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.decode(errors="replace")
            logger.error("encrypt failed (exit %d): %s", e.returncode, stderr)
            raise HTTPException(500, f"Encryption failed: {stderr}")

        if not out_path.exists():
            raise HTTPException(500, "Encryption produced no output file")

        encrypted_bytes = out_path.read_bytes()
        key_hex         = key_path.read_bytes().hex()

        if not meta_path.exists():
            raise HTTPException(500, "Encryption produced no metadata file")

        meta      = json.loads(meta_path.read_text())
        result_iv = meta.get("iv")   # None for ECB

    return JSONResponse({
        "encrypted_image": base64.b64encode(encrypted_bytes).decode(),
        "output_format":   out_fmt,
        "original_format": orig_fmt,
        "key":             key_hex,
        "iv":              result_iv,
        "mode":            mode,
        "key_length":      key_length,
        "metadata":        meta,
    })


@router.post("/decrypt")
async def decrypt(
    image:      UploadFile = File(...),
    key_length: int        = Form(...),
    key:        str        = Form(...),
    metadata:   str        = Form(...),
):
    mime       = validate_mime_type(image.content_type or "")
    data       = await image.read()
    validate_decrypt_file_size(len(data))
    key_length = validate_key_length(key_length)
    key        = validate_key_hex(key, key_length)

    try:
        meta = json.loads(metadata)
    except json.JSONDecodeError:
        raise HTTPException(400, "metadata is not valid JSON")

    if "mode" not in meta:
        raise HTTPException(400, "metadata is missing required field: mode")

    mode = validate_mode(meta["mode"])

    if mode != "ECB" and not meta.get("iv"):
        raise HTTPException(400, f"metadata.iv is required for mode {mode}")

    out_fmt  = _output_format(mime)
    orig_fmt = _original_format(mime)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp       = Path(tmpdir)
        in_path   = tmp / f"input.{orig_fmt}"
        out_path  = tmp / f"decrypted.{out_fmt}"
        key_path  = tmp / "key.bin"
        meta_path = tmp / "meta.json"

        in_path.write_bytes(data)
        key_path.write_bytes(bytes.fromhex(key))
        meta_path.write_text(json.dumps(meta))

        cmd = [
            BINARY,
            "--decrypt",
            "--key",      str(key_path),
            "--input",    str(in_path),
            "--output",   str(out_path),
            "--metadata", str(meta_path),
        ]

        try:
            subprocess.run(cmd, check=True, timeout=30, capture_output=True)
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.decode(errors="replace")
            logger.error("decrypt failed (exit %d): %s", e.returncode, stderr)
            raise HTTPException(500, f"Decryption failed: {stderr}")

        if not out_path.exists():
            raise HTTPException(500, "Decryption produced no output file")

        decrypted_bytes = out_path.read_bytes()

    return JSONResponse({
        "decrypted_image": base64.b64encode(decrypted_bytes).decode(),
        "output_format":   out_fmt,
    })
