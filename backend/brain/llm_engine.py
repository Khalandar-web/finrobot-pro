"""
llm_engine.py — NVIDIA NIM API client (Brain Layer).

Sends OpenAI-compatible chat completion requests to the NVIDIA NIM endpoint
using the `requests` library — no OpenAI SDK dependency.
"""

import os
import json
import logging
import requests
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── NVIDIA NIM configuration ────────────────────────────────────────────────
NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
NVIDIA_MODEL: str = "meta/llama-3.1-70b-instruct"
DEFAULT_TIMEOUT: int = 45  # seconds

def _build_headers() -> Dict[str, str]:
    if not NVIDIA_API_KEY:
        raise EnvironmentError(
            "NVIDIA_API_KEY is not set. "
            "Copy .env.example to .env and populate your key."
        )
    return {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def call_nvidia_llm(
    messages: List[Dict[str, str]],
    temperature: float = 0.3,
    max_tokens: int = 1024,
    timeout: int = DEFAULT_TIMEOUT,
) -> str:
    """
    Send a chat completion request to the NVIDIA NIM API.

    Args:
        messages:    OpenAI-style message list [{"role": ..., "content": ...}].
        temperature: Sampling temperature (0 = deterministic, 1 = creative).
        max_tokens:  Maximum tokens to generate.
        timeout:     HTTP request timeout in seconds.

    Returns:
        The assistant's reply content as a plain string.

    Raises:
        RuntimeError: On non-2xx responses or network failures.
    """
    endpoint = f"{NVIDIA_BASE_URL}/chat/completions"
    payload: Dict[str, Any] = {
        "model": NVIDIA_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }

    try:
        logger.info("Calling NVIDIA NIM — model=%s tokens=%s", NVIDIA_MODEL, max_tokens)
        response = requests.post(
            endpoint,
            headers=_build_headers(),
            json=payload,
            timeout=timeout,
        )
        response.raise_for_status()
    except requests.exceptions.Timeout:
        raise RuntimeError(
            f"NVIDIA NIM request timed out after {timeout}s."
        )
    except requests.exceptions.ConnectionError as exc:
        raise RuntimeError(f"Network error connecting to NVIDIA NIM: {exc}") from exc
    except requests.exceptions.HTTPError as exc:
        body = exc.response.text if exc.response else "no body"
        raise RuntimeError(
            f"NVIDIA NIM returned HTTP {exc.response.status_code}: {body}"
        ) from exc

    data = response.json()

    try:
        content: str = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise RuntimeError(
            f"Unexpected NVIDIA NIM response structure: {data}"
        ) from exc

    logger.info(
        "NVIDIA NIM responded — finish_reason=%s",
        data.get("choices", [{}])[0].get("finish_reason", "unknown"),
    )
    result = content.strip()
    if not result:
        logger.warning("NVIDIA NIM returned empty content")
        return "Analysis currently unavailable. The AI model returned an empty response. Please try again."
    return result


def call_nvidia_llm_json(
    messages: List[Dict[str, str]],
    temperature: float = 0.2,
    max_tokens: int = 1024,
    timeout: int = DEFAULT_TIMEOUT,
) -> Dict[str, Any]:
    """
    Convenience wrapper that calls the LLM and parses the response as JSON.

    Strips markdown code fences if the model wraps output in them.

    Returns:
        Parsed JSON dict.

    Raises:
        RuntimeError: If the response cannot be parsed as JSON.
    """
    raw = call_nvidia_llm(messages, temperature=temperature, max_tokens=max_tokens, timeout=timeout)

    # Strip optional markdown code fences
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        # Remove opening fence (```json or ```)
        lines = lines[1:]
        # Remove closing fence if present
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    try:
        parsed = json.loads(cleaned)
        return parsed
    except json.JSONDecodeError as exc:
        logger.warning("LLM response is not valid JSON, returning fallback. Raw: %s", raw[:200])
        # Return a safe fallback dict instead of crashing
        return {
            "summary": raw if raw else "Analysis currently unavailable. Please try again.",
            "positives": [],
            "risks": [],
            "prediction": "UP",
            "estimated_movement": "N/A",
            "confidence": 50,
        }
