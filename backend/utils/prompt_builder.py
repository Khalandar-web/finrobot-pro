"""
prompt_builder.py — Structured prompt assembly utilities.

All raw LLM prompt strings live here so that agents stay thin
and the brain layer receives fully-formed, ready-to-send messages.
"""

from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Market Forecast Prompts
# ---------------------------------------------------------------------------

FORECAST_SYSTEM_PROMPT = """You are a simple and clear AI stock analyst.
Your job is to produce an EASY-TO-UNDERSTAND stock analysis that even a teacher or student can follow.
Avoid complex financial jargon. Use simple words.
Always reason step-by-step before writing your conclusion.
If some data fields show N/A, still provide analysis based on available information.
Do NOT say "insufficient data" — analyze what IS available.
Respond ONLY with valid JSON — no markdown, no code fences, no extra text."""


def _detect_currency(ticker: str) -> str:
    """Detect currency symbol for prompt based on ticker suffix."""
    t = ticker.upper()
    if t.endswith(".NS") or t.endswith(".BO"):
        return "₹"
    return "$"


def build_forecast_user_prompt(
    ticker: str,
    price: Optional[float],
    market_cap: Optional[float],
    pe_ratio: Optional[float],
    revenue: Optional[float],
    net_income: Optional[float],
    debt: Optional[float],
    news_headlines: List[str],
    risk_factors: List[str],
    financial_ratios: Dict[str, Any],
) -> str:
    """
    Build the Financial Chain-of-Thought prompt for the Market Forecast Agent.
    Produces SIMPLE, teacher-friendly output.
    """
    cur = _detect_currency(ticker)

    headlines_block = "\n".join(
        f"  {i+1}. {h}" for i, h in enumerate(news_headlines[:5])
    ) or "  No recent headlines available."

    risks_block = "\n".join(
        f"  - {r}" for r in risk_factors[:4]
    ) or "  No SEC risk factors available."

    ratios_block = (
        "\n".join(f"  {k}: {v}" for k, v in list(financial_ratios.items())[:8])
        or "  No ratios available."
    )

    # Format values with correct currency, handle None gracefully
    def _fv(val, prefix=True):
        if val is None:
            return "N/A"
        return f"{cur}{val}" if prefix else str(val)

    # Count available data points for data quality note
    available = sum(1 for v in [price, market_cap, pe_ratio, revenue, net_income, debt] if v is not None)
    data_quality = "HIGH" if available >= 5 else "MODERATE" if available >= 3 else "LIMITED"

    return f"""
You are analysing {ticker}. Follow these reasoning steps strictly.
Data Quality: {data_quality} ({available}/6 core metrics available)

## STEP 1 — FINANCIAL SNAPSHOT
Current Data:
  Price          : {_fv(price)}
  Market Cap     : {_fv(market_cap)}
  P/E Ratio      : {_fv(pe_ratio, prefix=False)}
  Revenue (TTM)  : {_fv(revenue)}
  Net Income     : {_fv(net_income)}
  Total Debt     : {_fv(debt)}

Financial Ratios:
{ratios_block}

## STEP 2 — RECENT NEWS SENTIMENT
{headlines_block}

## STEP 3 — REGULATORY & RISK FACTORS (from latest 10-K)
{risks_block}

## STEP 4 — SIMPLE ANALYSIS
Think step by step in SIMPLE language:
  a) Is the stock price going up (Uptrend) or down (Downtrend)?
  b) Is the news about this company Positive, Negative, or Neutral?
  c) Is the company financially Strong, Moderate, or Weak?
  d) Based on all this, should someone BUY, SELL, or HOLD?
  e) How confident are you (0-100)?
  f) What are 2-3 simple reasons FOR this stock?
  g) What are 2-3 simple risks?

## STEP 5 — OUTPUT REQUIREMENT
Return ONLY a JSON object with exactly these keys:
{{
  "summary": "<2-3 sentence SIMPLE explanation a student can understand. No jargon.>",
  "trend": "Uptrend" or "Downtrend",
  "sentiment": "Positive" or "Neutral" or "Negative",
  "financial_health": "Strong" or "Moderate" or "Weak",
  "suggestion": "BUY" or "SELL" or "HOLD",
  "why_trend": "<1 sentence explaining the price trend simply>",
  "why_sentiment": "<1 sentence about what news/market mood says>",
  "why_financial": "<1 sentence about company's money health>",
  "positives": ["<simple positive 1>", "<simple positive 2>", ...],
  "risks": ["<simple risk 1>", "<simple risk 2>", ...],
  "prediction": "UP" or "DOWN",
  "estimated_movement": "<e.g. 2-4%>",
  "confidence": <integer 0-100>
}}

Now produce the JSON:
""".strip()


# ---------------------------------------------------------------------------
# Annual Report Prompts
# ---------------------------------------------------------------------------

REPORT_SYSTEM_PROMPT = """You are a senior financial analyst at a top-tier investment bank.
You write institutional-quality annual equity reports — precise, objective, and data-driven.
Your reports are read by portfolio managers and CFOs.
Write in plain professional prose. Do NOT use bullet points or headers — continuous paragraphs only.
Target length: 400–500 words."""


def build_annual_report_user_prompt(
    ticker: str,
    year: int,
    income_statement: Dict[str, Any],
    balance_sheet: Dict[str, Any],
    cash_flow: Dict[str, Any],
    analyst_ratings: Dict[str, Any],
    filing_summary: str,
    risk_factors: List[str],
) -> str:
    """
    Build the Annual Report generation prompt for the Annual Report Agent.

    Sections mandated by spec:
      1. Executive Summary
      2. Business Overview
      3. Financial Performance Analysis
      4. Valuation Discussion
      5. Risk Assessment
      6. Outlook
    """
    risks_text = "; ".join(risk_factors[:3]) if risk_factors else "None disclosed."

    def _fmt_dict(d: Dict[str, Any]) -> str:
        return ", ".join(f"{k}: {v}" for k, v in list(d.items())[:6]) or "N/A"

    return f"""
Write a professional institutional annual equity report for {ticker} for fiscal year {year}.

### FINANCIAL DATA PROVIDED:
Income Statement : {_fmt_dict(income_statement)}
Balance Sheet    : {_fmt_dict(balance_sheet)}
Cash Flow        : {_fmt_dict(cash_flow)}
Analyst Ratings  : {_fmt_dict(analyst_ratings)}
10-K Summary     : {filing_summary[:600] if filing_summary else 'Not available.'}
Key Risk Factors : {risks_text}

### REQUIRED REPORT STRUCTURE (continuous prose, NO bullet points):
1. Executive Summary — Overall financial health and key highlights.
2. Business Overview — Core business segments and competitive positioning.
3. Financial Performance Analysis — Revenue trends, margins, profitability.
4. Valuation Discussion — P/E, EV/EBITDA, peer comparison context.
5. Risk Assessment — Top risks drawn from the 10-K and market context.
6. Outlook — Forward guidance, catalysts, and analyst consensus view.

Word target: 400–500 words. Write it now:
""".strip()


# ---------------------------------------------------------------------------
# Stock Report Prompt (Simple, for Generate Report feature)
# ---------------------------------------------------------------------------

REPORT_SIMPLE_SYSTEM = """You are FinRobot, an AI stock analysis assistant.
Write a SIMPLE, clear stock report that a student or teacher can understand.
No complex financial jargon. Use everyday language.
Write in paragraph form, 200-300 words."""

def build_simple_report_prompt(
    ticker: str,
    price: Optional[float],
    trend: str,
    suggestion: str,
    confidence: int,
    positives: List[str],
    risks: List[str],
    summary: str,
) -> str:
    cur = _detect_currency(ticker)
    price_str = f"{cur}{price:.2f}" if price else "N/A"
    pos_text = "\n".join(f"  - {p}" for p in positives) or "  None identified"
    risk_text = "\n".join(f"  - {r}" for r in risks) or "  None identified"

    return f"""
Write a simple AI stock report for {ticker}.

Key Facts:
- Current Price: {price_str}
- Price Trend: {trend}
- AI Suggestion: {suggestion}
- Confidence: {confidence}%
- AI Summary: {summary}

Positives:
{pos_text}

Risks:
{risk_text}

Write a 200-300 word report covering:
1. Company overview (1-2 sentences)
2. Current market situation
3. Why AI suggests {suggestion}
4. Key risks to watch
5. Final conclusion

Use simple language. No jargon. Write it now:
""".strip()
