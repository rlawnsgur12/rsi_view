import sys
import yfinance as yf
import pandas as pd
from pathlib import Path
import json
import math

sys.stdout.reconfigure(encoding="utf-8")

# =========================
# 출력 디렉토리
# =========================
BASE_DIR = Path(__file__).resolve().parent.parent
TICKERS_DIR = BASE_DIR / "tickers_info"
OUT = BASE_DIR / "stocks"
OUT.mkdir(exist_ok=True)

# =========================
# RSI (Wilder EMA)
# =========================
def compute_rsi_ema(close, period=14):
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))

# =========================
# 안전한 Row 추출
# =========================
def safe_row(df, names):
    if df is None or df.empty:
        return pd.Series(dtype="float64")
    for n in names:
        if n in df.index:
            return df.loc[n]
    return pd.Series([pd.NA] * len(df.columns), index=df.columns)

def fmt_money(val):
    if pd.isna(val):
        return ""
    return f"{val / 1e8:,.1f}억"

def fmt_pct(val):
    if pd.isna(val):
        return ""
    return f"{val:.0f}%"

# =========================
# RSI 시계열 (일봉/주봉)
# =========================
def build_rsi_series(ticker):
    """일봉 6개월 + 주봉 2년 RSI 시계열 반환"""
    out = {
        "daily_dates": [], "daily_rsi": [], "daily_price": [],
        "weekly_dates": [], "weekly_rsi": [], "weekly_price": [],
    }
    try:
        data = yf.download(ticker, period='3y', interval='1d', progress=False, auto_adjust=False)
        if data.empty or 'Close' not in data:
            return out
        close = data['Close']
        if isinstance(close, pd.DataFrame) and ticker in close.columns:
            close = close[ticker]

        # 일봉 RSI (최근 6개월 ≈ 130 거래일)
        daily_rsi = compute_rsi_ema(close).dropna()
        d_tail = daily_rsi.tail(130)
        price_tail = close.loc[d_tail.index]
        out["daily_dates"] = d_tail.index.strftime("%Y-%m-%d").tolist()
        out["daily_rsi"] = [round(float(v), 2) for v in d_tail.tolist()]
        out["daily_price"] = [round(float(v), 2) for v in price_tail.tolist()]

        # 주봉 RSI (최근 2년 ≈ 104주)
        weekly_close = close.resample('W-FRI').last().dropna()
        weekly_rsi = compute_rsi_ema(weekly_close).dropna()
        w_tail = weekly_rsi.tail(104)
        wprice_tail = weekly_close.loc[w_tail.index]
        out["weekly_dates"] = w_tail.index.strftime("%Y-%m-%d").tolist()
        out["weekly_rsi"] = [round(float(v), 2) for v in w_tail.tolist()]
        out["weekly_price"] = [round(float(v), 2) for v in wprice_tail.tolist()]
    except Exception as e:
        print(f"{ticker} RSI 시계열 오류: {e}")
    return out


# =========================
# tickers_info 폴더 하위 JSON 모두 읽어서 처리
# =========================
json_files = list(TICKERS_DIR.glob("*.json"))

for jf in json_files:
    with open(jf, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict):
        tickers = list(data.keys())
    elif isinstance(data, list):
        tickers = data
    else:
        tickers = []

    if not tickers:
        print(f"{jf}: 티커 리스트 비어 있음, 건너뜀")
        continue

    for ticker in tickers:
        try:
            print(f"처리 중: {ticker}")
            t = yf.Ticker(ticker)

            q = t.quarterly_income_stmt
            y = t.income_stmt
            cf = t.cashflow

            # 분기 재무
            df_q = pd.DataFrame({
                "매출액": safe_row(q, ["Total Revenue"]),
                "순이익": safe_row(q, [
                    "Net Income From Continuing Operation Net Minority Interest",
                    "Net Income"
                ]),
                "영업이익": safe_row(q, ["Operating Income"])
            }).head(8)

            df_q = df_q.sort_index()
            df_q["매출 성장률 (QoQ)"] = df_q["매출액"].pct_change(fill_method=None) * 100
            df_q["순이익 성장률 (QoQ)"] = df_q["순이익"].pct_change(fill_method=None) * 100
            df_q["영업이익률 (%)"] = df_q["영업이익"] / df_q["매출액"] * 100
            df_q = df_q.sort_index(ascending=False)

            df_q_fmt = df_q.copy()
            for col in ["매출액", "순이익", "영업이익"]:
                df_q_fmt[col] = df_q_fmt[col].map(fmt_money)
            for col in ["매출 성장률 (QoQ)", "순이익 성장률 (QoQ)", "영업이익률 (%)"]:
                df_q_fmt[col] = df_q_fmt[col].map(fmt_pct)

            # 연간 재무
            df_y = pd.DataFrame({
                "매출액": safe_row(y, ["Total Revenue"]),
                "순이익": safe_row(y, [
                    "Net Income From Continuing Operation Net Minority Interest",
                    "Net Income"
                ]),
                "영업이익": safe_row(y, ["Operating Income"]),
                "잉여현금흐름": safe_row(cf, [
                    "Free Cash Flow",
                    "FreeCashFlow"
                ])
            }).head(5)

            df_y = df_y.sort_index()
            df_y["매출 성장률 (YoY)"] = df_y["매출액"].pct_change(fill_method=None) * 100
            df_y["순이익 성장률 (YoY)"] = df_y["순이익"].pct_change(fill_method=None) * 100
            df_y["영업이익률 (%)"] = df_y["영업이익"] / df_y["매출액"] * 100
            df_y["FCF 마진 (%)"] = df_y["잉여현금흐름"] / df_y["매출액"] * 100
            df_y = df_y.sort_index(ascending=False)

            for col in ["매출액", "순이익", "영업이익", "잉여현금흐름"]:
                df_y[col] = pd.to_numeric(df_y[col], errors="coerce")

            df_chart = (
                df_y
                .sort_index(ascending=True)
                .loc[
                    df_y["매출액"].notna() &
                    df_y["순이익"].notna() &
                    df_y["영업이익"].notna()
                ]
            )

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

            # RSI 시계열 추가
            rsi_data = build_rsi_series(ticker)

            chart_data = {
                "years": df_chart.index.astype(str).tolist(),
                "revenue": df_chart["매출액"].round(0).tolist(),
                "revenue_yoy": revenue_yoy,
                "net_income": df_chart["순이익"].round(0).tolist(),
                "operating_income": df_chart["영업이익"].round(0).tolist(),
                "fcf": df_chart["잉여현금흐름"].round(0).tolist(),
                "op_margin": (
                    df_chart["영업이익"] / df_chart["매출액"] * 100
                ).round(1).tolist(),
                **rsi_data,
            }

            with open(OUT / f"{ticker}_chart.json", "w", encoding="utf-8") as jf:
                json.dump(chart_data, jf, ensure_ascii=False)

            df_y_fmt = df_y.copy()
            for col in ["매출액", "순이익", "영업이익", "잉여현금흐름"]:
                df_y_fmt[col] = df_y_fmt[col].map(fmt_money)
            for col in ["매출 성장률 (YoY)", "순이익 성장률 (YoY)", "영업이익률 (%)", "FCF 마진 (%)"]:
                df_y_fmt[col] = df_y_fmt[col].map(fmt_pct)

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
                .back { display:inline-block; margin-bottom:10px; color:#1f6feb; text-decoration:none; font-weight:600; }
                .back:hover { text-decoration:underline; }
            </style>
        </head>
        <body>

        <a href="../index.html" class="back">← 목록으로</a>
        <h1>{{TICKER}} 재무 요약</h1>

        <h2>📈 RSI 추세 (일봉 6개월 / 주봉 2년)</h2>
        <p style="color:#666;font-size:13px;margin:0 0 10px 0;">
          가격 차트와 RSI를 겹쳐 봅니다. 30 이하 진입 후 반등 + 주봉 RSI도 같은 신호면 쌍돌파 후보입니다.
        </p>
        <div id="chart-rsi-daily" style="height:380px;"></div>
        <div id="chart-rsi-weekly" style="height:380px;"></div>

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

            // ===== RSI 일봉 차트 (가격 + RSI 듀얼 축) =====
            if (d.daily_dates && d.daily_dates.length) {
                Plotly.newPlot("chart-rsi-daily", [
                    {
                        x: d.daily_dates, y: d.daily_price,
                        type: "scatter", mode: "lines", name: "가격",
                        line: { color: "#333", width: 1.5 },
                        yaxis: "y1"
                    },
                    {
                        x: d.daily_dates, y: d.daily_rsi,
                        type: "scatter", mode: "lines", name: "일봉 RSI",
                        line: { color: "#1f6feb", width: 1.8 },
                        yaxis: "y2"
                    }
                ], {
                    title: { text: "일봉 RSI + 가격 (6개월)", x: 0.5, font: { size: 16 } },
                    margin: { t: 50, r: 60 },
                    xaxis: { fixedrange: true },
                    yaxis: { title: "가격", fixedrange: true, side: "left" },
                    yaxis2: {
                        title: "RSI", overlaying: "y", side: "right",
                        range: [0, 100], fixedrange: true,
                        tickvals: [0, 30, 50, 70, 100]
                    },
                    shapes: [
                        { type: "line", xref: "paper", x0: 0, x1: 1, yref: "y2", y0: 30, y1: 30, line: { color: "#1f6feb", width: 1, dash: "dash" } },
                        { type: "line", xref: "paper", x0: 0, x1: 1, yref: "y2", y0: 70, y1: 70, line: { color: "#dc3c3c", width: 1, dash: "dash" } }
                    ],
                    legend: { orientation: "h", y: -0.15 }
                }, { displayModeBar: false });
            }

            // ===== RSI 주봉 차트 =====
            if (d.weekly_dates && d.weekly_dates.length) {
                Plotly.newPlot("chart-rsi-weekly", [
                    {
                        x: d.weekly_dates, y: d.weekly_price,
                        type: "scatter", mode: "lines", name: "가격(주봉)",
                        line: { color: "#333", width: 1.5 },
                        yaxis: "y1"
                    },
                    {
                        x: d.weekly_dates, y: d.weekly_rsi,
                        type: "scatter", mode: "lines", name: "주봉 RSI",
                        line: { color: "#8e44ad", width: 1.8 },
                        yaxis: "y2"
                    }
                ], {
                    title: { text: "주봉 RSI + 가격 (2년)", x: 0.5, font: { size: 16 } },
                    margin: { t: 50, r: 60 },
                    xaxis: { fixedrange: true },
                    yaxis: { title: "가격", fixedrange: true, side: "left" },
                    yaxis2: {
                        title: "RSI", overlaying: "y", side: "right",
                        range: [0, 100], fixedrange: true,
                        tickvals: [0, 30, 50, 70, 100]
                    },
                    shapes: [
                        { type: "line", xref: "paper", x0: 0, x1: 1, yref: "y2", y0: 30, y1: 30, line: { color: "#1f6feb", width: 1, dash: "dash" } },
                        { type: "line", xref: "paper", x0: 0, x1: 1, yref: "y2", y0: 70, y1: 70, line: { color: "#dc3c3c", width: 1, dash: "dash" } }
                    ],
                    legend: { orientation: "h", y: -0.15 }
                }, { displayModeBar: false });
            }

            // ===== 재무 차트 =====
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
                    font: { size: 16, color: pct > 0 ? "red" : "blue", family: "Arial Black" }
                });
            }

            Plotly.newPlot("chart-revenue", [{
                x: d.years, y: d.revenue, type: "bar", width: 0.4, textposition: "outside"
            }], {
                title: { text: "매출 추이", x: 0.5, font: { size: 20 } },
                margin: { t: 60 },
                xaxis: { type: "category", fixedrange: true },
                yaxis: { fixedrange: true },
                annotations: annotations
            });

            Plotly.newPlot("chart-income", [
                { x: d.years, y: d.net_income, type: "line", name: "순이익" },
                { x: d.years, y: d.operating_income, type: "line", name: "영업이익" }
            ], {
                title: { text: "순이익 VS 영업이익", x: 0.5, font: { size: 20 } },
                margin: { t: 60 },
                xaxis: { fixedrange: true },
                yaxis: { fixedrange: true }
            });

            Plotly.newPlot("chart-margin", [{
                x: d.years, y: d.op_margin, type: "line"
            }], {
                title: { text: "영업이익률 (%)", x: 0.5, font: { size: 20 } },
                margin: { t: 60 },
                xaxis: { fixedrange: true },
                yaxis: { ticksuffix: "%", fixedrange: true }
            });

            Plotly.newPlot("chart-fcf", [{
                x: d.years, y: d.fcf, type: "bar", width: 0.4
            }], {
                title: { text: "Free Cash Flow", x: 0.5, font: { size: 20 } },
                margin: { t: 60 },
                xaxis: { type: "category", fixedrange: true },
                yaxis: { fixedrange: true }
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

        except Exception as e:
            print(f"{ticker} 처리 중 오류: {e}")
