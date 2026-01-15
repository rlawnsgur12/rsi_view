import yfinance as yf
import pandas as pd
import json
import os
from datetime import datetime, timedelta
# 밸류 지표 계산 함수들
from analysis.indicators import (
    calc_per,
    calc_pbr,
    calc_roe,
    calc_roic
)

# =====================================================
# 🔹 안전한 재무 데이터 접근 함수 (여기에!)
# =====================================================
def safe_get(df, key):
    """
    DataFrame에서 특정 재무 항목을 안전하게 가져온다.
    없으면 None 반환
    """
    if df is None or df.empty:
        return None
    if key not in df.index:
        return None
    return df.loc[key].iloc[0]


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
tickers = [
    'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NVDA', 'TSLA', 'BRK-B', 'JPM', 'JNJ',
    'V', 'PG', 'UNH', 'MA', 'HD', 'BAC', 'DIS', 'PYPL', 'ADBE', 'NFLX',
    'INTC', 'CMCSA', 'XOM', 'VZ', 'T', 'KO', 'PFE', 'CSCO', 'PEP', 'ABBV',
    'ABT', 'CRM', 'CVX', 'WMT', 'MCD', 'NKE', 'DHR', 'TXN', 'LLY', 'MDT',
    'NEE', 'BMY', 'COST', 'LIN', 'QCOM', 'PM', 'AMGN', 'UPS', 'IBM', 'UNP',
    'RTX', 'HON', 'LOW', 'INTU', 'SBUX', 'GS', 'BLK', 'CAT', 'ISRG', 'CVS',
    'ADP', 'FIS', 'SCHW', 'GILD', 'DE', 'ZTS', 'SPGI', 'TMUS', 'CB', 'BDX',
    'LMT', 'SYK', 'PLD', 'MO', 'CCI', 'NOW', 'VRTX', 'CI', 'DUK', 'EL',
    'SO', 'TGT', 'ICE', 'GM', 'MET', 'APD', 'F', 'EW', 'CSX', 'GD',
    'AON', 'ECL', 'NSC', 'MCO', 'CL', 'ITW', 'SHW', 'PNC', 'D', 'AEP'
]

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

        # =====================================================
        # 🔹 여기부터 재무 데이터 + 지표 계산 추가
        # =====================================================
        stock = yf.Ticker(yf_ticker)

        info = stock.info
        financials = stock.financials
        balance_sheet = stock.balance_sheet

        print(info)

        raw = {
            # price / shares
            "price": info.get("currentPrice"),
            "shares": info.get("sharesOutstanding"),

            # income statement
            "net_income": safe_get(financials, "Net Income"),
            "operating_income": safe_get(financials, "Operating Income"),

            # balance sheet
            "equity": safe_get(balance_sheet, "Total Stockholder Equity"),
            "total_assets": safe_get(balance_sheet, "Total Assets"),
            "current_liabilities": safe_get(balance_sheet, "Total Current Liabilities"),
        }

        per = calc_per(raw)
        pbr = calc_pbr(raw)
        roe = calc_roe(raw)
        roic = calc_roic(raw)

        # per = calc_per({
        #     "price": info.get("currentPrice"),
        #     "net_income": financials.loc["Net Income"].iloc[0]
        #         if "Net Income" in financials.index else None,
        #     "shares": info.get("sharesOutstanding"),
        # })

        # pbr = calc_pbr(
        #     price=info.get("currentPrice"),
        #     equity=balance_sheet.loc["Total Stockholder Equity"].iloc[0]
        #         if "Total Stockholder Equity" in balance_sheet.index else None,
        #     shares=info.get("sharesOutstanding"),
        # )

        # roe = calc_roe(
        #     net_income=financials.loc["Net Income"].iloc[0]
        #         if "Net Income" in financials.index else None,
        #     equity=balance_sheet.loc["Total Stockholder Equity"].iloc[0]
        #         if "Total Stockholder Equity" in balance_sheet.index else None,
        # )

        # roic = calc_roic(
        #     operating_income=financials.loc["Operating Income"].iloc[0]
        #         if "Operating Income" in financials.index else None,
        #     total_assets=balance_sheet.loc["Total Assets"].iloc[0]
        #         if "Total Assets" in balance_sheet.index else None,
        #     current_liabilities=balance_sheet.loc["Total Current Liabilities"].iloc[0]
        #         if "Total Current Liabilities" in balance_sheet.index else None,
        # )

        # =====================================================
        # 🔹 여기서 최종 append
        # =====================================================
        rsi_list.append({
            'Ticker': ticker,
            'RSI': round(last_rsi, 2),
            'RSI_30이하': '✅' if last_rsi <= 30 else '',
            'RSI_30초과_35이하': '⚠️' if 30 < last_rsi <= 35 else '',
            '최근7일내_RSI30이하': rsi_below_30_in_7days,

            # 📊 밸류 지표
            'PER': per,
            'PBR': pbr,
            'ROE': roe,
            'ROIC': roic,
        })

        print(rsi_list)

    except Exception as e:
        print(f"{ticker} 처리 중 오류: {e}")


# ✅ data 폴더 없으면 생성
os.makedirs("data", exist_ok=True)

# ✅ JSON 저장
with open("data/rsi_data.json", "w", encoding="utf-8") as f:
    json.dump(rsi_list, f, ensure_ascii=False, indent=2)

print(f"✅ 완료! {len(rsi_list)}개 티커 RSI 저장 완료.")
