import sys
import os
import logging

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from agents import market_forecast_agent

# Setup logging to console
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

def test_forecast(ticker):
    print(f"--- Testing Forecast for {ticker} ---")
    try:
        result = market_forecast_agent.run(ticker)
        print("RESULT SUCCESS:")
        print(result.get('summary')[:100] + "...")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    ticker = sys.argv[1] if len(sys.argv) > 1 else "AAPL"
    test_forecast(ticker)
