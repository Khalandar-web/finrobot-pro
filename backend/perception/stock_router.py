"""
stock_router.py — Universal stock data router (Perception Layer).

Routes stock data requests to the correct backend:
  - Indian stocks (.NS, .BO) → yfinance
  - US/International stocks → Finnhub

This module provides a unified interface so callers don't need to
know which data source is being used.
"""

import logging
from typing import Any, Dict, List, Optional

from perception import finnhub_service
from perception import yfinance_service

logger = logging.getLogger(__name__)

# ─── Ticker Detection ─────────────────────────────────────────────────────────

INDIAN_SUFFIXES = (".NS", ".BO")

# Well-known Indian (NSE) tickers — auto-append .NS when entered without suffix
KNOWN_INDIAN_TICKERS = {
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN",
    "BHARTIARTL", "ITC", "KOTAKBANK", "LT", "HINDUNILVR", "MARUTI",
    "AXISBANK", "BAJFINANCE", "WIPRO", "HCLTECH", "ADANIENT",
    "TATAMOTORS", "SUNPHARMA", "TITAN", "TATASTEEL", "POWERGRID",
    "NTPC", "ONGC", "ULTRACEMCO", "TECHM", "JSWSTEEL", "NESTLEIND",
    "BAJAJFINSV", "INDUSINDBK", "COALINDIA", "GRASIM", "ADANIPORTS",
    "BRITANNIA", "CIPLA", "DRREDDY", "EICHERMOT", "HEROMOTOCO",
    "HINDALCO", "BPCL", "DIVISLAB", "APOLLOHOSP", "ASIANPAINT",
    "SPICEJET", "IDFCFIRSTB", "YESBANK", "BANKBARODA", "PNB",
    "VEDL", "TATAPOWER", "ZOMATO", "PAYTM", "NYKAA", "IRCTC",
    "HAL", "BEL", "NHPC", "IOC", "SAIL", "GAIL",
    "HDFCLIFE", "SBILIFE", "ICICIPRULI", "BAJAJ-AUTO",
    "M&M", "MUTHOOTFIN", "DLF", "GODREJCP", "PIDILITIND",
    "HAVELLS", "DABUR", "COLPAL", "BIOCON", "LUPIN",
    "TORNTPHARM", "AUROPHARMA", "LICHSGFIN",
}


def normalize_ticker(ticker: str) -> str:
    """
    Auto-append .NS for known Indian tickers entered without a suffix.

    Examples:
        RELIANCE  → RELIANCE.NS
        TCS       → TCS.NS
        TCS.NS    → TCS.NS  (unchanged)
        AAPL      → AAPL    (unchanged)
    """
    t = ticker.strip().upper()
    # Already has a suffix — keep as-is
    if t.endswith(INDIAN_SUFFIXES):
        return t
    # Known Indian ticker without suffix — add .NS
    if t in KNOWN_INDIAN_TICKERS:
        logger.info("[StockRouter] Normalized %s → %s.NS", t, t)
        return t + ".NS"
    return t


def is_indian_stock(ticker: str) -> bool:
    """Check if a ticker is an Indian stock (NSE or BSE)."""
    return ticker.upper().endswith(INDIAN_SUFFIXES)


def get_currency(ticker: str) -> str:
    """Return the native currency for a ticker."""
    return "INR" if is_indian_stock(ticker) else "USD"


# ─── Unified Data Fetching ────────────────────────────────────────────────────

def get_quote(ticker: str) -> Dict[str, Any]:
    """
    Fetch real-time quote from the appropriate source.
    Returns: { current_price, open, high, low, prev_close, change_pct }
    """
    ticker = normalize_ticker(ticker)
    if is_indian_stock(ticker):
        logger.info("[StockRouter] Indian stock detected: %s → yfinance", ticker)
        return yfinance_service.get_quote(ticker)
    else:
        logger.info("[StockRouter] US stock detected: %s → Finnhub", ticker)
        return finnhub_service.get_quote(ticker)


def get_company_profile(ticker: str) -> Dict[str, Any]:
    """
    Fetch company profile from the appropriate source.
    Returns: { name, market_cap, pe_ratio, industry, country, exchange }
    """
    ticker = normalize_ticker(ticker)
    if is_indian_stock(ticker):
        return yfinance_service.get_company_profile(ticker)
    else:
        return finnhub_service.get_company_profile(ticker)


def get_basic_financials(ticker: str) -> Dict[str, Any]:
    """
    Fetch basic financial metrics from the appropriate source.
    Returns: { revenue_ttm, net_income_ttm, total_debt, eps_ttm, ... }
    """
    ticker = normalize_ticker(ticker)
    if is_indian_stock(ticker):
        return yfinance_service.get_basic_financials(ticker)
    else:
        return finnhub_service.get_basic_financials(ticker)


def get_financials(ticker: str) -> Dict[str, Any]:
    """
    Fetch full financial metrics (market cap, PE, revenue, EPS, etc.).
    For Indian stocks → yfinance. For US stocks → returns None (caller uses FMP).
    """
    ticker = normalize_ticker(ticker)
    if not is_indian_stock(ticker):
        return None  # Let caller use existing FMP logic

    try:
        profile = yfinance_service.get_company_profile(ticker)
        basics = yfinance_service.get_basic_financials(ticker)

        market_cap_raw = profile.get("market_cap")  # already in millions

        return {
            "ticker": ticker,
            "market_cap": market_cap_raw,
            "pe_ratio": profile.get("pe_ratio"),
            "revenue": basics.get("revenue_ttm"),
            "net_income": basics.get("net_income_ttm"),
            "eps": basics.get("eps_ttm"),
            "beta": None,
            "week_52_high": None,
            "week_52_low": None,
            "dividend_yield": None,
            "currency": "INR",
            "source": "yfinance",
        }
    except Exception as exc:
        logger.error("[StockRouter] get_financials failed for %s: %s", ticker, exc)
        return None


def get_price_history(ticker: str, days: int = 30) -> Optional[Dict[str, Any]]:
    """
    Fetch OHLCV price history.
    For Indian stocks, uses yfinance directly.
    For US stocks, returns None (caller should use existing Finnhub logic).

    Returns: { candles: [...], source: "yfinance" } or None for US stocks.
    """
    ticker = normalize_ticker(ticker)
    if is_indian_stock(ticker):
        candles = yfinance_service.get_price_history(ticker, days)
        if candles:
            return {
                "ticker": ticker,
                "candles": candles,
                "source": "yfinance",
                "days": days,
                "currency": "INR",
            }
    return None  # Let caller use existing Finnhub logic


def get_financial_charts(ticker: str) -> Optional[Dict[str, Any]]:
    """
    Fetch revenue + EPS chart data.
    For Indian stocks, uses yfinance.
    For US stocks, returns None (caller should use existing FMP logic).
    """
    ticker = normalize_ticker(ticker)
    if is_indian_stock(ticker):
        data = yfinance_service.get_financial_charts(ticker)
        if data and (data.get("revenue") or data.get("eps")):
            return {
                "ticker": ticker,
                "revenue": data.get("revenue", []),
                "eps": data.get("eps", []),
                "source": "yfinance",
            }
    return None  # Let caller use existing FMP logic
