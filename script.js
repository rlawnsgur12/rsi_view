// script.js

// ===== 상태 =====
let currentData = [];
let activeFilter = "all";

// ===== 포맷터 =====
function fmt(val) {
  if (val === null || val === undefined || val === "") return "";
  if (isNaN(val)) return val;
  return Number(val).toFixed(2);
}

function fmtPct(val) {
  if (val === null || val === undefined || val === "") return "";
  const n = Number(val);
  if (isNaN(n)) return "";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function fmtPos(val) {
  if (val === null || val === undefined || val === "") return "";
  const n = Number(val);
  if (isNaN(n)) return "";
  return `${n.toFixed(1)}%`;
}

// ===== RSI 색상 그라데이션 =====
function rsiColor(rsi) {
  if (rsi === null || rsi === undefined || isNaN(rsi)) return "";
  const v = Math.max(0, Math.min(100, Number(rsi)));
  let bg, fg = "#fff";
  if (v <= 30) {
    bg = `rgba(30, 100, 220, ${0.7 + (30 - v) / 100})`;
  } else if (v <= 45) {
    bg = `rgba(100, 150, 230, ${0.4})`;
    fg = "#1a1a1a";
  } else if (v < 55) {
    bg = "transparent";
    fg = "#333";
  } else if (v <= 70) {
    bg = `rgba(240, 150, 100, ${0.4})`;
    fg = "#1a1a1a";
  } else {
    bg = `rgba(220, 60, 60, ${0.6 + (v - 70) / 100})`;
  }
  return `background:${bg};color:${fg};font-weight:600;`;
}

function changeColor(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return "";
  const n = Number(pct);
  if (n > 0) return "color:#c0392b;font-weight:600;";
  if (n < 0) return "color:#1f6feb;font-weight:600;";
  return "";
}

function posColor(pos) {
  if (pos === null || pos === undefined || isNaN(pos)) return "";
  const n = Number(pos);
  if (n <= 20) return "background:rgba(30,100,220,0.5);color:#fff;font-weight:600;";
  if (n <= 40) return "background:rgba(100,150,230,0.3);";
  if (n >= 80) return "background:rgba(220,60,60,0.4);color:#fff;";
  return "";
}

function volColor(ratio) {
  if (ratio === null || ratio === undefined || isNaN(ratio)) return "";
  const n = Number(ratio);
  if (n >= 2.0) return "background:rgba(220,140,40,0.5);color:#fff;font-weight:700;";
  if (n >= 1.5) return "background:rgba(240,180,80,0.4);font-weight:600;";
  return "";
}

// 우상향(성장률) 색상 — 강한 양수 진한 초록, 음수 빨강
function growthColor(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return "";
  const n = Number(pct);
  if (n >= 20) return "background:rgba(46,160,67,0.5);color:#fff;font-weight:700;";
  if (n >= 10) return "background:rgba(46,160,67,0.3);font-weight:600;";
  if (n > 0) return "color:#2ea043;font-weight:600;";
  if (n < 0) return "background:rgba(220,60,60,0.25);color:#a8071a;font-weight:600;";
  return "";
}

function fmtGrowth(val) {
  if (val === null || val === undefined || val === "") return "";
  const n = Number(val);
  if (isNaN(n)) return "";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

// PEG 색상: 1 이하 저평가(초록), 1~2 적정, 2 초과 고평가(빨강)
function pegColor(peg) {
  if (peg === null || peg === undefined || isNaN(peg)) return "";
  const n = Number(peg);
  if (n <= 0) return "";
  if (n <= 1) return "background:rgba(46,160,67,0.4);font-weight:700;";
  if (n <= 2) return "color:#333;";
  return "background:rgba(220,60,60,0.25);color:#a8071a;font-weight:600;";
}

// 목표주가 상승여력 색상: 괴리율이 클수록(양수) 진한 초록, 음수(고평가)면 빨강
function upsideColor(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return "";
  const n = Number(pct);
  if (n >= 20) return "background:rgba(46,160,67,0.5);color:#fff;font-weight:700;";
  if (n >= 10) return "background:rgba(46,160,67,0.3);font-weight:600;";
  if (n > 0) return "color:#2ea043;font-weight:600;";
  if (n < 0) return "background:rgba(220,60,60,0.25);color:#a8071a;font-weight:600;";
  return "";
}

// 백테스트 셀: "+5.2% / 65% (N=12) [MDD -18%]" 형태로 평균·승률·진입수·최대낙폭 한 셀에
function fmtBacktest(avg, winrate, events, mdd) {
  if (avg === null || avg === undefined || isNaN(avg)) return "";
  const a = Number(avg);
  const w = winrate !== null && winrate !== undefined && !isNaN(winrate) ? Number(winrate) : null;
  const sign = a > 0 ? "+" : "";
  const avgStr = `${sign}${a.toFixed(1)}%`;
  const winStr = w !== null ? `${w.toFixed(0)}%` : "-";
  const nStr = events ? `<span class="bt-n">N=${events}</span>` : "";
  const mddStr = mdd !== null && mdd !== undefined && !isNaN(mdd)
    ? `<span class="bt-mdd" title="진입 후 보유 기간 중 최대 낙폭">MDD ${Number(mdd).toFixed(1)}%</span>`
    : "";
  return `<div class="bt-cell"><span class="bt-avg">${avgStr}</span><span class="bt-sep">/</span><span class="bt-win">${winStr}</span>${nStr}${mddStr}</div>`;
}

// 백테스트 셀 색상 (평균 수익률 기준)
function btColor(avg, winrate) {
  if (avg === null || avg === undefined || isNaN(avg)) return "";
  const a = Number(avg);
  const w = winrate !== null && winrate !== undefined ? Number(winrate) : 0;
  // 양수 평균 + 높은 승률 = 진한 초록 (강한 신호)
  if (a >= 5 && w >= 70) return "background:rgba(46,160,67,0.55);color:#fff;font-weight:700;";
  if (a >= 3 && w >= 60) return "background:rgba(46,160,67,0.3);font-weight:600;";
  if (a > 0) return "color:#2ea043;font-weight:600;";
  if (a <= -5) return "background:rgba(220,60,60,0.5);color:#fff;font-weight:700;";
  if (a < 0) return "background:rgba(220,60,60,0.2);color:#a8071a;font-weight:600;";
  return "";
}

// ===== RSI 스파크라인 SVG =====
// 30/70 가이드 라인 포함, 30 이하 진입 구간은 파랑 점으로 표시
function renderSparkline(series, opts = {}) {
  if (!Array.isArray(series) || series.length < 2) return "";
  const width = opts.width || 110;
  const height = opts.height || 32;
  const padX = 2, padY = 3;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  // Y축은 0~100 고정 (RSI 범위)
  const yMin = 0, yMax = 100;
  const n = series.length;

  const xAt = (i) => padX + (i / (n - 1)) * innerW;
  const yAt = (v) => padY + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  // 30/70 가이드라인 y 좌표
  const y30 = yAt(30);
  const y70 = yAt(70);

  const path = series.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");

  // 30 이하 구간 강조 점
  const dots = series.map((v, i) => {
    if (v <= 30) return `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="1.8" fill="#1e64dc"/>`;
    if (v >= 70) return `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="1.8" fill="#dc3c3c"/>`;
    return "";
  }).join("");

  const lastV = series[series.length - 1];
  const lastColor = lastV <= 30 ? "#1e64dc" : (lastV >= 70 ? "#dc3c3c" : "#666");

  return `<svg class="spark" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <line x1="${padX}" y1="${y30.toFixed(1)}" x2="${width - padX}" y2="${y30.toFixed(1)}" stroke="#bcd2f0" stroke-dasharray="2,2" stroke-width="0.8"/>
    <line x1="${padX}" y1="${y70.toFixed(1)}" x2="${width - padX}" y2="${y70.toFixed(1)}" stroke="#f0bcbc" stroke-dasharray="2,2" stroke-width="0.8"/>
    <path d="${path}" fill="none" stroke="${lastColor}" stroke-width="1.4"/>
    ${dots}
    <circle cx="${xAt(n-1).toFixed(1)}" cy="${yAt(lastV).toFixed(1)}" r="2.4" fill="${lastColor}"/>
  </svg>`;
}

// ===== 시장 위젯 로드 =====
async function loadMarket() {
  const widget = document.getElementById("market-widget");
  try {
    const res = await fetch("data/market.json");
    if (!res.ok) throw new Error("no market");
    const items = await res.json();
    if (!items.length) throw new Error("empty");
    widget.innerHTML = items.map(it => {
      const chgStyle = changeColor(it.DayChangePct);
      const rsiStyle = rsiColor(it.RSI);
      const wRsiStyle = rsiColor(it.WeeklyRSI);
      return `<div class="market-card">
        <div class="market-label">${it.Label}</div>
        <div class="market-ticker">${it.Ticker}</div>
        <div class="market-price">$${fmt(it.Price)}</div>
        <div class="market-change" style="${chgStyle}">${fmtPct(it.DayChangePct)}</div>
        <div class="market-rsi-row">
          <span class="market-rsi" style="${rsiStyle}">일 ${fmt(it.RSI)}</span>
          <span class="market-rsi" style="${wRsiStyle}">주 ${fmt(it.WeeklyRSI)}</span>
        </div>
      </div>`;
    }).join("");
  } catch (err) {
    widget.innerHTML = `<span class="market-widget-loading">⚠️ 시장 데이터 없음 (data/market.json)</span>`;
  }
}

// ===== 탭 로드 =====
async function loadTab(name, btn) {
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  document.getElementById("search-box").value = "";
  setFilter("all", document.querySelector(`.chip[data-filter="all"]`));

  const tbody = document.getElementById("rsi-table-body");
  tbody.innerHTML = `<tr><td colspan="28">⏳ 로딩 중...</td></tr>`;

  try {
    const res = await fetch(`data/${name}.json`);
    if (!res.ok) throw new Error("파일 없음");
    const data = await res.json();

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="28">📭 데이터 없음</td></tr>`;
      currentData = [];
      return;
    }

    currentData = data;
    populateSectorFilter(data);
    renderTable(data);

  } catch (err) {
    console.warn(`${name}.json 없음`);
    tbody.innerHTML = `<tr><td colspan="28">⚠️ 데이터 파일이 없습니다</td></tr>`;
    currentData = [];
  }
}

function populateSectorFilter(data) {
  const sel = document.getElementById("sector-filter");
  const sectors = [...new Set(data.map(d => d.Sector).filter(s => s && s !== "-"))].sort();
  sel.innerHTML = `<option value="">모든 섹터</option>` +
    sectors.map(s => `<option value="${s}">${s}</option>`).join("");
}

// ===== 테이블 렌더 =====
function renderTable(data) {
  const tbody = document.getElementById("rsi-table-body");
  tbody.innerHTML = "";

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="28">🔎 조건에 맞는 종목이 없습니다</td></tr>`;
    updateResultCount(0);
    return;
  }

  data.forEach(item => {
    const row = document.createElement("tr");
    if (item.DualOversold) row.classList.add("row-dual");

    const append = (html, style = "") => {
      const cell = document.createElement("td");
      cell.innerHTML = html;
      if (style) cell.style.cssText = style;
      row.appendChild(cell);
    };

    // Ticker
    append(`<a href="./stocks/${item.Ticker}.html" class="ticker-link" style="text-decoration:none;color:inherit;">${item.Ticker ?? ""}</a>`);
    // Name
    append(`<a href="./stocks/${item.Ticker}.html" class="ticker-link" style="text-decoration:none;color:inherit;">${item.Name ?? ""}</a>`);
    // Sector
    append(item.Sector ?? "");
    // Chart link
    append(`<a href="https://www.tradingview.com/symbols/${item.Ticker}/" target="_blank" style="text-decoration:none;">📈</a>`);
    // 일 RSI
    append(fmt(item.RSI), rsiColor(item.RSI));
    // 일 RSI 스파크라인
    append(renderSparkline(item.RSI_Series));
    // 주 RSI
    append(fmt(item.WeeklyRSI), rsiColor(item.WeeklyRSI));
    // 주 RSI 스파크라인
    append(renderSparkline(item.WeeklyRSI_Series));
    // 쌍과매도
    append(item.DualOversold || "", item.DualOversold ? "background:rgba(30,100,220,0.25);font-weight:700;" : "");
    // 일 RSI ≤ 30
    append(item["RSI_30이하"] || "");
    // 30 < 일 RSI ≤ 35
    append(item["RSI_30초과_35이하"] || "");
    // 최근 7일 일 RSI ≤ 30
    append(item["최근7일내_RSI30이하"] || "");
    // 현재가
    append(item.Price != null ? `$${fmt(item.Price)}` : "");
    // 일변동
    append(fmtPct(item.DayChangePct), changeColor(item.DayChangePct));
    // 52주 위치
    append(fmtPos(item.Pos52w), posColor(item.Pos52w));
    // 거래량 비율
    append(item.VolRatio != null ? `${fmt(item.VolRatio)}x` : "", volColor(item.VolRatio));
    // 📈 EPS 성장
    append(fmtGrowth(item.EPS_Growth), growthColor(item.EPS_Growth));
    // 📈 매출 YoY
    append(fmtGrowth(item.Revenue_YoY), growthColor(item.Revenue_YoY));
    // 🧪 백테스트 1M
    append(fmtBacktest(item.BT_1M_Avg, item.BT_1M_Win, item.BT_Events, item.BT_1M_MDD), btColor(item.BT_1M_Avg, item.BT_1M_Win));
    // 🧪 백테스트 3M
    append(fmtBacktest(item.BT_3M_Avg, item.BT_3M_Win, item.BT_Events, item.BT_3M_MDD), btColor(item.BT_3M_Avg, item.BT_3M_Win));
    // PER ~ EPS(예상)
    append(fmt(item.PER));
    append(fmt(item["PER(예상)"]));
    append(fmt(item.PBR));
    append(fmt(item.ROE));
    append(fmt(item.EPS));
    append(fmt(item["EPS(예상)"]));
    // PEG
    append(fmt(item.PEG), pegColor(item.PEG));
    // 목표주가 상승여력(%)
    append(fmtGrowth(item.TargetUpside), upsideColor(item.TargetUpside));

    tbody.appendChild(row);
  });

  updateResultCount(data.length);
}

function updateResultCount(n) {
  const el = document.getElementById("result-count");
  if (el) el.textContent = `${n}개 종목`;
}

// ===== 필터 =====
function setFilter(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  applyFilters();
}

function applyFilters() {
  if (!currentData.length) return;

  const q = document.getElementById("search-box").value.trim().toLowerCase();
  const sector = document.getElementById("sector-filter").value;

  let filtered = currentData;

  if (q) {
    filtered = filtered.filter(d =>
      (d.Ticker || "").toLowerCase().includes(q) ||
      (d.Name || "").toLowerCase().includes(q)
    );
  }

  if (sector) {
    filtered = filtered.filter(d => d.Sector === sector);
  }

  const hideRisk = document.getElementById("hide-risk")?.checked;
  if (hideRisk) {
    // 회피조건(§7): 적자기업(EPS<0) 또는 52주 위치 10% 미만
    filtered = filtered.filter(d => {
      const epsNegative = d.EPS != null && Number(d.EPS) < 0;
      const near52wLow = d.Pos52w != null && Number(d.Pos52w) < 10;
      return !epsNegative && !near52wLow;
    });
  }

  if (activeFilter === "oversold") {
    filtered = filtered.filter(d => Number(d.RSI) <= 30);
  } else if (activeFilter === "warning") {
    filtered = filtered.filter(d => Number(d.RSI) <= 35);
  } else if (activeFilter === "weekly_oversold") {
    filtered = filtered.filter(d => d.WeeklyRSI != null && Number(d.WeeklyRSI) <= 35);
  } else if (activeFilter === "dual") {
    filtered = filtered.filter(d => d.DualOversold);
  } else if (activeFilter === "recent7") {
    filtered = filtered.filter(d => d["최근7일내_RSI30이하"]);
  }

  renderTable(filtered);
}

// ===== 정렬 =====
// 스파크라인 컬럼(5, 7)은 마지막 값 기준
function sortTable(n) {
  const tbody = document.querySelector("table tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  const getValue = (row) => {
    const cell = row.children[n];
    // 스파크라인 셀: data-last 속성 없으면 그냥 텍스트로
    const svg = cell.querySelector("svg.spark");
    if (svg) {
      // 마지막 점 cy로 값 추정은 비효율적 → 인접 컬럼(일 RSI=4, 주 RSI=6) 값으로 정렬
      if (n === 5) return parseFloat(row.children[4].textContent.trim()) || 0;
      if (n === 7) return parseFloat(row.children[6].textContent.trim()) || 0;
    }
    const text = cell.textContent.trim().replace(/[$x%+,]/g, "");
    const num = parseFloat(text);
    return isNaN(num) ? text : num;
  };

  const asc = !tbody.classList.contains("asc");
  tbody.classList.toggle("asc", asc);

  rows.sort((a, b) => {
    const x = getValue(a);
    const y = getValue(b);
    if (typeof x === "number" && typeof y === "number") {
      return asc ? x - y : y - x;
    }
    return asc
      ? String(x).localeCompare(String(y))
      : String(y).localeCompare(String(x));
  });

  tbody.innerHTML = "";
  rows.forEach(row => tbody.appendChild(row));
}

// ===== 초기 로드 =====
loadMarket();
loadTab("rsi_data", document.querySelector(".tabs button.active"));
document.querySelector(`.chip[data-filter="all"]`)?.classList.add("active");
