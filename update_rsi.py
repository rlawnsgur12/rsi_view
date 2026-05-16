import yfinance as yf
import pandas as pd
import json
import os
from pathlib import Path

# =====================
# RSI 계산 함수 (Wilder EMA)
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
# 시세/지표 추출 (가격, 일변동, 52주 위치, 거래량 비율)
# =====================
def extract_price_metrics(close_data, volume_data):
    metrics = {
        "Price": None,
        "DayChangePct": None,
        "Pos52w": None,
        "VolRatio": None,
    }
    if close_data is None or close_data.empty:
        return metrics

    last_close = float(close_data.iloc[-1])
    metrics["Price"] = round(last_close, 2)

    if len(close_data) >= 2:
        prev_close = float(close_data.iloc[-2])
        if prev_close:
            metrics["DayChangePct"] = round((last_close - prev_close) / prev_close * 100, 2)

    # 52주 위치: (현재가 - 저가) / (고가 - 저가) * 100
    window = close_data.tail(252)
    if len(window) >= 20:
        hi = float(window.max())
        lo = float(window.min())
        if hi > lo:
            metrics["Pos52w"] = round((last_close - lo) / (hi - lo) * 100, 1)

    # 거래량 비율: 최근 거래량 / 20일 평균
    if volume_data is not None and not volume_data.empty and len(volume_data) >= 20:
        last_vol = float(volume_data.iloc[-1])
        avg_vol = float(volume_data.tail(20).mean())
        if avg_vol > 0:
            metrics["VolRatio"] = round(last_vol / avg_vol, 2)

    return metrics


# =====================
# 티커 리스트 → JSON 저장 함수
# =====================
def process_tickers(ticker_list, output_path, ticker_info_map=None):
    rsi_list = []

    for ticker in ticker_list:
        try:
            print(f"처리 중: {ticker}")
            # 52주 지표 위해 1년치 다운로드
            data = yf.download(ticker, period='1y', interval='1d', progress=False, auto_adjust=False)
            if data.empty or 'Close' not in data:
                print(f"{ticker}: 데이터 없음")
                continue

            close_data = data['Close']
            if isinstance(close_data, pd.DataFrame) and ticker in close_data.columns:
                close_data = close_data[ticker]

            volume_data = data['Volume'] if 'Volume' in data else None
            if isinstance(volume_data, pd.DataFrame) and ticker in volume_data.columns:
                volume_data = volume_data[ticker]

            rsi_series = compute_rsi_ema(close_data).dropna()
            if rsi_series.empty:
                continue

            last_rsi = float(rsi_series.iloc[-1])
            last_week_rsi_series = rsi_series.iloc[-7:]
            rsi_below_30_in_7days = '🕐' if (last_week_rsi_series <= 30).any() else ''

            price_metrics = extract_price_metrics(close_data, volume_data)

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
                'Price': price_metrics["Price"],
                'DayChangePct': price_metrics["DayChangePct"],
                'Pos52w': price_metrics["Pos52w"],
                'VolRatio': price_metrics["VolRatio"],
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
# 시장 벤치마크 RSI (SPY, QQQ, DIA, IWM)
# =====================
def build_market_snapshot(out_path):
    benchmarks = {
        "SPY": "S&P 500",
        "QQQ": "Nasdaq 100",
        "DIA": "Dow Jones",
        "IWM": "Russell 2000",
    }
    snapshot = []
    for sym, label in benchmarks.items():
        try:
            data = yf.download(sym, period='3mo', interval='1d', progress=False, auto_adjust=False)
            if data.empty or 'Close' not in data:
                continue
            close_data = data['Close']
            if isinstance(close_data, pd.DataFrame) and sym in close_data.columns:
                close_data = close_data[sym]
            rsi_series = compute_rsi_ema(close_data).dropna()
            if rsi_series.empty:
                continue
            last_close = float(close_data.iloc[-1])
            day_chg = None
            if len(close_data) >= 2:
                prev = float(close_data.iloc[-2])
                if prev:
                    day_chg = round((last_close - prev) / prev * 100, 2)
            snapshot.append({
                "Ticker": sym,
                "Label": label,
                "RSI": round(float(rsi_series.iloc[-1]), 2),
                "Price": round(last_close, 2),
                "DayChangePct": day_chg,
            })
        except Exception as e:
            print(f"{sym} 시장 데이터 오류: {e}")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)
    print(f"✅ 시장 스냅샷 저장: {out_path}")


# =====================
# tickers_info 폴더 하위 모든 JSON 자동 처리
# =====================
BASE_DIR = Path(__file__).resolve().parent
TICKERS_DIR = BASE_DIR / "tickers_info"
OUT_DIR = BASE_DIR / "data"
OUT_DIR.mkdir(exist_ok=True)

# 시장 벤치마크 먼저 생성
build_market_snapshot(OUT_DIR / "market.json")

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
