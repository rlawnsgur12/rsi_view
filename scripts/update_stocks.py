import sys
import yfinance as yf
import pandas as pd
import json
from pathlib import Path
from utils import compute_rsi_ema

sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
TICKERS_DIR = BASE_DIR / "tickers_info"
OUT_DIR = BASE_DIR / "data"
OUT_DIR.mkdir(exist_ok=True)


def process_tickers(ticker_list, output_path, ticker_info_map=None):
    rsi_list = []

    for ticker in ticker_list:
        try:
            print(f"처리 중: {ticker}")
            data = yf.download(ticker, period="2mo", interval="1d", progress=False, auto_adjust=False)
            if data.empty or "Close" not in data:
                print(f"{ticker}: 데이터 없음")
                continue

            close_data = data["Close"]
            if isinstance(close_data, pd.DataFrame) and ticker in close_data.columns:
                close_data = close_data[ticker]

            rsi_series = compute_rsi_ema(close_data).dropna()
            if rsi_series.empty:
                continue

            last_rsi = float(rsi_series.iloc[-1])
            last_week = rsi_series.iloc[-7:]
            rsi_below_30_in_7days = "🕐" if (last_week <= 30).any() else ""

            stock = yf.Ticker(ticker)
            info = stock.info

            extra = (ticker_info_map or {}).get(ticker, {})

            rsi_list.append({
                "Ticker":               ticker,
                "Name":                 extra.get("Name", "-"),
                "Sector":               extra.get("Sector", "-"),
                "RSI":                  round(last_rsi, 2),
                "RSI_30이하":           "✅" if last_rsi <= 30 else "",
                "RSI_30초과_35이하":    "⚠️" if 30 < last_rsi <= 35 else "",
                "최근7일내_RSI30이하":  rsi_below_30_in_7days,
                "PER":                  info.get("trailingPE"),
                "PER(예상)":            info.get("forwardPE"),
                "PBR":                  info.get("priceToBook"),
                "ROE":                  info.get("returnOnEquity"),
                "EPS":                  info.get("trailingEps"),
                "EPS(예상)":            info.get("forwardEps"),
            })

        except Exception as e:
            print(f"{ticker} 처리 중 오류: {e}")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(rsi_list, f, ensure_ascii=False, indent=2)
    print(f"✅ 완료! {len(rsi_list)}개 티커 저장: {output_path}")


for jf in sorted(TICKERS_DIR.glob("*.json")):
    with open(jf, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict):
        tickers = list(data.keys())
        info_map = data
    else:
        tickers, info_map = [], {}

    if not tickers:
        print(f"{jf.name}: 티커 없음, 건너뜀")
        continue

    # top100.json → data/top100.json
    output_file = OUT_DIR / jf.name
    process_tickers(tickers, output_file, info_map)
