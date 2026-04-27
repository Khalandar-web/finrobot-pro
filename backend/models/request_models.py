"""
Request models — Pydantic schemas for incoming API requests.
"""

from pydantic import BaseModel, Field, field_validator
import re


class ForecastRequest(BaseModel):
    """Request body for Market Forecast Agent."""

    ticker: str = Field(
        ...,
        min_length=1,
        max_length=15,
        description="Stock ticker symbol (e.g. AAPL, MSFT, TSLA, TCS.NS)",
        examples=["AAPL"],
    )

    @field_validator("ticker")
    @classmethod
    def validate_ticker(cls, v: str) -> str:
        v = v.strip().upper()
        if not re.match(r"^[A-Z\.]{1,15}$", v):
            raise ValueError(
                "Ticker must contain only uppercase letters and dots (1–15 characters)."
            )
        return v


class AnnualReportRequest(BaseModel):
    """Request body for Annual Report Agent."""

    ticker: str = Field(
        ...,
        min_length=1,
        max_length=15,
        description="Stock ticker symbol (e.g. MSFT, AAPL, RELIANCE.NS)",
        examples=["MSFT"],
    )
    year: int = Field(
        ...,
        ge=2000,
        le=2025,
        description="Fiscal year for the annual report (e.g. 2023)",
        examples=[2023],
    )

    @field_validator("ticker")
    @classmethod
    def validate_ticker(cls, v: str) -> str:
        v = v.strip().upper()
        if not re.match(r"^[A-Z\.]{1,15}$", v):
            raise ValueError(
                "Ticker must contain only uppercase letters and dots (1–15 characters)."
            )
        return v
