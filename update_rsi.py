import yfinance as yf
import pandas as pd
import json
import os

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
def process_tickers(ticker_list, output_path):
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

            rsi_list.append({
                'Ticker': ticker,
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
# 티커 파일 읽어서 처리
# =====================
ticker_files = {
    "data/rsi_data.json": "tickers_info/tickers_rsi_data.json",
    "data/top_101_200.json": "tickers_info/tickers_top_101_200.json",
    "data/custom.json": "tickers_info/tickers_custom.json"
}

for output_file, input_file in ticker_files.items():
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        tickers = data.get("tickers", [])  # ✅ 여기 수정
    if not tickers:
        print(f"{input_file}: 티커 리스트 비어 있음, 건너뜀")
        continue
    process_tickers(tickers, output_file)