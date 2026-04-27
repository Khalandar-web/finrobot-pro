"""
news_service.py — NewsAPI financial news client (Perception Layer).

Fetches the latest news headlines for a given ticker.
Docs: https://newsapi.org/docs
"""

import os
import logging
import requests
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

NEWS_API_KEY: str = os.getenv("NEWS_API_KEY", "")
BASE_URL = "https://newsapi.org/v2"
TIMEOUT = 15


def get_news_headlines(
    ticker: str,
    company_name: Optional[str] = None,
    max_headlines: int = 5,
) -> List[str]:
    """
    Fetch the most recent news headlines related to a stock ticker.

    Uses the 'everything' endpoint with the ticker (and optionally the
    company name) as the query term.

    Args:
        ticker:        Stock ticker symbol, e.g. 'AAPL'.
        company_name:  Optional full company name to improve relevance.
        max_headlines: Maximum number of headlines to return (default 5).

    Returns:
        List of headline strings.  Returns empty list on any failure.
    """
    if not NEWS_API_KEY:
        logger.warning("NEWS_API_KEY not set — news headlines unavailable.")
        return []

    query = ticker
    if company_name:
        query = f"{ticker} OR {company_name}"

    params: Dict[str, str | int] = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": max_headlines,
        "apiKey": NEWS_API_KEY,
    }

    try:
        resp = requests.get(f"{BASE_URL}/everything", params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        articles = resp.json().get("articles", [])
        headlines = [
            a.get("title", "").strip()
            for a in articles
            if a.get("title") and a["title"] != "[Removed]"
        ]
        return headlines[:max_headlines]
    except requests.exceptions.Timeout:
        logger.error("NewsAPI timeout for ticker %s", ticker)
    except requests.exceptions.HTTPError as exc:
        logger.error(
            "NewsAPI HTTP %s for ticker %s", exc.response.status_code, ticker
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("NewsAPI unexpected error: %s", exc)

    return []
