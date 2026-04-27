import asyncio
import json
import logging
import os
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets
from dotenv import load_dotenv

from perception.yfinance_service import get_quote

logger = logging.getLogger(__name__)
load_dotenv()

router = APIRouter()
FINNHUB_KEY = os.getenv("FINNHUB_API_KEY", "")

@router.websocket("/price/{symbol}")
async def price_stream(websocket: WebSocket, symbol: str):
    await websocket.accept()
    symbol = symbol.upper()
    is_indian = symbol.endswith(".NS") or symbol.endswith(".BO")

    try:
        if is_indian or not FINNHUB_KEY:
            # Polling fallback for Indian stocks (or if no Finnhub key)
            while True:
                quote = get_quote(symbol)
                price = quote.get("current_price") if quote else None
                if price is not None:
                    await websocket.send_json({
                        "symbol": symbol,
                        "price": price,
                        "timestamp": int(time.time() * 1000)
                    })
                await asyncio.sleep(4)
        else:
            # Finnhub WebSocket proxy for US Stocks
            finnhub_ws_url = f"wss://ws.finnhub.io?token={FINNHUB_KEY}"
            async with websockets.connect(finnhub_ws_url) as finnhub_ws:
                # Subscribe
                await finnhub_ws.send(json.dumps({"type": "subscribe", "symbol": symbol}))
                
                while True:
                    message_str = await finnhub_ws.recv()
                    data = json.loads(message_str)
                    
                    if data.get("type") == "trade" and "data" in data:
                        trades = data["data"]
                        if trades:
                            # Send the latest trade price
                            latest_trade = trades[-1]
                            await websocket.send_json({
                                "symbol": symbol,
                                "price": latest_trade["p"],
                                "timestamp": latest_trade["t"]
                            })
                    elif data.get("type") == "ping":
                        pass

    except WebSocketDisconnect:
        logger.info(f"Client disconnected from {symbol} stream")
    except Exception as e:
        logger.error(f"WebSocket error for {symbol}: {e}")
        try:
            await websocket.close()
        except:
            pass
