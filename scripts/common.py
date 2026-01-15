
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
# scripts/common.py 기준 → rsi_view/

def load_tickers(path="tickers.json"):
    ticker_path = BASE_DIR / path
    with open(ticker_path, "r", encoding="utf-8") as f:
        return json.load(f)
