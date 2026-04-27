"""
Response models — Pydantic schemas for outgoing API responses.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class ForecastResponse(BaseModel):
    """Structured response from Market Forecast Agent."""

    ticker: str = Field(..., description="Queried stock ticker")
    summary: str = Field(..., description="High-level market narrative summary")
    positives: List[str] = Field(
        ..., description="2–4 key positive drivers identified by the LLM"
    )
    risks: List[str] = Field(
        ..., description="2–4 risk factors identified by the LLM"
    )
    prediction: str = Field(
        ..., description="Directional prediction: UP or DOWN"
    )
    estimated_movement: str = Field(
        ..., description="Estimated price movement range, e.g. '2-4%'"
    )
    confidence: int = Field(
        ..., ge=0, le=100, description="LLM confidence score 0–100"
    )
    current_price: Optional[float] = Field(
        None, description="Real-time price fetched from data source"
    )
    market_cap: Optional[float] = Field(None, description="Market capitalisation")
    pe_ratio: Optional[float] = Field(None, description="Price-to-Earnings ratio")

    # ── New simple AI fields ──────────────────────────────────────
    trend: Optional[str] = Field(None, description="Uptrend or Downtrend")
    sentiment: Optional[str] = Field(None, description="Positive, Neutral, or Negative")
    financial_health: Optional[str] = Field(None, description="Strong, Moderate, or Weak")
    suggestion: Optional[str] = Field(None, description="BUY, SELL, or HOLD")
    why_trend: Optional[str] = Field(None, description="Simple explanation of trend")
    why_sentiment: Optional[str] = Field(None, description="Simple explanation of sentiment")
    why_financial: Optional[str] = Field(None, description="Simple explanation of financial health")
    currency: Optional[str] = Field(None, description="Currency symbol: USD or INR")
    data_source: Optional[str] = Field(None, description="Data source used")


class AnnualReportResponse(BaseModel):
    """Response from Annual Report Agent."""

    ticker: str = Field(..., description="Queried stock ticker")
    year: int = Field(..., description="Fiscal year of the report")
    report_text: str = Field(..., description="Full generated institute-style report text")
    pdf_path: str = Field(..., description="Server-side path to the generated PDF file")
    word_count: int = Field(..., description="Approximate word count of the report")


class ErrorResponse(BaseModel):
    """Standard error envelope."""

    error: str = Field(..., description="Human-readable error message")
    detail: Optional[str] = Field(None, description="Optional technical detail")
