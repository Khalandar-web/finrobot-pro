"""
annual_report_agent.py — Annual Report Agent orchestrator.

Perception → Brain → Action pipeline for POST /annual-report.
"""

import logging
from typing import Any, Dict, Tuple

from perception import fmp_service, sec_service
from brain import llm_engine, cot_reasoning
from action import report_generator, pdf_exporter
from utils import prompt_builder
from utils.validators import validate_ticker, validate_year

logger = logging.getLogger(__name__)


def run(ticker: str, year: int) -> Tuple[str, str, int]:
    """
    Full Annual Report Agent pipeline.

    Steps:
      1. Validate inputs
      2. Perception — gather financial statements + SEC filing
      3. Brain — build prompt + call NVIDIA LLM
      4. Action — format report, export PDF

    Args:
        ticker: Stock ticker symbol.
        year:   Fiscal year (e.g. 2023).

    Returns:
        Tuple of (report_text, pdf_path, word_count).

    Raises:
        ValueError: On invalid inputs.
        RuntimeError: On LLM or data retrieval failures.
    """
    # ── Step 1: Validate ─────────────────────────────────────────────────
    ticker = validate_ticker(ticker)
    year = validate_year(year)
    logger.info("[AnnualReportAgent] Starting for ticker=%s year=%d", ticker, year)

    # ── Step 2: Perception ───────────────────────────────────────────────
    income_stmt = fmp_service.get_income_statement(ticker, year=year)
    balance_sheet = fmp_service.get_balance_sheet(ticker, year=year)
    cash_flow = fmp_service.get_cash_flow(ticker, year=year)
    analyst_ratings = fmp_service.get_analyst_ratings(ticker)
    filing_summary = sec_service.get_filing_summary(ticker, year=year)
    risk_factors = sec_service.get_risk_factors_for_ticker(ticker, year=year)

    logger.info(
        "[AnnualReportAgent] Perception complete — income=%s, risks=%d",
        bool(income_stmt),
        len(risk_factors),
    )

    # ── Step 3: Brain ─────────────────────────────────────────────────────
    user_prompt = prompt_builder.build_annual_report_user_prompt(
        ticker=ticker,
        year=year,
        income_statement=income_stmt,
        balance_sheet=balance_sheet,
        cash_flow=cash_flow,
        analyst_ratings=analyst_ratings,
        filing_summary=filing_summary,
        risk_factors=risk_factors,
    )

    messages = cot_reasoning.build_report_messages(
        system_prompt=prompt_builder.REPORT_SYSTEM_PROMPT,
        user_prompt=user_prompt,
    )

    logger.info("[AnnualReportAgent] Sending annual report prompt to NVIDIA NIM…")
    raw_report_text: str = llm_engine.call_nvidia_llm(
        messages=messages,
        temperature=0.4,
        max_tokens=1500,
    )

    # ── Step 4: Action — clean, format, export PDF ────────────────────────
    cleaned_text = report_generator.clean_llm_text(raw_report_text)
    formatted_report = report_generator.format_annual_report(ticker, year, cleaned_text)

    # Financial highlights for the PDF table — handle None values gracefully
    def _fmt_val(val, prefix='₹'):
        """Format a financial value: return 'N/A' for None/empty, else prefix + formatted number."""
        if val is None or val == 'N/A' or val == '':
            return 'N/A'
        try:
            num = float(val)
            if abs(num) >= 1e9:
                return f"{prefix}{num/1e9:.1f}B"
            elif abs(num) >= 1e6:
                return f"{prefix}{num/1e6:.1f}M"
            elif abs(num) >= 1e3:
                return f"{prefix}{num/1e3:.1f}K"
            else:
                return f"{prefix}{num:,.2f}"
        except (ValueError, TypeError):
            return str(val)

    financial_highlights = {
        "Revenue": _fmt_val(income_stmt.get('revenue')),
        "Net Income": _fmt_val(income_stmt.get('net_income')),
        "Gross Margin": f"{income_stmt.get('gross_margin', 'N/A')}" if income_stmt.get('gross_margin') not in (None, 'N/A', '') else 'N/A',
        "Operating CF": _fmt_val(cash_flow.get('operating_cf')),
        "Free Cash Flow": _fmt_val(cash_flow.get('free_cf')),
        "Total Debt": _fmt_val(balance_sheet.get('total_debt')),
        "Total Equity": _fmt_val(balance_sheet.get('total_equity')),
    }

    pdf_path = pdf_exporter.export_annual_report_pdf(
        ticker=ticker,
        year=year,
        report_text=cleaned_text,
        financial_highlights=financial_highlights,
    )

    word_count = len(cleaned_text.split())
    logger.info(
        "[AnnualReportAgent] Done — pdf=%s words=%d", pdf_path, word_count
    )
    return formatted_report, pdf_path, word_count
