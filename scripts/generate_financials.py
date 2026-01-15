import yfinance as yf
import pandas as pd
from pathlib import Path
from common import load_tickers
import json
import math


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
    # 📊 최근 2개년 분기 재무 (QoQ)
    # =====================================================
    df_q = pd.DataFrame({
        "매출액": safe_row(q, ["Total Revenue"]),
        "순이익": safe_row(q, [
            "Net Income From Continuing Operation Net Minority Interest",
            "Net Income"
        ]),
        "영업이익": safe_row(q, ["Operating Income"])
    }).head(8)

    df_q = df_q.sort_index()

    # df_q["매출 성장률 (QoQ)"] = df_q["매출액"].pct_change() * 100
    # df_q["순이익 성장률 (QoQ)"] = df_q["순이익"].pct_change() * 100
    df_q["매출 성장률 (QoQ)"] = df_q["매출액"].pct_change(fill_method=None) * 100
    df_q["순이익 성장률 (QoQ)"] = df_q["순이익"].pct_change(fill_method=None) * 100
    df_q["영업이익률 (%)"] = df_q["영업이익"] / df_q["매출액"] * 100

    df_q = df_q.sort_index(ascending=False)

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

    df_y = df_y.sort_index()

    # df_y["매출 성장률 (YoY)"] = df_y["매출액"].pct_change() * 100
    # df_y["순이익 성장률 (YoY)"] = df_y["순이익"].pct_change() * 100
    df_y["매출 성장률 (YoY)"] = df_y["매출액"].pct_change(fill_method=None) * 100
    df_y["순이익 성장률 (YoY)"] = df_y["순이익"].pct_change(fill_method=None) * 100
    df_y["영업이익률 (%)"] = df_y["영업이익"] / df_y["매출액"] * 100
    df_y["FCF 마진 (%)"] = df_y["잉여현금흐름"] / df_y["매출액"] * 100

    #아래 df_chart에서 소팅
    df_y = df_y.sort_index(ascending=False)

    # =========================
    # 🔧 숫자형 강제 변환 (차트용)
    # =========================
    for col in ["매출액", "순이익", "영업이익", "잉여현금흐름"]:
        df_y[col] = pd.to_numeric(df_y[col], errors="coerce")

    # =========================
    # 📦 차트용 데이터 (NaN 제거)
    # =========================
    df_chart = (
        df_y
        .sort_index(ascending=True)   # ⭐ 추가
        .loc[
            df_y["매출액"].notna() &
            df_y["순이익"].notna() &
            df_y["영업이익"].notna()
        ]
    )

    # 화살표 표시용
    revenue_yoy = [
        None if (v is None or (isinstance(v, float) and math.isnan(v))) else v
        for v in (
            df_chart["매출액"]
            .pct_change(fill_method=None)
            .mul(100)
            .round(1)
            .tolist()
        )
    ]

    # =========================
    # 📦 차트용 JSON (⚠ df_chart 사용)
    # =========================
    chart_data = {
        "years": df_chart.index.astype(str).tolist(),
        "revenue": df_chart["매출액"].round(0).tolist(),
        "revenue_yoy": revenue_yoy,   # ⭐ 화살표 표시용 추가
        "net_income": df_chart["순이익"].round(0).tolist(),
        "operating_income": df_chart["영업이익"].round(0).tolist(),
        "fcf": df_chart["잉여현금흐름"].round(0).tolist(),
        "op_margin": (
            df_chart["영업이익"] / df_chart["매출액"] * 100
        ).round(1).tolist()
    }


    with open(OUT / f"{ticker}_chart.json", "w", encoding="utf-8") as jf:
        json.dump(chart_data, jf, ensure_ascii=False)

    # 포맷
    df_y_fmt = df_y.copy()
    for col in ["매출액", "순이익", "영업이익", "잉여현금흐름"]:
        df_y_fmt[col] = df_y_fmt[col].map(fmt_money)

    for col in ["매출 성장률 (YoY)", "순이익 성장률 (YoY)", "영업이익률 (%)", "FCF 마진 (%)"]:
        df_y_fmt[col] = df_y_fmt[col].map(fmt_pct)

    # =====================================================
    # 🧾 HTML (⚠ f-string 아님)
    # =====================================================
    html = """
<html>
<head>
    <meta charset="utf-8">
    <title>{{TICKER}} 재무 요약</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body { font-family: Arial; padding: 20px; }
        h1 { margin-bottom: 10px; }
        h2 { margin-top: 40px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
        th { background: #f5f5f5; }
        td:first-child, th:first-child { text-align: left; }
    </style>
</head>
<body>

<h1>{{TICKER}} 재무 요약</h1>

<h2>📊 최근 2개년 분기 재무</h2>
{{Q_TABLE}}

<h2>📈 최근 5개년 연간 재무</h2>
{{Y_TABLE}}

<h2>📊 재무 차트</h2>

<div id="chart-revenue" style="height:400px;"></div>
<div id="chart-income" style="height:400px;"></div>
<div id="chart-margin" style="height:400px;"></div>
<div id="chart-fcf" style="height:400px;"></div>

<script>
fetch("{{TICKER}}_chart.json")
.then(r => r.json())
.then(d => {

    const annotations = [];

    for (let i = 1; i < d.years.length; i++) {
        const pct = d.revenue_yoy[i];
        const yPrev = d.revenue[i - 1];
        const yCurr = d.revenue[i];

        if (pct == null || yPrev == null || yCurr == null) continue;

        annotations.push({
            x: d.years[i],
            y: Math.max(yPrev, yCurr) * 1.08,
            text: `${pct > 0 ? "▲" : "▼"} ${pct.toFixed(1)}%`,
            showarrow: false,
            font: {
                size: 16,
                color: pct > 0 ? "red" : "blue", // Plotly 기본 컬러
                family: "Arial Black"
            }
        });
    }


    Plotly.newPlot("chart-revenue", [{
        x: d.years,
        y: d.revenue,
        type: "bar",
        width: 0.4,   // ⭐ 핵심 (기본값 ≈ 0.8)
        textposition: "outside"
    }], {
        title: {
            text: "매출 추이",
            x: 0.5,
            font: { size: 20 }
        },
        margin: { t: 60 },
        xaxis: {
            type: "category", // ⭐ 핵심
            fixedrange: true  // ← 드래그 비활성
        },
        yaxis: { fixedrange: true },   // ← 드래그 비활성
        annotations: annotations   // ⭐ 핵심
        });

    Plotly.newPlot("chart-income", [
        { x: d.years, y: d.net_income, type: "line", name: "순이익" },
        { x: d.years, y: d.operating_income, type: "line", name: "영업이익" }
    ], {
        title: {
            text: "순이익 VS 영업이익",
            x: 0.5,
            font: { size: 20 }
        },
        margin: { t: 60 },
        xaxis: { fixedrange: true },  // ← 드래그 비활성
        yaxis: { fixedrange: true }   // ← 드래그 비활성
      });

    Plotly.newPlot("chart-margin", [{
        x: d.years,
        y: d.op_margin,
        type: "line"
    }], {
        title: {
            text: "영업이익률 (%)",
            x: 0.5,
            font: { size: 20 }
        },
        margin: { t: 60 },
        xaxis: { fixedrange: true },  // ← 드래그 비활성
        yaxis: {
            ticksuffix: "%",
            fixedrange: true
        }
    });

    Plotly.newPlot("chart-fcf", [{
        x: d.years,
        y: d.fcf,
        type: "bar",
        width: 0.4   // ⭐ 핵심 (기본값 ≈ 0.8)
    }], {
        title: {
            text: "Free Cash Flow",
            x: 0.5,
            font: { size: 20 }
        },
        margin: { t: 60 },
        xaxis: {
            type: "category", // ⭐ 핵심
            fixedrange: true  // ← 드래그 비활성
        },
        yaxis: { fixedrange: true }  // ← 드래그 비활성
        });
});
</script>

</body>
</html>
"""

    html = (
        html.replace("{{TICKER}}", ticker)
            .replace("{{Q_TABLE}}", df_q_fmt.to_html())
            .replace("{{Y_TABLE}}", df_y_fmt.to_html())
    )

    with open(OUT / f"{ticker}.html", "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅ {ticker} 완료")
