"""
market_forecast_agent.py — Market Forecast Agent orchestrator.

Perception → Brain → Action pipeline for POST /forecast.
"""

import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

from perception import finnhub_service, fmp_service, sec_service, news_service
from brain import llm_engine, cot_reasoning
from utils import prompt_builder
from utils.validators import validate_ticker

import os
import datetime

TRACE_FILE = r"C:\Users\syedk\OneDrive\Desktop\FinRobot\scratch\live_trace.log"

def trace_log(msg: str):
    try:
        with open(TRACE_FILE, "a", encoding="utf-8") as f:
            now = datetime.datetime.now().strftime("%H:%M:%S.%f")
            f.write(f"[{now}] [AGENT] {msg}\n")
    except:
        pass

def run(ticker: str) -> Dict[str, Any]:
    trace_log(f"START run for {ticker}")
    """
    Full Market Forecast Agent pipeline.

    Steps:
      1. Validate input
      2. Perception — gather all market data
      3. Brain — build CoT prompt + call NVIDIA LLM
      4. Action — parse and return structured result

    Args:
        ticker: Stock ticker symbol (will be validated + uppercased).

    Returns:
        Dict conforming to ForecastResponse schema.

    Raises:
        ValueError: On invalid ticker.
        RuntimeError: On LLM or data retrieval failures.
    """
    # ── Step 1: Validate + Normalize ─────────────────────────────────────
    ticker = validate_ticker(ticker)
    # Normalize Indian tickers: RELIANCE → RELIANCE.NS
    from perception.stock_router import normalize_ticker, is_indian_stock, get_currency
    ticker = normalize_ticker(ticker)
    logger.info("[MarketForecastAgent] Starting for ticker=%s", ticker)

    from perception import stock_router

    # Detect currency
    currency = get_currency(ticker)
    data_source = "yfinance" if is_indian_stock(ticker) else "finnhub"

    # ── Step 2: Perception ───────────────────────────────────────────────
    trace_log("Entering Perception")
    
    try:
        trace_log("Fetching Quote...")
        quote = stock_router.get_quote(ticker)
        trace_log(f"Quote received: {quote.get('current_price')}")
    except Exception as exc:
        trace_log(f"Quote error: {exc}")
        quote = {}

    try:
        trace_log("Fetching Profile...")
        profile = stock_router.get_company_profile(ticker)
        trace_log(f"Profile received: {profile.get('name')}")
    except Exception as exc:
        trace_log(f"Profile error: {exc}")
        profile = {}

    try:
        trace_log("Fetching Basic Financials...")
        basic_fin = stock_router.get_basic_financials(ticker)
        trace_log("Financials received")
    except Exception as exc:
        trace_log(f"Financials error: {exc}")
        basic_fin = {}

    try:
        trace_log("Fetching Ratios...")
        ratios = fmp_service.get_financial_ratios(ticker)
        trace_log("Ratios received")
    except Exception as exc:
        trace_log(f"Ratios error: {exc}")
        ratios = {}

    try:
        trace_log("Fetching News...")
        news = news_service.get_news_headlines(ticker, max_headlines=5)
        trace_log(f"News received: {len(news)}")
    except Exception as exc:
        trace_log(f"News error: {exc}")
        news = []

    try:
        trace_log("Fetching Risks (SEC)...")
        risk_factors = sec_service.get_risk_factors_for_ticker(ticker)
        trace_log(f"Risks received: {len(risk_factors)}")
    except Exception as exc:
        trace_log(f"Risks error: {exc}")
        risk_factors = []

    trace_log("Perception Complete")
    market_data: Dict[str, Any] = {
        "current_price": quote.get("current_price"),
        "market_cap": profile.get("market_cap"),
        "pe_ratio": profile.get("pe_ratio") or ratios.get("pe_ratio"),
        "revenue": basic_fin.get("revenue_ttm"),
        "net_income": basic_fin.get("net_income_ttm"),
        "debt": basic_fin.get("total_debt"),
    }

    # ── Step 3: Brain — build CoT prompt ─────────────────────────────────
    trace_log("Building Prompt")
    user_prompt = prompt_builder.build_forecast_user_prompt(
        ticker=ticker,
        price=market_data["current_price"],
        market_cap=market_data["market_cap"],
        pe_ratio=market_data["pe_ratio"],
        revenue=market_data["revenue"],
        net_income=market_data["net_income"],
        debt=market_data["debt"],
        news_headlines=news,
        risk_factors=risk_factors,
        financial_ratios=ratios,
    )

    messages = cot_reasoning.build_forecast_messages(
        system_prompt=prompt_builder.FORECAST_SYSTEM_PROMPT,
        user_prompt=user_prompt,
    )

    trace_log("Calling NVIDIA NIM...")
    try:
        llm_result: Dict[str, Any] = llm_engine.call_nvidia_llm_json(
            messages=messages,
            temperature=0.3,
            max_tokens=1024,
        )
        trace_log("NVIDIA NIM Responded")
    except Exception as exc:
        logger.warning("[MarketForecastAgent] LLM call failed: %s — using fallback", exc)
        llm_result = {
            "summary": "AI analysis is currently unavailable. Market data has been collected but the AI model could not generate insights at this time. Please try again later.",
            "positives": ["Market data successfully retrieved"],
            "risks": ["AI analysis temporarily unavailable"],
            "prediction": "UP",
            "estimated_movement": "N/A",
            "confidence": 50,
            "trend": "Uptrend",
            "sentiment": "Neutral",
            "financial_health": "Moderate",
            "suggestion": "HOLD",
            "why_trend": "Unable to determine trend at this time",
            "why_sentiment": "News analysis unavailable",
            "why_financial": "Financial data collected but AI unavailable",
        }

    # ── Step 4: Action — enrich and return ────────────────────────────────
    raw_confidence = llm_result.get("confidence")
    try:
        if raw_confidence is not None:
            confidence = int(float(raw_confidence))
            confidence = max(0, min(100, confidence)) # Clamp 0-100
        else:
            confidence = 50
    except (ValueError, TypeError):
        confidence = 50

    # Derive simple fields with fallbacks
    prediction = (llm_result.get("prediction", "") or "UP").upper()
    trend = llm_result.get("trend") or ("Uptrend" if prediction == "UP" else "Downtrend")
    suggestion = llm_result.get("suggestion") or ("BUY" if prediction == "UP" else "SELL")
    sentiment = llm_result.get("sentiment") or "Neutral"
    financial_health = llm_result.get("financial_health") or "Moderate"

    result: Dict[str, Any] = {
        "ticker": ticker,
        "summary": llm_result.get("summary", "") or "Analysis currently unavailable.",
        "positives": llm_result.get("positives", []),
        "risks": llm_result.get("risks", []),
        "prediction": prediction,
        "estimated_movement": llm_result.get("estimated_movement", ""),
        "confidence": confidence,
        "current_price": market_data["current_price"],
        "market_cap": market_data["market_cap"],
        "pe_ratio": market_data["pe_ratio"],
        # New simple fields
        "trend": trend,
        "sentiment": sentiment,
        "financial_health": financial_health,
        "suggestion": suggestion,
        "why_trend": llm_result.get("why_trend") or f"The stock shows a {trend.lower()} pattern based on recent price movement.",
        "why_sentiment": llm_result.get("why_sentiment") or f"Market sentiment appears {sentiment.lower()} based on recent news.",
        "why_financial": llm_result.get("why_financial") or f"The company's financial health is {financial_health.lower()}.",
        "currency": currency,
        "data_source": data_source,
    }

    logger.info(
        "[MarketForecastAgent] Done — prediction=%s confidence=%s suggestion=%s",
        result["prediction"],
        result["confidence"],
        result["suggestion"],
    )
    return result
