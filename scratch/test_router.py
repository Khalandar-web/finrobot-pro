import sys
import os
from pathlib import Path

BASE_DIR = Path(r"c:\Users\syedk\OneDrive\Desktop\FinRobot\backend")
sys.path.append(str(BASE_DIR))
os.chdir(str(BASE_DIR))

from perception import stock_router
print("Testing get_price_history for SPICEJET.NS")
res = stock_router.get_price_history("SPICEJET", 30)
if res and res.get('candles'):
    print("SUCCESS: Candles fetched:", len(res['candles']))
    print("Source:", res.get("source"))
else:
    print("FAILED to fetch candles:", res)
