import yfinance as yf

stock = yf.Ticker("SPICEJET.NS")
hist = stock.history(period="1mo", interval="1d")
print("SPICEJET.NS hist.empty:", hist.empty)
if not hist.empty:
    print(hist.head(2))

stock_bo = yf.Ticker("SPICEJET.BO")
hist_bo = stock_bo.history(period="1mo", interval="1d")
print("SPICEJET.BO hist.empty:", hist_bo.empty)
