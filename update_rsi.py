import yfinance as yf
import pandas as pd
import json
import os
from pathlib import Path

# =====================
# RSI 계산 함수
# =====================
def compute_rsi_ema(close, period=14):
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

# =====================
# 티커 리스트 → JSON 저장 함수
# =====================
def process_tickers(ticker_list, output_path, ticker_info_map=None):
    rsi_list = []

    for ticker in ticker_list:
        try:
            print(f"처리 중: {ticker}")
            data = yf.download(ticker, period='2mo', interval='1d', progress=False, auto_adjust=False)
            if data.empty or 'Close' not in data:
                print(f"{ticker}: 데이터 없음")
                continue

            close_data = data['Close']
            if isinstance(close_data, pd.DataFrame) and ticker in close_data.columns:
                close_data = close_data[ticker]

            rsi_series = compute_rsi_ema(close_data).dropna()
            if rsi_series.empty:
                continue

            last_rsi = float(rsi_series.iloc[-1])
            last_week_rsi_series = rsi_series.iloc[-7:]
            rsi_below_30_in_7days = '🕐' if (last_week_rsi_series <= 30).any() else ''

            stock = yf.Ticker(ticker)
            info = stock.info
            per = info.get("trailingPE")
            fwd_per = info.get("forwardPE")
            pbr = info.get("priceToBook")
            roe = info.get("returnOnEquity")
            eps = info.get("trailingEps")
            fwd_eps = info.get("forwardEps")

            info_extra = {}
            if ticker_info_map:
                info_extra = ticker_info_map.get(ticker, {})

            rsi_list.append({
                'Ticker': ticker,
                'Name': info_extra.get('Name', '-'),
                'Sector': info_extra.get('Sector', '-'),
                'RSI': round(last_rsi, 2),
                'RSI_30이하': '✅' if last_rsi <= 30 else '',
                'RSI_30초과_35이하': '⚠️' if 30 < last_rsi <= 35 else '',
                '최근7일내_RSI30이하': rsi_below_30_in_7days,
                'PER': per,
                'PER(예상)': fwd_per,
                'PBR': pbr,
                'ROE': roe,
                'EPS': eps,
                'EPS(예상)': fwd_eps
            })

        except Exception as e:
            print(f"{ticker} 처리 중 오류: {e}")

    # JSON 저장
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(rsi_list, f, ensure_ascii=False, indent=2)
    print(f"✅ 완료! {len(rsi_list)}개 티커 저장: {output_path}")

# =====================
# tickers_info 폴더 하위 모든 JSON 자동 처리
# =====================
BASE_DIR = Path(__file__).resolve().parent
TICKERS_DIR = BASE_DIR / "tickers_info"
OUT_DIR = BASE_DIR / "data"
OUT_DIR.mkdir(exist_ok=True)

json_files = list(TICKERS_DIR.glob("*.json"))

for jf in json_files:
    with open(jf, "r", encoding="utf-8") as f:
        data = json.load(f)

    # JSON이 딕셔너리 구조면 → key가 티커
    if isinstance(data, dict):
        tickers = list(data.keys())
        ticker_info_map = data
    else:
        tickers = []
        ticker_info_map = {}

    if not tickers:
        print(f"{jf}: 티커 리스트 비어 있음, 건너뜀")
        continue

    # 출력 파일 이름: tickers_ 제거 후 data 폴더에 저장
    output_file = OUT_DIR / (jf.stem.replace("tickers_", "") + ".json")

    process_tickers(tickers, output_file, ticker_info_map)
