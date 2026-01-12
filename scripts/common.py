
import json
from pathlib import Path

def load_tickers(path="../tickers.json"):
    with open(Path(path), "r", encoding="utf-8") as f:
        return json.load(f)["tickers"]
