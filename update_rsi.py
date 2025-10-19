import yfinance as yf
import pandas as pd
import json
from datetime import datetime

tickers = [
    "AAPL", "MSFT", "GOOGL", "NVDA", "TSLA", "PLTR", "IONQ"
]

def compute_rsi_ema(close, period=14):
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

results = []

for ticker in tickers:
    try:
        print(f"📥 {ticker} 다운로드 중...")
        data = yf.download(ticker, period='2mo', interval='1d', progress=False)

        if data.empty or 'Close' not in data:
            continue

        rsi_series = compute_rsi_ema(data['Close']).dropna()
        if rsi_series.empty:
            continue

        last_rsi = float(rsi_series.iloc[-1])
        rsi_flag = "✅" if last_rsi <= 30 else ("⚠️" if last_rsi <= 35 else "")
        rsi_below_30_recently = (rsi_series.iloc[-7:] <= 30).any()

        results.append({
            "ticker": ticker,
            "rsi": round(last_rsi, 2),
            "rsi_flag": rsi_flag,
            "rsi_below_30_recently": rsi_below_30_recently,
            "date": datetime.now().strftime('%Y-%m-%d')
        })

    except Exception as e:
        print(f"{ticker} 오류: {e}")

with open("data/rsi_data.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("✅ rsi_data.json 생성 완료")
