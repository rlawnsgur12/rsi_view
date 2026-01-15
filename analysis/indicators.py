# ============================================================
# Valuation / Profitability Indicators
#
# 원칙:
# - 계산만 한다 (판단, 필터링 X)
# - raw dict 하나만 입력으로 받는다
# - 계산 불가능한 경우 None 반환
# ============================================================


# ------------------------------------------------------------
# PER (Price to Earnings Ratio)
#   = 현재 주가 / 주당순이익(EPS)
#
# 필요한 값 (raw):
#   - price        : 현재 주가
#   - net_income  : 순이익 (연간 기준)
#   - shares      : 발행주식수
#
# 주의:
#   - EPS <= 0 (적자) 인 경우 의미 없으므로 None 반환
# ------------------------------------------------------------
def calc_per(raw):
    if not raw.get("net_income") or not raw.get("shares"):
        return None

    eps = raw["net_income"] / raw["shares"]
    if eps <= 0:
        return None

    return raw["price"] / eps


# ------------------------------------------------------------
# PBR (Price to Book Ratio)
#   = 현재 주가 / 주당순자산(BPS)
#
# 필요한 값 (raw):
#   - price   : 현재 주가
#   - equity  : 자기자본
#   - shares  : 발행주식수
#
# 주의:
#   - BPS <= 0 (자본잠식) 인 경우 None 반환
# ------------------------------------------------------------
def calc_pbr(raw):
    if not raw.get("equity") or not raw.get("shares"):
        return None

    bps = raw["equity"] / raw["shares"]
    if bps <= 0:
        return None

    return raw["price"] / bps


# ------------------------------------------------------------
# ROE (Return on Equity)
#   = 자기자본 대비 순이익률
#
# 필요한 값 (raw):
#   - net_income : 순이익
#   - equity     : 자기자본
#
# 반환값:
#   - % 단위 (예: 15.2)
# ------------------------------------------------------------
def calc_roe(raw):
    if not raw.get("net_income") or not raw.get("equity"):
        return None

    return (raw["net_income"] / raw["equity"]) * 100


# ------------------------------------------------------------
# ROIC (Return on Invested Capital)
#   = 투자된 자본 대비 수익률
#
# 간이 계산 방식:
#   - NOPAT 대신 Net Income 사용
#   - Invested Capital = Equity + Debt - Cash
#
# 필요한 값 (raw):
#   - net_income : 순이익
#   - equity     : 자기자본
#   - debt       : 총부채
#   - cash       : 현금성 자산
#
# 주의:
#   - 전략용 근사 ROIC (정밀 회계 ROIC 아님)
# ------------------------------------------------------------
def calc_roic(raw):
    required_keys = ("net_income", "equity", "debt", "cash")
    if any(raw.get(k) is None for k in required_keys):
        return None

    invested_capital = raw["equity"] + raw["debt"] - raw["cash"]
    if invested_capital <= 0:
        return None

    return (raw["net_income"] / invested_capital) * 100
