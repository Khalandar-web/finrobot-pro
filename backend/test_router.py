import sys
import os

# Add backend dir to python path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from perception import stock_router

def run_tests():
    print("Testing US Stock (AAPL)...")
    try:
        quote = stock_router.get_quote("AAPL")
        print(f"AAPL Quote: {quote}")
        currency = stock_router.get_currency("AAPL")
        print(f"AAPL Currency: {currency}")
    except Exception as e:
        print(f"Error testing AAPL: {e}")

    print("\nTesting Indian Stock (RELIANCE.NS)...")
    try:
        quote = stock_router.get_quote("RELIANCE.NS")
        print(f"RELIANCE Quote: {quote}")
        currency = stock_router.get_currency("RELIANCE.NS")
        print(f"RELIANCE Currency: {currency}")
    except Exception as e:
        print(f"Error testing RELIANCE.NS: {e}")

if __name__ == "__main__":
    run_tests()
