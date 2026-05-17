import json
import pandas as pd
from pathlib import Path


def compute_rsi_ema(close, period=14):
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def load_ticker_map(tickers_dir: Path) -> dict:
    """tickers_info/ 하위 JSON 전체를 읽어 {ticker: {Name, Sector}} 반환."""
    result = {}
    for jf in sorted(tickers_dir.glob("*.json")):
        with open(jf, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            result.update(data)
    return result
