import json
from pathlib import Path

def load_tickers():
    # 이 파일(common.py) 기준 경로
    base_dir = Path(__file__).resolve().parent.parent
    ticker_path = base_dir / "tickers.json"

    if not ticker_path.exists():
        raise FileNotFoundError(f"tickers.json not found: {ticker_path}")

    with open(ticker_path, "r", encoding="utf-8") as f:
        return json.load(f)["tickers"]
