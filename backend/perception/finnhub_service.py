"""
finnhub_service.py — Real-time market data via Finnhub API (Perception Layer).

Docs: https://finnhub.io/docs/api
"""

import os
import logging
import requests
from typing import Any, Dict, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

FINNHUB_API_KEY: str = os.getenv("FINNHUB_API_KEY", "")
BASE_URL = "https://finnhub.io/api/v1"
TIMEOUT = 15


def _get(endpoint: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Generic GET helper with error handling."""
    if not FINNHUB_API_KEY:
        logger.warning("FINNHUB_API_KEY not set — skipping request to %s", endpoint)
        return None
    params["token"] = FINNHUB_API_KEY
    try:
        resp = requests.get(f"{BASE_URL}{endpoint}", params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.Timeout:
        logger.error("Finnhub timeout: %s", endpoint)
    except requests.exceptions.HTTPError as exc:
        logger.error("Finnhub HTTP error %s: %s", exc.response.status_code, endpoint)
    except Exception as exc:  # noqa: BLE001
        logger.error("Finnhub unexpected error: %s", exc)
    return None


def get_quote(ticker: str) -> Dict[str, Any]:
    """
    Fetch real-time quote for a ticker.

    Returns keys: current_price, open, high, low, prev_close, change_pct
    """
    data = _get("/quote", {"symbol": ticker})
    if not data:
        return {}
    # Guard: Finnhub returns all zeros for unrecognized tickers
    raw_c = data.get("c")
    raw_pc = data.get("pc")
    c = raw_c if (raw_c is not None and raw_c != 0) else None
    pc = raw_pc if (raw_pc is not None and raw_pc != 0) else None
    return {
        "current_price": c,
        "open": data.get("o") or None,
        "high": data.get("h") or None,
        "low": data.get("l") or None,
        "prev_close": pc,
        "change_pct": round(
            ((c - pc) / pc) * 100, 2
        )
        if (c is not None and pc is not None and pc != 0)
        else None,
    }


def get_company_profile(ticker: str) -> Dict[str, Any]:
    """
    Fetch company profile including market cap, P/E, sector.
    """
    data = _get("/stock/profile2", {"symbol": ticker})
    if not data:
        return {}
    return {
        "name": data.get("name"),
        "market_cap": data.get("marketCapitalization"),
        "pe_ratio": data.get("pe"),
        "industry": data.get("finnhubIndustry"),
        "country": data.get("country"),
        "exchange": data.get("exchange"),
    }


def get_basic_financials(ticker: str) -> Dict[str, Any]:
    """
    Fetch annual basic financial metrics (revenue, net income, debt).
    Returns a flat dict of the most recent annual figures.
    """
    data = _get("/stock/metric", {"symbol": ticker, "metric": "all"})
    if not data or "metric" not in data:
        return {}
    m = data["metric"]
    return {
        "revenue_ttm": m.get("revenueTTM"),
        "net_income_ttm": m.get("netIncomeAnnual"),
        "total_debt": m.get("totalDebtAnnual"),
        "eps_ttm": m.get("epsTTM"),
        "book_value_per_share": m.get("bookValuePerShareAnnual"),
        "roa": m.get("roaRfy"),
        "roe": m.get("roeRfy"),
    }
