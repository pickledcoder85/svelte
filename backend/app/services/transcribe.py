"""Speech to text for "Tell Gus what you have": a short recording from the phone, turned into
words by OpenAI's transcription model (the same key Gus uses). Nothing is stored; only the
text comes back."""
from __future__ import annotations

import base64
import binascii

import httpx

from backend.app.config import Settings

OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions"
TRANSCRIBE_TIMEOUT_SECONDS = 30
# About a minute of compressed speech is well under this.
MAX_AUDIO_BYTES = 5 * 1024 * 1024
# What phones record (iOS Safari: audio/mp4) and what the transcription API accepts.
AUDIO_TYPES = {
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
    "audio/aac": "m4a",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
}
# Hints so food words come out right.
PROMPTS = {
    "en": "Someone listing the foods they have at home, e.g. chicken thighs, brown rice, spinach, eggs, feta.",
    "es": "Alguien dice los alimentos que tiene en casa, p. ej. muslos de pollo, arroz integral, espinaca, huevos, queso campesino.",
}


class TranscribeError(ValueError):
    """The recording couldn't be used (shown to the user)."""


class TranscribeNotConfiguredError(RuntimeError):
    pass


def decode_audio(audio_base64: str, mime_type: str) -> tuple[bytes, str]:
    """(audio bytes, file extension), or TranscribeError."""
    base_type = (mime_type or "").split(";")[0].strip().lower()
    extension = AUDIO_TYPES.get(base_type)
    if extension is None:
        raise TranscribeError("That recording format isn't supported. Try again.")
    payload = audio_base64.split(",", 1)[1] if audio_base64.startswith("data:") else audio_base64
    try:
        audio = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as error:
        raise TranscribeError("The recording could not be read. Try again.") from error
    if not audio:
        raise TranscribeError("The recording is empty. Try again.")
    if len(audio) > MAX_AUDIO_BYTES:
        raise TranscribeError("The recording is too long. Keep it under a minute.")
    return audio, extension


async def transcribe_audio(
    settings: Settings, audio: bytes, extension: str, mime_type: str, language: str = "en",
    client: httpx.AsyncClient | None = None,
) -> str:
    if not settings.openai_api_key:
        raise TranscribeNotConfiguredError("Voice isn't set up on this server.")
    owned = client is None
    client = client or httpx.AsyncClient(timeout=TRANSCRIBE_TIMEOUT_SECONDS)
    try:
        response = await client.post(
            OPENAI_TRANSCRIPTIONS_URL,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            data={
                "model": settings.transcribe_model,
                "language": "es" if language == "es" else "en",
                "prompt": PROMPTS["es" if language == "es" else "en"],
                "response_format": "json",
            },
            files={"file": (f"speech.{extension}", audio, mime_type.split(";")[0].strip() or "application/octet-stream")},
        )
        response.raise_for_status()
        text = str((response.json() or {}).get("text") or "").strip()
    finally:
        if owned:
            await client.aclose()
    if not text:
        raise TranscribeError("Gus didn't catch anything. Try again a little closer to the phone.")
    return text[:600]
