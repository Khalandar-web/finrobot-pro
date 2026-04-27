import sys
import os
from pathlib import Path

BASE_DIR = Path(r"c:\Users\syedk\OneDrive\Desktop\FinRobot\backend")
sys.path.append(str(BASE_DIR))
os.chdir(str(BASE_DIR))

from perception import stock_router

print("Testing get_quote for AAPL")
try:
    print(stock_router.get_quote("AAPL"))
    print("Testing get_company_profile for AAPL")
    print(stock_router.get_company_profile("AAPL"))
    print("Testing get_price_history for AAPL")
    print(len(stock_router.get_price_history("AAPL") or []))
except Exception as e:
    print("ERROR:", e)
