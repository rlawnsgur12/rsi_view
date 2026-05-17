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

BACKTEST_FILE = OUT_DIR / "backtest.json"


def load_backtest():
    if not BACKTEST_FILE.exists():
        return {}
    with open(BACKTEST_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return {d["Ticker"]: d for d in raw} if isinstance(raw, list) else raw


def process_tickers(ticker_list, output_path, ticker_info_map=None):
    bt_map = load_backtest()
    rsi_list = []

    for ticker in ticker_list:
        try:
            print(f"처리 중: {ticker}")

            # 2년 일봉 — RSI 시리즈 + 주봉 리샘플 모두 커버
            data = yf.download(ticker, period="2y", interval="1d", progress=False, auto_adjust=False)
            if data.empty or "Close" not in data:
                print(f"{ticker}: 데이터 없음")
                continue

            close_data = data["Close"]
            vol_series  = data["Volume"]
            if isinstance(close_data, pd.DataFrame) and ticker in close_data.columns:
                close_data = close_data[ticker]
                vol_series  = vol_series[ticker]

            # --- 일 RSI ---
            rsi_series = compute_rsi_ema(close_data).dropna()
            if rsi_series.empty:
                continue

            last_rsi = float(rsi_series.iloc[-1])
            rsi_below_30_in_7days = "🕐" if (rsi_series.iloc[-7:] <= 30).any() else ""
            rsi_series_30 = [round(float(v), 2) for v in rsi_series.iloc[-30:]]

            # --- 주 RSI (일봉 리샘플) ---
            weekly_close = close_data.resample("W").last().dropna()
            wrsi = compute_rsi_ema(weekly_close).dropna()
            last_weekly_rsi = round(float(wrsi.iloc[-1]), 2) if not wrsi.empty else None
            weekly_rsi_series = [round(float(v), 2) for v in wrsi.iloc[-30:]]

            # --- 가격 / 일변동 ---
            curr_price = round(float(close_data.iloc[-1]), 2)
            prev_price = float(close_data.iloc[-2]) if len(close_data) >= 2 else None
            day_change_pct = round((curr_price - prev_price) / prev_price * 100, 2) if prev_price else None

            # --- 거래량 비율 (20일 평균 대비) ---
            avg_vol = float(vol_series.iloc[-21:-1].mean()) if len(vol_series) >= 21 else None
            curr_vol = float(vol_series.iloc[-1])
            vol_ratio = round(curr_vol / avg_vol, 2) if avg_vol and avg_vol > 0 else None

            # --- 쌍과매도 ---
            dual = "🎯" if last_rsi <= 35 and last_weekly_rsi is not None and last_weekly_rsi <= 35 else ""

            # --- yfinance info (PER, 52주, EPS growth 등) ---
            info = yf.Ticker(ticker).info

            high52 = info.get("fiftyTwoWeekHigh")
            low52  = info.get("fiftyTwoWeekLow")
            pos52w = None
            if high52 and low52 and (high52 - low52) > 0:
                pos52w = round((curr_price - low52) / (high52 - low52) * 100, 1)

            eps_raw = info.get("earningsGrowth") or info.get("earningsQuarterlyGrowth")
            eps_growth = round(eps_raw * 100, 2) if eps_raw is not None else None

            rev_raw = info.get("revenueGrowth")
            revenue_yoy = round(rev_raw * 100, 2) if rev_raw is not None else None

            # --- 백테스트 ---
            bt = bt_map.get(ticker, {})

            extra = (ticker_info_map or {}).get(ticker, {})

            rsi_list.append({
                "Ticker":              ticker,
                "Name":                extra.get("Name", "-"),
                "Sector":              extra.get("Sector", "-"),
                "RSI":                 round(last_rsi, 2),
                "RSI_Series":          rsi_series_30,
                "WeeklyRSI":           last_weekly_rsi,
                "WeeklyRSI_Series":    weekly_rsi_series,
                "DualOversold":        dual,
                "RSI_30이하":          "✅" if last_rsi <= 30 else "",
                "RSI_30초과_35이하":   "⚠️" if 30 < last_rsi <= 35 else "",
                "최근7일내_RSI30이하": rsi_below_30_in_7days,
                "Price":               curr_price,
                "DayChangePct":        day_change_pct,
                "Pos52w":              pos52w,
                "VolRatio":            vol_ratio,
                "EPS_Growth":          eps_growth,
                "Revenue_YoY":         revenue_yoy,
                "BT_1M_Avg":           bt.get("ret_1m_avg"),
                "BT_1M_Win":           bt.get("ret_1m_winrate"),
                "BT_3M_Avg":           bt.get("ret_3m_avg"),
                "BT_3M_Win":           bt.get("ret_3m_winrate"),
                "BT_Events":           bt.get("events"),
                "PER":                 info.get("trailingPE"),
                "PER(예상)":           info.get("forwardPE"),
                "PBR":                 info.get("priceToBook"),
                "ROE":                 info.get("returnOnEquity"),
                "EPS":                 info.get("trailingEps"),
                "EPS(예상)":           info.get("forwardEps"),
            })

        except Exception as e:
            print(f"{ticker} 처리 중 오류: {e}")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(rsi_list, f, ensure_ascii=False, indent=2)
    print(f"✅ 완료! {len(rsi_list)}개 티커 저장: {output_path}")


MARKET_TICKERS = [
    {"Ticker": "SPY", "Label": "S&P 500"},
    {"Ticker": "QQQ", "Label": "NASDAQ"},
    {"Ticker": "DIA", "Label": "DOW"},
    {"Ticker": "IWM", "Label": "Russell 2000"},
]

def generate_market():
    result = []
    for item in MARKET_TICKERS:
        ticker = item["Ticker"]
        try:
            data = yf.download(ticker, period="2y", interval="1d", progress=False, auto_adjust=False)
            if data.empty:
                continue
            close = data["Close"]
            if isinstance(close, pd.DataFrame) and ticker in close.columns:
                close = close[ticker]

            rsi_series = compute_rsi_ema(close).dropna()
            weekly_close = close.resample("W").last().dropna()
            wrsi = compute_rsi_ema(weekly_close).dropna()

            curr = round(float(close.iloc[-1]), 2)
            prev = float(close.iloc[-2]) if len(close) >= 2 else None
            change = round((curr - prev) / prev * 100, 2) if prev else None

            result.append({
                "Ticker":      ticker,
                "Label":       item["Label"],
                "Price":       curr,
                "DayChangePct": change,
                "RSI":         round(float(rsi_series.iloc[-1]), 2) if not rsi_series.empty else None,
                "WeeklyRSI":   round(float(wrsi.iloc[-1]), 2) if not wrsi.empty else None,
            })
            print(f"✅ 시장 지표: {ticker}")
        except Exception as e:
            print(f"{ticker} 시장 지표 오류: {e}")

    market_path = OUT_DIR / "market.json"
    with open(market_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"✅ market.json 저장 완료")


generate_market()

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

    output_file = OUT_DIR / jf.name
    process_tickers(tickers, output_file, info_map)
