#!/usr/bin/env python3
"""Private EPRIS transcription worker.

The worker is intentionally small and has one responsibility: turn short
normalised audio chunks into JSON transcripts. In stream mode it keeps one
model in memory and emits a checkpoint after every chunk. It never opens a
network connection itself and never sends editorial audio outside the VPS.
The first model download is performed during server setup, not from browser.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


DEFAULT_MODEL = os.environ.get("INTERVIEW_WHISPER_MODEL", "/opt/epris-interviews/models/small.en")
DEFAULT_DEVICE = os.environ.get("INTERVIEW_WHISPER_DEVICE", "cpu")
DEFAULT_COMPUTE = os.environ.get("INTERVIEW_WHISPER_COMPUTE", "int8")


def output(payload: dict, newline: bool = False) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))
    if newline:
        sys.stdout.write("\n")
    sys.stdout.flush()


def dependency_status() -> dict:
    try:
        from faster_whisper import WhisperModel  # noqa: F401
    except Exception as error:  # pragma: no cover - depends on VPS setup
        return {
            "ready": False,
            "engine": "Local Whisper",
            "model": DEFAULT_MODEL,
            "detail": "Local transcription package is not installed.",
            "technical": str(error)[:220],
        }
    model_path = Path(DEFAULT_MODEL)
    if not (model_path.is_dir() and (model_path / "model.bin").is_file() and (model_path / "config.json").is_file()):
        return {
            "ready": False,
            "engine": "Local Whisper",
            "model": "small.en",
            "detail": "The local English model is being prepared on the server.",
        }
    return {
        "ready": True,
        "engine": "Local Whisper",
        "model": "small.en",
        "device": DEFAULT_DEVICE,
        "compute": DEFAULT_COMPUTE,
        "detail": "Audio stays on the editorial server.",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--health", action="store_true")
    parser.add_argument("--input", action="append")
    parser.add_argument("--language", default="en")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--stream", action="store_true")
    args = parser.parse_args()

    status = dependency_status()
    if args.health:
        output(status)
        return 0 if status["ready"] else 2
    if not status["ready"]:
        output({"error": status["detail"]})
        return 2
    inputs = args.input or []
    if not inputs or any(not Path(item).is_file() for item in inputs):
        output({"error": "Input audio chunk is unavailable."})
        return 2

    from faster_whisper import WhisperModel

    model = WhisperModel(
        args.model,
        device=DEFAULT_DEVICE,
        compute_type=DEFAULT_COMPUTE,
        cpu_threads=max(1, int(os.environ.get("INTERVIEW_WHISPER_THREADS", "4"))),
        num_workers=1,
    )
    for index, input_path in enumerate(inputs):
        if args.stream:
            output({"event": "start", "index": index, "count": len(inputs)}, newline=True)
        segments, info = model.transcribe(
            input_path,
            language=args.language or "en",
            beam_size=5,
            best_of=5,
            vad_filter=True,
            condition_on_previous_text=True,
            word_timestamps=False,
        )
        rows = []
        for row in segments:
            text = str(row.text or "").strip()
            if text:
                rows.append({"start": round(float(row.start), 3), "end": round(float(row.end), 3), "speaker": "Speaker", "text": text})
        payload = {
            "engine": "local-whisper",
            "model": args.model,
            "language": getattr(info, "language", args.language),
            "segments": rows,
            "text": " ".join(row["text"] for row in rows),
        }
        if args.stream:
            output({"event": "result", "index": index, "count": len(inputs), "payload": payload}, newline=True)
        else:
            output(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
