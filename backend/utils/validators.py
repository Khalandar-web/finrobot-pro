"""
validators.py — Input sanitisation helpers shared across agents.
"""

import re
from typing import Optional


VALID_TICKER_RE = re.compile(r"^[A-Z0-9&\-\.]{1,20}$")


def validate_ticker(ticker: Optional[str]) -> str:
    """
    Ensure a ticker is a non-empty, uppercase alphanumeric string.
    Supports tickers like BRK.B, M&M, BAJAJ-AUTO, RELIANCE.NS

    Raises:
        ValueError: if the ticker fails validation.
    """
    if not ticker:
        raise ValueError("Ticker symbol must not be empty.")
    ticker = ticker.strip().upper()
    if not VALID_TICKER_RE.match(ticker):
        raise ValueError(
            f"Invalid ticker '{ticker}'. Must be 1–20 uppercase letters, digits, dots, hyphens, or ampersands."
        )
    return ticker


def validate_year(year: Optional[int]) -> int:
    """
    Ensure a fiscal year is within a sensible range.

    Raises:
        ValueError: if the year is out of the accepted range.
    """
    if year is None:
        raise ValueError("Year must not be None.")
    if not (2000 <= year <= 2030):
        raise ValueError(f"Year {year} is out of the accepted range (2000–2030).")
    return year


def sanitize_text(text: str, max_length: int = 5000) -> str:
    """Strip and truncate arbitrary text to prevent prompt injection / overflow."""
    return text.strip()[:max_length]
