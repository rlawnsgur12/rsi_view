import yfinance as yf
import pandas as pd
import json
import os
from datetime import datetime, timedelta

# ✅ RSI 계산 함수
def compute_rsi(data, window=14):
    delta = data['Close'].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(window=window, min_periods=1).mean()
    avg_loss = loss.rolling(window=window, min_periods=1).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


# ✅ 확인할 티커 리스트 (원하면 수정 가능)
tickers = ["AAPL", "MSFT", "GOOGL", "NVDA", "TSLA", "PLTR", "IONQ"]

results = []

for ticker in tickers:
    print(f"📥 {ticker} 다운로드 중...")

    try:
        df = yf.download(ticker, period="3mo", interval="1d", progress=False)

        if df.empty:
            print(f"⚠️ {ticker}: 데이터 없음")
            continue

        df['RSI'] = compute_rsi(df)
        last_rsi = float(df['RSI'].iloc[-1])  # ✅ float으로 변환 (JSON 직렬화 오류 방지)

        results.append({
            "Ticker": ticker,
            "RSI": round(last_rsi, 2),
            "Date": df.index[-1].strftime("%Y-%m-%d"),
            "Price": round(float(df['Close'].iloc[-1]), 2)
        })

    except Exception as e:
        print(f"❌ {ticker} 처리 중 오류: {e}")


# ✅ data 폴더 없으면 생성
os.makedirs("data", exist_ok=True)

# ✅ JSON 저장
with open("data/rsi_data.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"✅ 완료! {len(results)}개 티커 RSI 저장 완료.")
