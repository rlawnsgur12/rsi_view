import yfinance as yf
import pandas as pd
from pathlib import Path
from common import load_tickers
import json

# =========================
# 출력 디렉토리
# =========================
OUT = Path("../stocks")
OUT.mkdir(exist_ok=True)

# =========================
# 안전한 Row 추출
# =========================
def safe_row(df, names):
    for n in names:
        if n in df.index:
            return df.loc[n]
    return None

# =========================
# 금액 포맷 (억 단위)
# =========================
def fmt_money(val):
    if pd.isna(val):
        return ""
    return f"{val / 1e8:,.1f}억"

# =========================
# 퍼센트 포맷
# =========================
def fmt_pct(val):
    if pd.isna(val):
        return ""
    return f"{val:.0f}%"

# =========================
# 메인 루프
# =========================
for ticker in load_tickers():
    t = yf.Ticker(ticker)

    q = t.quarterly_income_stmt
    y = t.income_stmt
    cf = t.cashflow

    # =====================================================
    # 📊 최근 2개년 분기 재무 (YoY)
    # =====================================================
    df_q = pd.DataFrame({
        "매출액": safe_row(q, ["Total Revenue"]),
        "순이익": safe_row(q, [
            "Net Income From Continuing Operation Net Minority Interest",
            "Net Income"
        ]),
        "영업이익": safe_row(q, ["Operating Income"])
    }).head(8)

    # 🔑 반드시 시간순 정렬 (YoY 핵심)
    df_q = df_q.sort_index()

    df_q["매출 성장률 (QoQ)"] = df_q["매출액"].pct_change(
        periods=1, fill_method=None
    ) * 100

    df_q["순이익 성장률 (QoQ)"] = df_q["순이익"].pct_change(
        periods=1, fill_method=None
    ) * 100

    df_q["영업이익률 (%)"] = (
        df_q["영업이익"] / df_q["매출액"] * 100
    )

    # 다시 최신 분기부터
    df_q = df_q.sort_index(ascending=False)

    # 포맷 적용
    df_q_fmt = df_q.copy()
    for col in ["매출액", "순이익", "영업이익"]:
        df_q_fmt[col] = df_q_fmt[col].map(fmt_money)

    for col in ["매출 성장률 (QoQ)", "순이익 성장률 (QoQ)", "영업이익률 (%)"]:
        df_q_fmt[col] = df_q_fmt[col].map(fmt_pct)

    # =====================================================
    # 📈 최근 5개년 연간 재무
    # =====================================================
    df_y = pd.DataFrame({
        "매출액": safe_row(y, ["Total Revenue"]),
        "순이익": safe_row(y, [
            "Net Income From Continuing Operation Net Minority Interest",
            "Net Income"
        ]),
        "영업이익": safe_row(y, ["Operating Income"]),
        "잉여현금흐름": cf.loc["Free Cash Flow"]
    }).head(5)

    # 시간순 정렬
    df_y = df_y.sort_index()

    df_y["매출 성장률 (YoY)"] = (
        df_y["매출액"].pct_change(fill_method=None) * 100
    )
    df_y["순이익 성장률 (YoY)"] = (
        df_y["순이익"].pct_change(fill_method=None) * 100
    )
    df_y["영업이익률 (%)"] = (
        df_y["영업이익"] / df_y["매출액"] * 100
    )
    df_y["FCF 마진 (%)"] = (
        df_y["잉여현금흐름"] / df_y["매출액"] * 100
    )

    df_y = df_y.sort_index(ascending=False)

    # =========================
    # 📦 차트용 JSON 데이터
    # =========================
    chart_data = {
        "years": df_y.index.astype(str).tolist(),
        "revenue": df_y["매출액"].round(0).tolist(),
        "net_income": df_y["순이익"].round(0).tolist(),
        "operating_income": df_y["영업이익"].round(0).tolist(),
        "fcf": df_y["잉여현금흐름"].round(0).tolist(),
        "op_margin": (
            df_y["영업이익"] / df_y["매출액"] * 100
        ).round(1).tolist()
    }


    # 포맷 적용
    df_y_fmt = df_y.copy()
    for col in ["매출액", "순이익", "영업이익", "잉여현금흐름"]:
        df_y_fmt[col] = df_y_fmt[col].map(fmt_money)

    for col in [
        "매출 성장률 (YoY)",
        "순이익 성장률 (YoY)",
        "영업이익률 (%)",
        "FCF 마진 (%)"
    ]:
        df_y_fmt[col] = df_y_fmt[col].map(fmt_pct)

    chart_json_path = OUT / f"{ticker}_chart.json"
    with open(chart_json_path, "w", encoding="utf-8") as jf:
        json.dump(chart_data, jf, ensure_ascii=False)


    # =====================================================
    # 🧾 HTML 생성
    # =====================================================
    html = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <title>{ticker} 재무 요약</title>

        <!-- Plotly -->
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>

        <style>
            body {{ font-family: Arial; padding: 20px; }}
            h1 {{ margin-bottom: 10px; }}
            h2 {{ margin-top: 40px; }}
            table {{ border-collapse: collapse; width: 100%; }}
            th, td {{ border: 1px solid #ddd; padding: 8px; text-align: right; }}
            th {{ background: #f5f5f5; }}
            td:first-child, th:first-child {{ text-align: left; }}
        </style>
    </head>
    <body>

    <h1>{ticker} 재무 요약</h1>

    <h2>📊 최근 2개년 분기 재무 (전년동기 대비)</h2>
    {df_q_fmt.to_html()}

    <h2>📈 최근 5개년 연간 재무</h2>
    {df_y_fmt.to_html()}

    <h2>📊 재무 차트</h2>

    <div id="chart-revenue" style="height:400px;"></div>
    <div id="chart-income" style="height:400px;"></div>
    <div id="chart-margin" style="height:400px;"></div>
    <div id="chart-fcf" style="height:400px;"></div>

    <script>
    fetch("{ticker}_chart.json")
    .then(r => r.json())
    .then(d => {

        Plotly.newPlot("chart-revenue", [{
        x: d.years,
        y: d.revenue,
        type: "bar",
        name: "매출액"
        }], { title: "매출 추이" });

        Plotly.newPlot("chart-income", [
        {
            x: d.years,
            y: d.net_income,
            type: "line",
            name: "순이익"
        },
        {
            x: d.years,
            y: d.operating_income,
            type: "line",
            name: "영업이익"
        }
        ], { title: "순이익 vs 영업이익" });

        Plotly.newPlot("chart-margin", [{
        x: d.years,
        y: d.op_margin,
        type: "line",
        name: "영업이익률"
        }], {
        title: "영업이익률 (%)",
        yaxis: { ticksuffix: "%" }
        });

        Plotly.newPlot("chart-fcf", [{
        x: d.years,
        y: d.fcf,
        type: "bar",
        name: "잉여현금흐름"
        }], { title: "Free Cash Flow" });

    });
    </script>


    </body>
    </html>
    """

    with open(OUT / f"{ticker}.html", "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅ {ticker} 완료")
