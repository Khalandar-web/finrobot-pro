import os
from pathlib import Path

file_path = Path(r"c:\Users\syedk\OneDrive\Desktop\FinRobot\backend\perception\yfinance_service.py")

new_code = """\"\"\"
yfinance_service.py - Market data via yfinance for Indian stocks (Perception Layer).

Used for NSE/BSE tickers (e.g. RELIANCE.NS, TCS.NS, SPICEJET.BO).
Free - no API key required.
\"\"\"

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime
import yfinance as yf

logger = logging.getLogger(__name__)


def _safe_get(info: dict, key: str, default=None):
    \"\"\"Safely get a value from yfinance info dict, treating 0 as valid.\"\"\"
    val = info.get(key)
    if val is None:
        return default
    return val

def _get_alternate_ticker(ticker: str) -> str:
    \"\"\"Return alternate suffix for Indian stocks if the current one fails.\"\"\"
    if ticker.endswith(".NS"):
        return ticker.replace(".NS", ".BO")
    elif ticker.endswith(".BO"):
        return ticker.replace(".BO", ".NS")
    return ticker

def get_quote(ticker: str, retry: bool = True) -> Dict[str, Any]:
    \"\"\"
    Fetch real-time quote for an Indian stock via yfinance.

    Returns keys matching finnhub_service.get_quote() format:
    current_price, open, high, low, prev_close, change_pct
    \"\"\"
    try:
        stock = yf.Ticker(ticker)
        info = stock.info or {}

        current_price = (
            _safe_get(info, "currentPrice")
            or _safe_get(info, "regularMarketPrice")
            or _safe_get(info, "previousClose")
        )

        prev_close = _safe_get(info, "previousClose") or _safe_get(info, "regularMarketPreviousClose")
        open_price = _safe_get(info, "open") or _safe_get(info, "regularMarketOpen")
        high_price = _safe_get(info, "dayHigh") or _safe_get(info, "regularMarketDayHigh")
        low_price = _safe_get(info, "dayLow") or _safe_get(info, "regularMarketDayLow")

        # Fallback to history if info is blocked/empty
        if not current_price or current_price == 0:
            hist = stock.history(period="5d")
            if not hist.empty:
                last_row = hist.iloc[-1]
                current_price = float(last_row["Close"])
                open_price = float(last_row["Open"])
                high_price = float(last_row["High"])
                low_price = float(last_row["Low"])
                if len(hist) > 1:
                    prev_close = float(hist.iloc[-2]["Close"])
            elif retry:
                alt = _get_alternate_ticker(ticker)
                if alt != ticker:
                    logger.warning("[yfinance] No price data for %s, trying %s", ticker, alt)
                    return get_quote(alt, retry=False)

        if not current_price or current_price == 0:
            logger.warning("[yfinance] No price data for %s", ticker)
            return {}

        change_pct = None
        if current_price and prev_close and prev_close != 0:
            change_pct = round(((current_price - prev_close) / prev_close) * 100, 2)

        return {
            "current_price": round(current_price, 2) if current_price else None,
            "open": round(open_price, 2) if open_price else None,
            "high": round(high_price, 2) if high_price else None,
            "low": round(low_price, 2) if low_price else None,
            "prev_close": round(prev_close, 2) if prev_close else None,
            "change_pct": change_pct,
        }
    except Exception as exc:
        if retry:
            alt = _get_alternate_ticker(ticker)
            if alt != ticker:
                logger.warning("[yfinance] Quote fetch failed for %s, trying %s", ticker, alt)
                return get_quote(alt, retry=False)
        logger.error("[yfinance] Quote fetch failed for %s: %s", ticker, exc)
        return {}


def get_company_profile(ticker: str, retry: bool = True) -> Dict[str, Any]:
    \"\"\"
    Fetch company profile for an Indian stock.
    Returns keys matching finnhub_service.get_company_profile() format.
    \"\"\"
    try:
        stock = yf.Ticker(ticker)
        info = stock.info or {}
        
        name = _safe_get(info, "longName") or _safe_get(info, "shortName")
        if not name and retry:
            alt = _get_alternate_ticker(ticker)
            if alt != ticker:
                logger.warning("[yfinance] Profile empty for %s, trying %s", ticker, alt)
                return get_company_profile(alt, retry=False)

        market_cap = _safe_get(info, "marketCap")
        # yfinance returns marketCap in raw number; convert to millions for consistency
        market_cap_m = round(market_cap / 1e6, 2) if market_cap else None

        return {
            "name": name,
            "market_cap": market_cap_m,
            "pe_ratio": _safe_get(info, "trailingPE") or _safe_get(info, "forwardPE"),
            "industry": _safe_get(info, "industry"),
            "country": _safe_get(info, "country"),
            "exchange": _safe_get(info, "exchange"),
            "sector": _safe_get(info, "sector"),
        }
    except Exception as exc:
        if retry:
            alt = _get_alternate_ticker(ticker)
            if alt != ticker:
                logger.warning("[yfinance] Profile fetch failed for %s, trying %s", ticker, alt)
                return get_company_profile(alt, retry=False)
        logger.error("[yfinance] Profile fetch failed for %s: %s", ticker, exc)
        return {}


def get_price_history(ticker: str, days: int = 30, retry: bool = True) -> List[Dict[str, Any]]:
    \"\"\"
    Fetch OHLCV price history for an Indian stock.

    Returns list of candle dicts matching the /price-history response format:
    { t, o, h, l, c, v, date }
    \"\"\"
    try:
        stock = yf.Ticker(ticker)

        # Map days to yfinance period
        if days <= 7:
            period = "5d"
        elif days <= 30:
            period = "1mo"
        elif days <= 90:
            period = "3mo"
        else:
            period = "1y"

        hist = stock.history(period=period, interval="1d")

        if hist.empty:
            if retry:
                alt = _get_alternate_ticker(ticker)
                if alt != ticker:
                    logger.warning("[yfinance] No history data for %s, trying %s", ticker, alt)
                    return get_price_history(alt, days, retry=False)
            logger.warning("[yfinance] No history data for %s", ticker)
            return []

        candles = []
        for idx, row in hist.iterrows():
            ts = int(idx.timestamp())
            candles.append({
                "t": ts,
                "o": round(float(row["Open"]), 2),
                "h": round(float(row["High"]), 2),
                "l": round(float(row["Low"]), 2),
                "c": round(float(row["Close"]), 2),
                "v": int(row.get("Volume", 0)),
                "date": idx.strftime("%Y-%m-%d"),
            })

        return candles[-days:]  # Trim to requested number of days
    except Exception as exc:
        if retry:
            alt = _get_alternate_ticker(ticker)
            if alt != ticker:
                logger.warning("[yfinance] History fetch failed for %s, trying %s", ticker, alt)
                return get_price_history(alt, days, retry=False)
        logger.error("[yfinance] History fetch failed for %s: %s", ticker, exc)
        return []


def get_basic_financials(ticker: str, retry: bool = True) -> Dict[str, Any]:
    \"\"\"
    Fetch basic financial metrics for an Indian stock.
    Returns keys matching finnhub_service.get_basic_financials() format.
    \"\"\"
    try:
        stock = yf.Ticker(ticker)
        info = stock.info or {}
        
        revenue = _safe_get(info, "totalRevenue")
        if not revenue and retry:
            alt = _get_alternate_ticker(ticker)
            if alt != ticker:
                logger.warning("[yfinance] Financials empty for %s, trying %s", ticker, alt)
                return get_basic_financials(alt, retry=False)

        return {
            "revenue_ttm": revenue,
            "net_income_ttm": _safe_get(info, "netIncomeToCommon"),
            "total_debt": _safe_get(info, "totalDebt"),
            "eps_ttm": _safe_get(info, "trailingEps"),
            "book_value_per_share": _safe_get(info, "bookValue"),
            "roa": _safe_get(info, "returnOnAssets"),
            "roe": _safe_get(info, "returnOnEquity"),
        }
    except Exception as exc:
        if retry:
            alt = _get_alternate_ticker(ticker)
            if alt != ticker:
                logger.warning("[yfinance] Financials fetch failed for %s, trying %s", ticker, alt)
                return get_basic_financials(alt, retry=False)
        logger.error("[yfinance] Financials fetch failed for %s: %s", ticker, exc)
        return {}


def get_financial_charts(ticker: str, retry: bool = True) -> Dict[str, Any]:
    \"\"\"
    Fetch annual revenue + EPS data for charts.
    Returns { revenue: [...], eps: [...] } matching /financial-charts format.
    \"\"\"
    try:
        stock = yf.Ticker(ticker)

        # Try to get annual financials
        financials = stock.financials  # columns = years, rows = line items
        if (financials is None or financials.empty) and retry:
            alt = _get_alternate_ticker(ticker)
            if alt != ticker:
                logger.warning("[yfinance] Financial charts empty for %s, trying %s", ticker, alt)
                return get_financial_charts(alt, retry=False)

        if financials is None or financials.empty:
            return {"revenue": [], "eps": []}

        revenue_data = []
        eps_data = []

        # financials columns are datetime - most recent first
        for col in reversed(financials.columns):
            year = str(col.year)
            rev = financials.loc["Total Revenue", col] if "Total Revenue" in financials.index else None
            gp = financials.loc["Gross Profit", col] if "Gross Profit" in financials.index else None

            if rev is not None and not (hasattr(rev, '__float__') and rev != rev):  # NaN check
                revenue_data.append({
                    "year": year,
                    "revenue": round(float(rev) / 1e9, 2),
                    "gross_profit": round(float(gp) / 1e9, 2) if gp is not None else 0,
                })

        # EPS from info
        info = stock.info or {}
        trailing_eps = _safe_get(info, "trailingEps")
        if trailing_eps and revenue_data:
            eps_data.append({
                "year": revenue_data[-1]["year"] if revenue_data else str(datetime.utcnow().year),
                "eps": round(float(trailing_eps), 2),
            })

        return {"revenue": revenue_data, "eps": eps_data}
    except Exception as exc:
        if retry:
            alt = _get_alternate_ticker(ticker)
            if alt != ticker:
                logger.warning("[yfinance] Financial charts fetch failed for %s, trying %s", ticker, alt)
                return get_financial_charts(alt, retry=False)
        logger.error("[yfinance] Financial charts fetch failed for %s: %s", ticker, exc)
        return {"revenue": [], "eps": []}
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_code)
print("Updated yfinance_service.py successfully!")
