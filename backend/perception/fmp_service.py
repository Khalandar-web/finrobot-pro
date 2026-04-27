"""
fmp_service.py — Financial Modeling Prep (FMP) API client (Perception Layer).

Fetches income statements, balance sheets, cash flows, and ratios.
Docs: https://financialmodelingprep.com/developer/docs
"""

import os
import logging
import requests
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

FMP_API_KEY: str = os.getenv("FMP_API_KEY", "")
BASE_URL = "https://financialmodelingprep.com/api/v3"
TIMEOUT = 20


def _get(endpoint: str, params: Optional[Dict[str, Any]] = None) -> Any:
    """Generic FMP GET with error handling. Returns parsed JSON or None."""
    if not FMP_API_KEY:
        logger.warning("FMP_API_KEY not set — skipping %s", endpoint)
        return None
    p = params or {}
    p["apikey"] = FMP_API_KEY
    try:
        resp = requests.get(f"{BASE_URL}{endpoint}", params=p, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.Timeout:
        logger.error("FMP timeout: %s", endpoint)
    except requests.exceptions.HTTPError as exc:
        logger.error("FMP HTTP %s: %s", exc.response.status_code, endpoint)
    except Exception as exc:  # noqa: BLE001
        logger.error("FMP unexpected error: %s", exc)
    return None


def _first_or_empty(data: Any) -> Dict[str, Any]:
    """Return first element if data is a list, else empty dict."""
    if isinstance(data, list) and data:
        return data[0]
    return {}


def get_income_statement(ticker: str, year: Optional[int] = None) -> Dict[str, Any]:
    """Annual income statement for the most recent (or specified) year."""
    data = _get(f"/income-statement/{ticker}", {"period": "annual", "limit": 4})
    records: List[Dict] = data if isinstance(data, list) else []
    if year:
        for rec in records:
            if str(year) in str(rec.get("date", "")):
                return _clean_income(rec)
    return _clean_income(_first_or_empty(records))


def _clean_income(rec: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "date": rec.get("date"),
        "revenue": rec.get("revenue"),
        "gross_profit": rec.get("grossProfit"),
        "operating_income": rec.get("operatingIncome"),
        "net_income": rec.get("netIncome"),
        "eps": rec.get("eps"),
        "ebitda": rec.get("ebitda"),
        "gross_margin": rec.get("grossProfitRatio"),
        "net_margin": rec.get("netIncomeRatio"),
    }


def get_balance_sheet(ticker: str, year: Optional[int] = None) -> Dict[str, Any]:
    """Annual balance sheet."""
    data = _get(f"/balance-sheet-statement/{ticker}", {"period": "annual", "limit": 4})
    records: List[Dict] = data if isinstance(data, list) else []
    if year:
        for rec in records:
            if str(year) in str(rec.get("date", "")):
                return _clean_balance(rec)
    return _clean_balance(_first_or_empty(records))


def _clean_balance(rec: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "date": rec.get("date"),
        "total_assets": rec.get("totalAssets"),
        "total_liabilities": rec.get("totalLiabilities"),
        "total_equity": rec.get("totalStockholdersEquity"),
        "cash": rec.get("cashAndCashEquivalents"),
        "total_debt": rec.get("totalDebt"),
        "debt_to_equity": rec.get("debtEquityRatio"),
    }


def get_cash_flow(ticker: str, year: Optional[int] = None) -> Dict[str, Any]:
    """Annual cash flow statement."""
    data = _get(f"/cash-flow-statement/{ticker}", {"period": "annual", "limit": 4})
    records: List[Dict] = data if isinstance(data, list) else []
    if year:
        for rec in records:
            if str(year) in str(rec.get("date", "")):
                return _clean_cashflow(rec)
    return _clean_cashflow(_first_or_empty(records))


def _clean_cashflow(rec: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "date": rec.get("date"),
        "operating_cf": rec.get("operatingCashFlow"),
        "investing_cf": rec.get("investingCashFlow"),
        "financing_cf": rec.get("financingCashFlow"),
        "free_cf": rec.get("freeCashFlow"),
        "capex": rec.get("capitalExpenditure"),
        "dividends": rec.get("dividendsPaid"),
    }


def get_financial_ratios(ticker: str) -> Dict[str, Any]:
    """Key valuation and efficiency ratios (TTM)."""
    data = _get(f"/ratios-ttm/{ticker}")
    rec = _first_or_empty(data) if isinstance(data, list) else {}
    return {
        "pe_ratio": rec.get("peRatioTTM"),
        "pb_ratio": rec.get("priceToBookRatioTTM"),
        "ps_ratio": rec.get("priceToSalesRatioTTM"),
        "ev_ebitda": rec.get("enterpriseValueMultipleTTM"),
        "roe": rec.get("returnOnEquityTTM"),
        "roa": rec.get("returnOnAssetsTTM"),
        "current_ratio": rec.get("currentRatioTTM"),
        "debt_equity": rec.get("debtEquityRatioTTM"),
    }


def get_analyst_ratings(ticker: str) -> Dict[str, Any]:
    """Latest analyst consensus and price target."""
    data = _get(f"/analyst-stock-recommendations/{ticker}", {"limit": 1})
    rec = _first_or_empty(data) if isinstance(data, list) else {}
    return {
        "analyst_consensus": rec.get("recommendationMean"),
        "strong_buy": rec.get("strongBuy"),
        "buy": rec.get("buy"),
        "hold": rec.get("hold"),
        "sell": rec.get("sell"),
        "strong_sell": rec.get("strongSell"),
    }
