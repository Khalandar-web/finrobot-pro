"""
main.py — FastAPI application entry point for FinRobot-NVIDIA.

Run with:
    uvicorn main:app --reload

Swagger docs: http://127.0.0.1:8000/docs
"""

import logging
import os
import time
import math
import requests as _requests
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Load .env before any module imports that read env vars
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

from models.request_models import ForecastRequest, AnnualReportRequest
from models.response_models import ForecastResponse, AnnualReportResponse, ErrorResponse
from agents import market_forecast_agent, annual_report_agent
from agents.trading_signal_agent import generate_signal, generate_trading_signal
from brain.llm_engine import call_nvidia_llm
from perception.websocket_router import router as websocket_router
from pydantic import BaseModel

class AIChatRequest(BaseModel):
    query: str

class TradingSignalRequest(BaseModel):
    ticker: str

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("finrobot")

TRACE_FILE = r"C:\Users\syedk\OneDrive\Desktop\FinRobot\scratch\live_trace.log"

def trace_log(msg: str):
    try:
        with open(TRACE_FILE, "a", encoding="utf-8") as f:
            now = datetime.now().strftime("%H:%M:%S.%f")
            f.write(f"[{now}] [MAIN] {msg}\n")
    except:
        pass

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="FinRobot-NVIDIA",
    description=(
        "Institutional-grade Financial AI Agent Platform powered by NVIDIA NIM "
        "(meta/llama3-70b-instruct). Provides market forecasting and AI-generated "
        "annual equity reports via a clean REST API."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "FinRobot-NVIDIA",
        "url": "https://github.com/your-org/finrobot-nvidia",
    },
    license_info={
        "name": "MIT",
    },
)

# ── CORS (open for local dev; restrict in production) ─────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(websocket_router, prefix="/ws")

# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    """Health check — confirms the API is running."""
    return {
        "status": "ok",
        "service": "FinRobot-NVIDIA",
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    """Detailed health check including environment key presence."""
    keys = {
        "NVIDIA_API_KEY": bool(os.getenv("NVIDIA_API_KEY")),
        "FINNHUB_API_KEY": bool(os.getenv("FINNHUB_API_KEY")),
        "FMP_API_KEY": bool(os.getenv("FMP_API_KEY")),
        "SEC_API_KEY": bool(os.getenv("SEC_API_KEY")),
        "NEWS_API_KEY": bool(os.getenv("NEWS_API_KEY")),
    }
    all_set = all(keys.values())
    return {
        "status": "healthy" if all_set else "degraded",
        "debug_id": "STABLE_V7_TRACE",
        "api_keys_configured": keys,
        "note": "All keys must be set in the .env file for full functionality.",
    }


# ── Feature 0: Lightweight Quote (for Portfolio polling) ────────────────────────────────

@app.get(
    "/quote",
    tags=["Market Data"],
    summary="Real-time Quote",
    description="Returns the latest price, change %, open, high, low, and previous close for a ticker. Supports US (Finnhub) and Indian stocks (yfinance).",
)
def get_quote(ticker: str = Query(..., min_length=1, max_length=20, description="Ticker symbol")):
    from perception import stock_router

    ticker = stock_router.normalize_ticker(ticker.strip().upper())
    logger.info("GET /quote — ticker=%s", ticker)

    is_indian = stock_router.is_indian_stock(ticker)
    currency = stock_router.get_currency(ticker)

    result: Dict[str, Any] = {
        "ticker": ticker,
        "price": None,
        "change_pct": None,
        "open": None,
        "high": None,
        "low": None,
        "prev_close": None,
        "source": "none",
        "currency": currency,
    }

    if is_indian:
        # Indian stock — use yfinance
        try:
            from perception import yfinance_service
            q = yfinance_service.get_quote(ticker)
            if q and q.get("current_price"):
                result.update({
                    "price": q["current_price"],
                    "change_pct": q.get("change_pct"),
                    "open": q.get("open"),
                    "high": q.get("high"),
                    "low": q.get("low"),
                    "prev_close": q.get("prev_close"),
                    "source": "yfinance",
                })
        except Exception as exc:
            logger.warning("yfinance quote fetch failed for %s: %s", ticker, exc)
    else:
        # US stock — use existing Finnhub logic
        finnhub_key = os.getenv("FINNHUB_API_KEY", "")
        if not finnhub_key:
            return result
        try:
            r = _requests.get(
                "https://finnhub.io/api/v1/quote",
                params={"symbol": ticker, "token": finnhub_key},
                timeout=8,
            )
            r.raise_for_status()
            q = r.json()
            raw_c = q.get("c")
            raw_pc = q.get("pc")
            c = raw_c if (raw_c is not None and raw_c != 0) else None
            pc = raw_pc if (raw_pc is not None and raw_pc != 0) else None
            result.update({
                "price": c,
                "change_pct": round(((c - pc) / pc) * 100, 2) if (c is not None and pc is not None and pc != 0) else None,
                "open": q.get("o"),
                "high": q.get("h"),
                "low": q.get("l"),
                "prev_close": q.get("pc"),
                "source": "finnhub",
            })
        except Exception as exc:
            logger.warning("Finnhub quote fetch failed for %s: %s", ticker, exc)

    return result



# ── Feature 1: Market Forecast ────────────────────────────────────────────────
@app.post(
    "/forecast",
    response_model=ForecastResponse,
    responses={422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    tags=["Agents"],
    summary="Market Forecast Agent",
    description=(
        "Fetches real-time market data for a given ticker, runs a Financial "
        "Chain-of-Thought analysis via NVIDIA NIM (Llama 3 70B), and returns "
        "a structured forecast with directional prediction and confidence score."
    ),
)
def forecast(request: ForecastRequest):
    trace_log(f"ENTER /forecast for {request.ticker}")
    logger.info("POST /forecast — ticker=%s", request.ticker)
    try:
        trace_log("Calling Agent.run...")
        result = market_forecast_agent.run(ticker=request.ticker)
        trace_log("Agent.run returned")
        return ForecastResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error("Forecast agent error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error in /forecast")
        raise HTTPException(status_code=500, detail="Internal server error.") from exc


# ── Feature 2: Annual Report ──────────────────────────────────────────────────
@app.post(
    "/annual-report",
    tags=["Agents"],
    summary="Annual Report Agent",
    description=(
        "Fetches financial statements, 10-K SEC filing, and analyst data for a "
        "ticker and fiscal year. Generates an institutional 400-500 word equity "
        "report via NVIDIA NIM and returns a downloadable PDF file."
    ),
    responses={
        200: {"description": "PDF file download"},
        422: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
def annual_report(request: AnnualReportRequest):
    logger.info(
        "POST /annual-report — ticker=%s year=%d", request.ticker, request.year
    )
    try:
        report_text, pdf_path, word_count = annual_report_agent.run(
            ticker=request.ticker, year=request.year
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error("Annual report agent error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error in /annual-report")
        raise HTTPException(status_code=500, detail="Internal server error.") from exc

    pdf_file = Path(pdf_path)
    if not pdf_file.exists():
        raise HTTPException(status_code=500, detail="PDF generation failed.")

    return FileResponse(
        path=str(pdf_file),
        media_type="application/pdf",
        filename=pdf_file.name,
        headers={
            "X-Word-Count": str(word_count),
            "X-Ticker": request.ticker,
            "X-Year": str(request.year),
        },
    )


@app.post(
    "/annual-report/preview",
    response_model=AnnualReportResponse,
    tags=["Agents"],
    summary="Annual Report Preview (JSON)",
    description="Same as /annual-report but returns JSON with the report text and PDF path instead of a file download.",
)
def annual_report_preview(request: AnnualReportRequest):
    logger.info(
        "POST /annual-report/preview — ticker=%s year=%d",
        request.ticker,
        request.year,
    )
    try:
        report_text, pdf_path, word_count = annual_report_agent.run(
            ticker=request.ticker, year=request.year
        )
        return AnnualReportResponse(
            ticker=request.ticker,
            year=request.year,
            report_text=report_text,
            pdf_path=pdf_path,
            word_count=word_count,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error("Annual report preview error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error in /annual-report/preview")
        raise HTTPException(status_code=500, detail="Internal server error.") from exc


# ── Feature 3: Price History (Candlestick Data) ──────────────────────────────

@app.get(
    "/price-history",
    tags=["Market Data"],
    summary="OHLCV Price History",
    description="Returns OHLC + volume data for a ticker. Uses Finnhub (US) or yfinance (India). No synthetic fallback — returns empty candles if data is unavailable.",
)
def price_history(
    ticker: str = Query(..., min_length=1, max_length=20, description="Stock ticker symbol"),
    days: int = Query(30, ge=7, le=365, description="Number of trading days to return"),
):
    from perception import stock_router

    ticker = stock_router.normalize_ticker(ticker.strip().upper())
    logger.info("GET /price-history — ticker=%s days=%d", ticker, days)

    # Try stock router first (handles Indian stocks via yfinance)
    try:
        router_data = stock_router.get_price_history(ticker, days)
        logger.info("stock_router.get_price_history returned: type=%s, has_candles=%s",
                     type(router_data), bool(router_data and router_data.get("candles")) if router_data else False)
        if router_data and router_data.get("candles"):
            return router_data
    except Exception as exc:
        logger.error("stock_router.get_price_history raised: %s", exc)

    # If stock is Indian but router returned empty, try yfinance directly
    if stock_router.is_indian_stock(ticker):
        try:
            from perception import yfinance_service
            candles = yfinance_service.get_price_history(ticker, days)
            logger.info("Direct yfinance fallback for %s: %d candles", ticker, len(candles) if candles else 0)
            if candles:
                return {"ticker": ticker, "candles": candles[-days:], "source": "yfinance", "days": days, "currency": "INR"}
        except Exception as exc:
            logger.warning("Direct yfinance fallback failed for %s: %s", ticker, exc)

    # US stocks — Finnhub candle API
    finnhub_key = os.getenv("FINNHUB_API_KEY", "")
    if finnhub_key:
        try:
            end_ts = int(time.time())
            # Fetch enough calendar days to cover `days` trading days
            calendar_days = max(int(days * 1.5), days + 30)
            start_ts = end_ts - calendar_days * 86400
            url = "https://finnhub.io/api/v1/stock/candle"
            params = {
                "symbol": ticker,
                "resolution": "D",
                "from": start_ts,
                "to": end_ts,
                "token": finnhub_key,
            }
            resp = _requests.get(url, params=params, timeout=15)
            resp.raise_for_status()
            raw = resp.json()
            if raw.get("s") == "ok" and raw.get("t"):
                candles = []
                for i, ts in enumerate(raw["t"]):
                    candles.append({
                        "t": ts,
                        "o": raw["o"][i],
                        "h": raw["h"][i],
                        "l": raw["l"][i],
                        "c": raw["c"][i],
                        "v": raw.get("v", [0] * len(raw["t"]))[i],
                        "date": datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d"),
                    })
                return {"ticker": ticker, "candles": candles[-days:], "source": "finnhub", "days": days}
        except Exception as exc:
            logger.warning("Finnhub candle fetch failed for %s: %s", ticker, exc)

    # Fallback: use yfinance for US stocks too when Finnhub fails
    try:
        from perception import yfinance_service
        candles = yfinance_service.get_price_history(ticker, days)
        if candles:
            return {"ticker": ticker, "candles": candles[-days:], "source": "yfinance", "days": days}
    except Exception as exc:
        logger.warning("yfinance fallback failed for %s: %s", ticker, exc)

    # NO synthetic fallback — return empty candles with error indicator
    return {"ticker": ticker, "candles": [], "source": "none", "days": days, "error": "Unable to fetch price data"}


# ── Feature 4: Financial Charts Data (Revenue + EPS) ─────────────────────────

@app.get(
    "/financial-charts",
    tags=["Market Data"],
    summary="Revenue & EPS Trend Data",
    description="Returns annual revenue and EPS trend data for a ticker from FMP API (US) or yfinance (India).",
)
def financial_charts(ticker: str = Query(..., min_length=1, max_length=20)):
    from perception import stock_router

    fmp_key = os.getenv("FMP_API_KEY", "")
    ticker = stock_router.normalize_ticker(ticker.strip().upper())
    logger.info("GET /financial-charts — ticker=%s", ticker)

    # Try stock router first (handles Indian stocks via yfinance)
    router_data = stock_router.get_financial_charts(ticker)
    if router_data:
        return router_data

    # US stocks — FMP logic
    revenue_data: List[Dict[str, Any]] = []
    eps_data: List[Dict[str, Any]] = []

    if fmp_key:
        try:
            url = f"https://financialmodelingprep.com/api/v3/income-statement/{ticker}"
            resp = _requests.get(url, params={"period": "annual", "limit": 4, "apikey": fmp_key}, timeout=15)
            resp.raise_for_status()
            records = resp.json() if isinstance(resp.json(), list) else []
            for rec in reversed(records):
                year = str(rec.get("date", ""))[:4]
                revenue = rec.get("revenue")
                eps = rec.get("eps")
                if year and revenue is not None:
                    revenue_data.append({
                        "year": year,
                        "revenue": round(revenue / 1e9, 2),
                        "gross_profit": round((rec.get("grossProfit") or 0) / 1e9, 2),
                    })
                if year and eps is not None:
                    eps_data.append({"year": year, "eps": round(float(eps), 2)})
            if revenue_data:
                return {"ticker": ticker, "revenue": revenue_data, "eps": eps_data, "source": "fmp"}
        except Exception as exc:
            logger.warning("FMP financial charts fetch failed: %s", exc)

    # No synthetic fallback — return empty
    return {"ticker": ticker, "revenue": [], "eps": [], "source": "none"}


# ── Feature 5: News Feed with Sentiment ──────────────────────────────────────

_POSITIVE_WORDS = {
    "surge", "surges", "surged", "gain", "gains", "gained", "rally", "rallies",
    "beat", "beats", "record", "growth", "profit", "profits", "upgrade", "upgraded",
    "bullish", "outperform", "strong", "rises", "rose", "rise", "high", "higher",
    "boost", "boosted", "positive", "opportunity", "breakthrough", "exceed", "exceeds",
    "dividend", "buy", "soar", "soars", "soared", "jump", "jumps", "jumped",
}
_NEGATIVE_WORDS = {
    "drop", "drops", "dropped", "fall", "falls", "fell", "decline", "declines",
    "loss", "losses", "miss", "misses", "missed", "downgrade", "downgraded",
    "bearish", "underperform", "weak", "lower", "cut", "cuts", "layoff", "layoffs",
    "warning", "risk", "crash", "crashes", "plunge", "plunges", "plunged",
    "investigation", "lawsuit", "fine", "penalty", "recall", "concern", "uncertainty",
    "sell", "short", "slump", "slumps", "slumped",
}

def _tag_sentiment(text: str) -> str:
    """Keyword-based sentiment tagger. Returns 'positive', 'negative', or 'neutral'."""
    words = set(text.lower().replace(",", "").replace(".", "").replace("!", "").split())
    pos_score = len(words & _POSITIVE_WORDS)
    neg_score = len(words & _NEGATIVE_WORDS)
    if pos_score > neg_score:
        return "positive"
    elif neg_score > pos_score:
        return "negative"
    return "neutral"


@app.get(
    "/news",
    tags=["Market Data"],
    summary="Latest News with Sentiment",
    description="Returns top 5 latest news articles for a ticker with title, source, URL, published date, and sentiment tag.",
)
def get_news(ticker: str = Query(..., min_length=1, max_length=20)):
    from perception import stock_router

    news_key = os.getenv("NEWS_API_KEY", "")
    ticker = stock_router.normalize_ticker(ticker.strip().upper())
    logger.info("GET /news — ticker=%s", ticker)

    # For Indian stocks, strip suffix for better NewsAPI results
    search_term = ticker
    if stock_router.is_indian_stock(ticker):
        search_term = ticker.replace(".NS", "").replace(".BO", "")

    articles: List[Dict[str, Any]] = []

    if news_key:
        try:
            url = "https://newsapi.org/v2/everything"
            params = {
                "q": search_term,
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": 10,
                "apiKey": news_key,
            }
            resp = _requests.get(url, params=params, timeout=12)
            resp.raise_for_status()
            data = resp.json()
            raw_articles = data.get("articles", [])

            seen_titles: set = set()
            for art in raw_articles:
                title = art.get("title", "") or ""
                if not title or "[Removed]" in title or title in seen_titles:
                    continue
                seen_titles.add(title)
                sentiment = _tag_sentiment(title + " " + (art.get("description") or ""))
                articles.append({
                    "title": title,
                    "source": (art.get("source") or {}).get("name", "Unknown"),
                    "url": art.get("url", ""),
                    "published_at": art.get("publishedAt", ""),
                    "sentiment": sentiment,
                    "description": (art.get("description") or "")[:200],
                })
                if len(articles) >= 5:
                    break

        except Exception as exc:
            logger.warning("NewsAPI fetch failed: %s", exc)

    return {
        "ticker": ticker,
        "articles": articles,
        "count": len(articles),
        "source": "newsapi" if articles else "none",
    }


# ── Feature 6: Financial Metrics ─────────────────────────────────────────────

@app.get(
    "/financials",
    tags=["Market Data"],
    summary="Key Financial Metrics",
    description="Returns market cap, PE ratio, revenue, net income, and EPS. Supports US (FMP) and Indian (yfinance) stocks.",
)
def get_financials(ticker: str = Query(..., min_length=1, max_length=20)):
    from perception import stock_router

    fmp_key = os.getenv("FMP_API_KEY", "")
    ticker = stock_router.normalize_ticker(ticker.strip().upper())
    logger.info("GET /financials — ticker=%s", ticker)

    # Indian stocks — use yfinance via stock_router
    if stock_router.is_indian_stock(ticker):
        router_data = stock_router.get_financials(ticker)
        if router_data:
            return router_data
        # Fallback empty response for Indian if yfinance fails
        return {
            "ticker": ticker,
            "market_cap": None,
            "pe_ratio": None,
            "revenue": None,
            "net_income": None,
            "eps": None,
            "beta": None,
            "week_52_high": None,
            "week_52_low": None,
            "dividend_yield": None,
            "currency": "INR",
            "source": "none",
        }

    # US stocks — existing FMP logic
    result: Dict[str, Any] = {
        "ticker": ticker,
        "market_cap": None,
        "pe_ratio": None,
        "revenue": None,
        "net_income": None,
        "eps": None,
        "beta": None,
        "week_52_high": None,
        "week_52_low": None,
        "dividend_yield": None,
        "currency": "USD",
        "source": "none",
    }

    if not fmp_key:
        return result

    try:
        profile_url = f"https://financialmodelingprep.com/api/v3/profile/{ticker}"
        profile_resp = _requests.get(profile_url, params={"apikey": fmp_key}, timeout=12)
        profile_resp.raise_for_status()
        profiles = profile_resp.json()
        if profiles and isinstance(profiles, list):
            p = profiles[0]
            result["market_cap"] = p.get("mktCap")
            result["pe_ratio"] = p.get("pe")
            result["beta"] = p.get("beta")
            rng = str(p.get("range", ""))
            if "-" in rng:
                parts = rng.split("-")
                result["week_52_low"] = parts[0].strip()
                result["week_52_high"] = parts[1].strip() if len(parts) > 1 else None
            result["dividend_yield"] = p.get("lastDiv")
            result["currency"] = p.get("currency", "USD")
            result["source"] = "fmp"
    except Exception as exc:
        logger.warning("FMP profile fetch failed for %s: %s", ticker, exc)

    try:
        income_url = f"https://financialmodelingprep.com/api/v3/income-statement/{ticker}"
        inc_resp = _requests.get(income_url, params={"period": "annual", "limit": 1, "apikey": fmp_key}, timeout=12)
        inc_resp.raise_for_status()
        records = inc_resp.json()
        if records and isinstance(records, list):
            r = records[0]
            result["revenue"] = r.get("revenue")
            result["net_income"] = r.get("netIncome")
            result["eps"] = r.get("eps")
            result["source"] = "fmp"
    except Exception as exc:
        logger.warning("FMP income statement fetch failed for %s: %s", ticker, exc)

    return result


# ── Feature 7: Full Analysis (Combined Aggregator) ────────────────────────────

@app.get(
    "/full-analysis",
    tags=["Agents"],
    summary="Combined Full Analysis",
    description=(
        "Aggregates AI forecast, price quote, financial metrics, and latest news "
        "into a single response. All sub-requests run concurrently."
    ),
)
def full_analysis(ticker: str = Query(..., min_length=1, max_length=20)):
    from concurrent.futures import ThreadPoolExecutor

    from perception import stock_router
    ticker = stock_router.normalize_ticker(ticker.strip().upper())
    logger.info("GET /full-analysis — ticker=%s", ticker)

    finnhub_key = os.getenv("FINNHUB_API_KEY", "")
    fmp_key = os.getenv("FMP_API_KEY", "")
    news_key = os.getenv("NEWS_API_KEY", "")

    def _get_quote() -> Dict[str, Any]:
        try:
            return stock_router.get_quote(ticker)
        except Exception as exc:
            logger.warning("Quote fetch failed in full-analysis for %s: %s", ticker, exc)
            return {}

    def _get_fmp_profile() -> Dict[str, Any]:
        try:
            p = stock_router.get_company_profile(ticker)
            if p:
                return {
                    "market_cap": p.get("market_cap"),
                    "pe_ratio": p.get("pe_ratio"),
                    "sector": p.get("sector"),
                    "industry": p.get("industry"),
                    "company_name": p.get("name"),
                }
        except Exception as exc:
            logger.warning("Profile fetch failed in full-analysis for %s: %s", ticker, exc)
        return {}

    def _get_news_articles() -> List[Dict[str, Any]]:
        if not news_key:
            return []
        try:
            # Strip .NS/.BO for better search results
            search_term = ticker.replace(".NS", "").replace(".BO", "") if stock_router.is_indian_stock(ticker) else ticker
            r = _requests.get(
                "https://newsapi.org/v2/everything",
                params={"q": search_term, "language": "en", "sortBy": "publishedAt", "pageSize": 5, "apiKey": news_key},
                timeout=10,
            )
            r.raise_for_status()
            raw = r.json().get("articles", [])
            articles = []
            for art in raw[:5]:
                title = art.get("title", "") or ""
                if not title or "[Removed]" in title:
                    continue
                articles.append({
                    "title": title,
                    "source": (art.get("source") or {}).get("name", "Unknown"),
                    "url": art.get("url", ""),
                    "published_at": art.get("publishedAt", ""),
                    "sentiment": _tag_sentiment(title),
                })
            return articles
        except Exception:
            return []

    def _get_forecast() -> Dict[str, Any]:
        try:
            return market_forecast_agent.run(ticker=ticker)
        except Exception as exc:
            logger.warning("Forecast failed in full-analysis: %s", exc)
            return {}

    with ThreadPoolExecutor(max_workers=4) as executor:
        quote_future = executor.submit(_get_quote)
        profile_future = executor.submit(_get_fmp_profile)
        news_future = executor.submit(_get_news_articles)
        forecast_future = executor.submit(_get_forecast)

        quote_data = quote_future.result()
        profile_data = profile_future.result()
        news_data = news_future.result()
        forecast_data = forecast_future.result()

    return {
        "ticker": ticker,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "summary": forecast_data.get("summary", ""),
        "prediction": forecast_data.get("prediction", None),
        "confidence": forecast_data.get("confidence", None),
        "positives": forecast_data.get("positives", []),
        "risks": forecast_data.get("risks", []),
        "estimated_movement": forecast_data.get("estimated_movement", ""),
        "price_data": quote_data,
        "financials": {
            "market_cap": profile_data.get("market_cap") or forecast_data.get("market_cap"),
            "pe_ratio": profile_data.get("pe_ratio") or forecast_data.get("pe_ratio"),
            "sector": profile_data.get("sector"),
            "industry": profile_data.get("industry"),
            "company_name": profile_data.get("company_name"),
        },
        "news": news_data,
    }

# ── Feature: Real-Time AI Trading Signal ──────────────────────────────────────
@app.get("/signal", tags=["Analysis"])
async def get_trading_signal(ticker: str = Query(..., max_length=20)):
    """Generate a trading signal with simple indicators and AI reasoning."""
    signal_data = generate_signal(ticker)
    return signal_data

@app.post("/trading-signal", tags=["Analysis"])
def get_trading_signal_post(request: TradingSignalRequest):
    """Generate an AI trading signal (entry, targets, stop loss)."""
    return generate_trading_signal(request.ticker)


# ── Feature: Voice AI Chat ────────────────────────────────────────────────────
@app.post("/ai/chat", tags=["Analysis"])
def ai_chat(request: AIChatRequest):
    """Processes a raw question via NVIDIA Llama 3 70B and returns the string."""
    try:
        messages = [
            {"role": "system", "content": "You are FinRobot, an expert AI financial advisor. Keep your answers concise, clear, and conversational, perfect for being spoken out loud."},
            {"role": "user", "content": request.query}
        ]
        response_text = call_nvidia_llm(messages, max_tokens=150)
        return {"response": response_text}
    except Exception as e:
        logger.error(f"Voice Chat API Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI response.")


# ── Feature: Generate PDF Report ──────────────────────────────────────────────

class ReportRequest(BaseModel):
    ticker: str
    price: float = None
    trend: str = "Uptrend"
    suggestion: str = "HOLD"
    confidence: int = 50
    positives: list = []
    risks: list = []
    summary: str = ""
    prediction: str = "UP"
    estimated_movement: str = ""
    sentiment: str = "Neutral"
    financial_health: str = "Moderate"
    company_name: str = ""

@app.post("/generate-report", tags=["Reports"])
def generate_report(request: ReportRequest):
    """Generate a simple AI stock report as PDF."""
    from perception import stock_router
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    import uuid

    ticker = stock_router.normalize_ticker(request.ticker.strip().upper())
    currency = stock_router.get_currency(ticker)
    cur_sym = "₹" if currency == "INR" else "$"

    # Generate report text via LLM
    try:
        from utils.prompt_builder import build_simple_report_prompt, REPORT_SIMPLE_SYSTEM
        prompt = build_simple_report_prompt(
            ticker=ticker,
            price=request.price,
            trend=request.trend,
            suggestion=request.suggestion,
            confidence=request.confidence,
            positives=request.positives,
            risks=request.risks,
            summary=request.summary,
        )
        messages = [
            {"role": "system", "content": REPORT_SIMPLE_SYSTEM},
            {"role": "user", "content": prompt},
        ]
        report_text = call_nvidia_llm(messages, max_tokens=600)
    except Exception as exc:
        logger.warning("Report LLM failed: %s", exc)
        report_text = (
            f"AI Stock Analysis Report for {ticker}\n\n"
            f"{request.summary}\n\n"
            f"The AI suggests {request.suggestion} with {request.confidence}% confidence. "
            f"The stock is showing a {request.trend.lower()} pattern. "
            f"Market sentiment appears {request.sentiment.lower()} and the company's "
            f"financial health is rated as {request.financial_health.lower()}."
        )

    # Build PDF
    reports_dir = BASE_DIR / "reports"
    reports_dir.mkdir(exist_ok=True)
    filename = f"FinRobot_Report_{ticker}_{uuid.uuid4().hex[:6]}.pdf"
    pdf_path = reports_dir / filename

    doc = SimpleDocTemplate(str(pdf_path), pagesize=A4,
                            leftMargin=50, rightMargin=50, topMargin=40, bottomMargin=40)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('ReportTitle', parent=styles['Heading1'],
                                  fontSize=22, textColor=colors.HexColor('#1a1a2e'),
                                  spaceAfter=16, alignment=1)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'],
                                     fontSize=11, textColor=colors.HexColor('#6B7280'),
                                     spaceAfter=20, alignment=1)
    heading_style = ParagraphStyle('SectionHead', parent=styles['Heading2'],
                                    fontSize=14, textColor=colors.HexColor('#2563EB'),
                                    spaceBefore=16, spaceAfter=8)
    body_style = ParagraphStyle('Body', parent=styles['Normal'],
                                 fontSize=11, leading=16,
                                 textColor=colors.HexColor('#374151'))
    badge_style = ParagraphStyle('Badge', parent=styles['Normal'],
                                  fontSize=18, alignment=1,
                                  textColor=colors.HexColor('#059669' if request.suggestion == 'BUY'
                                                             else '#DC2626' if request.suggestion == 'SELL'
                                                             else '#D97706'),
                                  spaceBefore=8, spaceAfter=8)

    elements = []
    elements.append(Paragraph("📊 AI Stock Report", title_style))
    elements.append(Paragraph(f"Generated by FinRobot Pro — {datetime.now().strftime('%B %d, %Y %I:%M %p')}", subtitle_style))
    elements.append(Spacer(1, 8))

    # Key metrics table
    price_str = f"{cur_sym}{request.price:.2f}" if request.price else "N/A"
    metrics_data = [
        ["Company", request.company_name or ticker, "Price", price_str],
        ["Trend", request.trend, "Sentiment", request.sentiment],
        ["AI Suggestion", request.suggestion, "Confidence", f"{request.confidence}%"],
        ["Financial Health", request.financial_health, "Prediction", f"{request.prediction} {request.estimated_movement}"],
    ]
    t = Table(metrics_data, colWidths=[100, 140, 100, 140])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6B7280')),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#6B7280')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#111827')),
        ('TEXTCOLOR', (3, 0), (3, -1), colors.HexColor('#111827')),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 16))

    # Suggestion badge
    elements.append(Paragraph(f"✅ Final Suggestion: {request.suggestion}", badge_style))
    elements.append(Spacer(1, 12))

    # AI Analysis
    elements.append(Paragraph("AI Analysis", heading_style))
    for para in report_text.split('\n\n'):
        if para.strip():
            elements.append(Paragraph(para.strip(), body_style))
            elements.append(Spacer(1, 6))

    # Positives
    if request.positives:
        elements.append(Paragraph("Key Positives", heading_style))
        for p in request.positives:
            elements.append(Paragraph(f"✅ {p}", body_style))

    # Risks
    if request.risks:
        elements.append(Paragraph("Key Risks", heading_style))
        for r in request.risks:
            elements.append(Paragraph(f"⚠️ {r}", body_style))

    elements.append(Spacer(1, 24))
    disclaimer_style = ParagraphStyle('Disclaimer', parent=styles['Normal'],
                                       fontSize=8, textColor=colors.HexColor('#9CA3AF'),
                                       alignment=1)
    elements.append(Paragraph(
        "Disclaimer: This report is generated by AI for educational purposes only. "
        "It should not be considered financial advice. Always consult a qualified financial advisor.",
        disclaimer_style
    ))

    doc.build(elements)

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=filename,
        headers={"X-Ticker": ticker},
    )


# ── Feature: Compare Stocks ──────────────────────────────────────────────────

class CompareRequest(BaseModel):
    tickers: list  # list of 2 ticker strings

@app.post("/compare", tags=["Analysis"])
async def compare_stocks(request: CompareRequest):
    """Compare two stocks side by side with AI analysis."""
    from concurrent.futures import ThreadPoolExecutor
    from perception import stock_router

    if len(request.tickers) < 2:
        raise HTTPException(status_code=422, detail="Provide at least 2 tickers to compare.")

    tickers = [stock_router.normalize_ticker(t.strip().upper()) for t in request.tickers[:2]]

    def _get_data(t: str) -> Dict[str, Any]:
        try:
            quote = stock_router.get_quote(t)
            profile = stock_router.get_company_profile(t)
            currency = stock_router.get_currency(t)
            return {
                "ticker": t,
                "price": quote.get("current_price"),
                "change_pct": quote.get("change_pct"),
                "company_name": profile.get("name") or t,
                "market_cap": profile.get("market_cap"),
                "pe_ratio": profile.get("pe_ratio"),
                "sector": profile.get("sector"),
                "industry": profile.get("industry"),
                "currency": currency,
                "error": False,
            }
        except Exception as exc:
            logger.warning("Compare fetch failed for %s: %s", t, exc)
            return {"ticker": t, "error": True, "currency": stock_router.get_currency(t)}

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(_get_data, tickers))

    return {"stocks": results, "timestamp": datetime.utcnow().isoformat() + "Z"}

