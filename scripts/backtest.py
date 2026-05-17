"""
RSI 백테스트 스크립트

각 종목의 5년치 일봉 데이터로 RSI≤30 진입 시점을 찾고,
해당 시점부터 1M/3M/6M 후 수익률을 계산하여 평균 수익률·승률·MDD를 저장.

매수 시점 정의:
- 전일 RSI > 30 AND 당일 RSI ≤ 30
- 즉, RSI가 30선을 처음 하향 돌파한 날의 종가에 매수했다고 가정
  (사용자 실전 매수 시점 — "30 진입 후 양봉 돌파" — 보다 보수적이므로
   실제 운용에서는 본 통계보다 더 좋은 결과를 기대할 수 있음)

실행: python scripts/backtest.py
출력: data/backtest.json

스케줄: 매일 돌릴 필요 없음. 주 1회 또는 신규 종목 추가 시 수동 실행.
"""

import yfinance as yf
import pandas as pd
import json
from pathlib import Path
from utils import compute_rsi_ema

BASE_DIR = Path(__file__).resolve().parent.parent
TICKERS_DIR = BASE_DIR / "tickers_info"
OUT_DIR = BASE_DIR / "data"
OUT_DIR.mkdir(exist_ok=True)

HOLD_1M = 21
HOLD_3M = 63
HOLD_6M = 126
LOOKBACK = "5y"


def backtest_ticker(ticker):
    """단일 종목 백테스트. 결과 dict 반환."""
    result = {
        "events": 0,
        "ret_1m_avg": None, "ret_1m_winrate": None, "ret_1m_min": None,
        "ret_3m_avg": None, "ret_3m_winrate": None, "ret_3m_min": None,
        "ret_6m_avg": None, "ret_6m_winrate": None, "ret_6m_min": None,
    }
    try:
        data = yf.download(ticker, period=LOOKBACK, interval='1d', progress=False, auto_adjust=False)
        if data.empty or 'Close' not in data:
            return result
        close = data['Close']
        if isinstance(close, pd.DataFrame) and ticker in close.columns:
            close = close[ticker]

        rsi = compute_rsi_ema(close).dropna()
        close = close.loc[rsi.index]

        # 진입 시점: 전일 RSI > 30 AND 당일 RSI ≤ 30
        prev_rsi = rsi.shift(1)
        entries = (prev_rsi > 30) & (rsi <= 30)
        entry_indices = [i for i, flag in enumerate(entries.values) if flag]

        if not entry_indices:
            return result

        rets_1m, rets_3m, rets_6m = [], [], []

        for idx in entry_indices:
            entry_price = float(close.iloc[idx])
            if entry_price <= 0:
                continue

            # 1M
            if idx + HOLD_1M < len(close):
                exit_price = float(close.iloc[idx + HOLD_1M])
                rets_1m.append((exit_price - entry_price) / entry_price * 100)
            # 3M
            if idx + HOLD_3M < len(close):
                exit_price = float(close.iloc[idx + HOLD_3M])
                rets_3m.append((exit_price - entry_price) / entry_price * 100)
            # 6M
            if idx + HOLD_6M < len(close):
                exit_price = float(close.iloc[idx + HOLD_6M])
                rets_6m.append((exit_price - entry_price) / entry_price * 100)

        result["events"] = len(entry_indices)

        def stats(rets):
            if not rets:
                return None, None, None
            avg = round(sum(rets) / len(rets), 2)
            winrate = round(sum(1 for r in rets if r > 0) / len(rets) * 100, 1)
            mn = round(min(rets), 2)
            return avg, winrate, mn

        a, w, m = stats(rets_1m)
        result["ret_1m_avg"], result["ret_1m_winrate"], result["ret_1m_min"] = a, w, m

        a, w, m = stats(rets_3m)
        result["ret_3m_avg"], result["ret_3m_winrate"], result["ret_3m_min"] = a, w, m

        a, w, m = stats(rets_6m)
        result["ret_6m_avg"], result["ret_6m_winrate"], result["ret_6m_min"] = a, w, m

    except Exception as e:
        print(f"{ticker} 백테스트 오류: {e}")

    return result


def collect_all_tickers():
    """tickers_info/ 폴더 하위 모든 JSON에서 티커 수집."""
    tickers = set()
    for jf in TICKERS_DIR.glob("*.json"):
        try:
            with open(jf, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                tickers.update(data.keys())
            elif isinstance(data, list):
                tickers.update(data)
        except Exception as e:
            print(f"{jf} 읽기 오류: {e}")
    return sorted(tickers)


def main():
    tickers = collect_all_tickers()
    print(f"총 {len(tickers)}개 종목 백테스트 시작...")

    results = {}
    for i, ticker in enumerate(tickers, 1):
        print(f"[{i}/{len(tickers)}] {ticker}")
        results[ticker] = backtest_ticker(ticker)

    out_path = OUT_DIR / "backtest.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n✅ 백테스트 완료. {out_path}")

    # 요약 출력
    total_events = sum(r["events"] for r in results.values())
    print(f"총 진입 사건 수: {total_events}")


if __name__ == "__main__":
    main()
