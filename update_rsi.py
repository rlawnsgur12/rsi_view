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

def compute_rsi_ema(close, period=14):
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

rsi_list = []

for ticker in tickers:
    try:
        print(f"ticker 시작 : {ticker}")
        yf_ticker = ticker.replace("-", ".")
        data = yf.download(yf_ticker, period='2mo', interval='1d', progress=False, auto_adjust=False)

        if data.empty or 'Close' not in data:
            print(f"{ticker}: 데이터 없음")
            continue

        close_data = data['Close']

        # Close가 DataFrame일 경우 컬럼에서 티커 데이터만 추출
        if isinstance(close_data, pd.DataFrame):
            if yf_ticker in close_data.columns:
                close_data = close_data[yf_ticker]
            else:
                print(f"{ticker}: Close 데이터가 DataFrame이나 컬럼이 없음")
                continue

        rsi_series = compute_rsi_ema(close_data).dropna()
        if rsi_series.empty:
            print(f"{ticker}: RSI 계산 불가 (데이터 부족)")
            continue

        last_rsi = rsi_series.iloc[-1]
        if isinstance(last_rsi, pd.Series):
            last_rsi = last_rsi.iloc[0]
        last_rsi = float(last_rsi)

        last_week_rsi_series = rsi_series.iloc[-7:]
        rsi_below_30_in_7days = '🕐' if (last_week_rsi_series <= 30).any() else ''

        rsi_list.append({
            'Ticker': ticker,
            'RSI': round(last_rsi, 2),
            'RSI_30이하': '✅' if last_rsi <= 30 else '',
            'RSI_30초과_35이하': '⚠️' if 30 < last_rsi <= 35 else '',
            '최근7일내_RSI30이하': rsi_below_30_in_7days
        })

    except Exception as e:
        print(f"{ticker} 처리 중 오류: {e}")


# ✅ data 폴더 없으면 생성
os.makedirs("data", exist_ok=True)

# ✅ JSON 저장
with open("data/rsi_data.json", "w", encoding="utf-8") as f:
    json.dump(rsi_list, f, ensure_ascii=False, indent=2)

print(f"✅ 완료! {len(rsi_list)}개 티커 RSI 저장 완료.")
