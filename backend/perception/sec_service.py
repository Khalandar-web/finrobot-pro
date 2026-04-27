"""
sec_service.py — SEC EDGAR / sec-api.io client (Perception Layer).

Fetches 10-K filings and extracts risk factors for use in LLM prompts.
Docs: https://sec-api.io/docs
"""

import os
import re
import logging
import requests
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

SEC_API_KEY: str = os.getenv("SEC_API_KEY", "")
BASE_URL = "https://api.sec-api.io"
TIMEOUT = 30  # SEC endpoint can be slow


def _get_headers() -> Dict[str, str]:
    return {"Authorization": SEC_API_KEY} if SEC_API_KEY else {}


def search_10k(ticker: str, year: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Search sec-api.io EDGAR full-text search for the latest 10-K filing.

    Returns raw filing metadata dict or None on failure.
    """
    ticker = ticker.strip().upper()
    if ticker.endswith((".NS", ".BO")):
        logger.info("[SEC] Non-US stock %s — skipping 10-K search", ticker)
        return None

    if not SEC_API_KEY:
        logger.warning("SEC_API_KEY not set — 10-K data will be unavailable.")
        return None

    query: Dict[str, Any] = {
        "query": {
            "query_string": {
                "query": f'ticker:"{ticker}" AND formType:"10-K"'
            }
        },
        "from": "0",
        "size": "1",
        "sort": [{"filedAt": {"order": "desc"}}],
    }
    # Optionally filter to a specific fiscal year
    if year:
        query["dateRange"] = {
            "startdt": f"{year}-01-01",
            "enddt": f"{year}-12-31",
        }

    try:
        resp = requests.post(
            f"{BASE_URL}",
            json=query,
            headers=_get_headers(),
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        filings: List[Dict] = data.get("filings", [])
        return filings[0] if filings else None
    except requests.exceptions.Timeout:
        logger.error("SEC API timeout during 10-K search for %s", ticker)
    except requests.exceptions.HTTPError as exc:
        logger.error("SEC API HTTP %s for %s", exc.response.status_code, ticker)
    except Exception as exc:  # noqa: BLE001
        logger.error("SEC API unexpected error: %s", exc)
    return None


def fetch_filing_text(filing_url: str) -> Optional[str]:
    """
    Fetch raw text of a 10-K filing from a direct EDGAR URL.
    Returns up to 8000 chars to keep prompt size manageable.
    Uses streaming to avoid downloading massive multi-megabyte files.
    """
    try:
        # Stream the request to limit download size
        with requests.get(filing_url, timeout=TIMEOUT, stream=True) as resp:
            resp.raise_for_status()
            
            # Read first 500KB - more than enough for Risk Factor extraction
            chunk_size = 512 * 1024 
            raw_content = ""
            for chunk in resp.iter_content(chunk_size=chunk_size, decode_unicode=True):
                if chunk:
                    raw_content += chunk
                    break # Take only first 500KB
            
            # Strip HTML tags for cleaner text
            text = re.sub(r"<[^>]+>", " ", raw_content)
            text = re.sub(r"\s+", " ", text).strip()
            return text[:8000]
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to fetch filing text from %s: %s", filing_url, exc)
        return None


def extract_risk_factors(text: str) -> List[str]:
    """
    Rudimentary extraction of risk factor sentences from 10-K text.
    Looks for the "Risk Factors" section and pulls the first few sentences.

    Returns up to 5 risk factor strings.
    """
    if not text:
        return []

    # Locate "Risk Factors" section
    start_idx = text.lower().find("risk factor")
    if start_idx == -1:
        # Fallback: split text into sentences and return first 5
        sentences = [s.strip() for s in text.split(".") if len(s.strip()) > 40]
        return sentences[:5]

    section = text[start_idx: start_idx + 3000]
    sentences = [s.strip() for s in section.split(".") if len(s.strip()) > 50]
    # Filter out sentences that look like section headers
    risks = [s for s in sentences if not s.isupper() and len(s) < 300]
    return risks[:5]


def get_risk_factors_for_ticker(
    ticker: str, year: Optional[int] = None
) -> List[str]:
    """
    Convenience function: search for 10-K → fetch text → extract risks.

    Returns list of risk factor strings (may be empty if API unavailable).
    """
    filing = search_10k(ticker, year)
    if not filing:
        return []

    filing_url = filing.get("linkToFilingDetails") or filing.get("linkToHtml")
    if not filing_url:
        return []

    text = fetch_filing_text(filing_url)
    if not text:
        return []

    return extract_risk_factors(text)


def get_filing_summary(ticker: str, year: Optional[int] = None) -> str:
    """
    Return a brief text summary of the latest 10-K (first 1500 chars of body).
    Used as context in the Annual Report Agent prompt.
    """
    filing = search_10k(ticker, year)
    if not filing:
        return "10-K filing not available."

    summary_parts = [
        f"Filed: {filing.get('filedAt', 'N/A')}",
        f"Period: {filing.get('periodOfReport', 'N/A')}",
        f"Company: {filing.get('companyName', ticker)}",
    ]
    return " | ".join(summary_parts)
