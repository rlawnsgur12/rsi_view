import yfinance as yf

def get_per(ticker_symbol: str):
    """
    주식 티커(symbol)를 받아서 PER(Trailing PE)를 반환
    """
    ticker = yf.Ticker(ticker_symbol)
    info = ticker.info

    per = info.get("trailingPE")  # 최근 기준 PER
    forward_per = info.get("forwardPE")  # 예상 PER (있는 경우)

    return per, forward_per


if __name__ == "__main__":
    ticker = "AAPL"  # 예: 애플
    per, forward_per = get_per(ticker)

    print(f"📊 {ticker} PER 정보")
    print(f"Trailing PER : {per}")
    print(f"Forward PER  : {forward_per}")
