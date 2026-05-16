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
// 0~30: 진한 파랑(과매도 매수신호) → 50: 회색 → 70~100: 진한 빨강(과매수)
function rsiColor(rsi) {
  if (rsi === null || rsi === undefined || isNaN(rsi)) return "";
  const v = Math.max(0, Math.min(100, Number(rsi)));
  let bg, fg = "#fff";
  if (v <= 30) {
    // 짙은 파랑
    bg = `rgba(30, 100, 220, ${0.7 + (30 - v) / 100})`;
  } else if (v <= 45) {
    // 옅은 파랑
    bg = `rgba(100, 150, 230, ${0.4})`;
    fg = "#1a1a1a";
  } else if (v < 55) {
    bg = "transparent";
    fg = "#333";
  } else if (v <= 70) {
    bg = `rgba(240, 150, 100, ${0.4})`;
    fg = "#1a1a1a";
  } else {
    // 짙은 빨강
    bg = `rgba(220, 60, 60, ${0.6 + (v - 70) / 100})`;
  }
  return `background:${bg};color:${fg};font-weight:600;`;
}

// 일변동률 색상
function changeColor(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return "";
  const n = Number(pct);
  if (n > 0) return "color:#c0392b;font-weight:600;";
  if (n < 0) return "color:#1f6feb;font-weight:600;";
  return "";
}

// 52주 위치 색상 (낮을수록 파랑)
function posColor(pos) {
  if (pos === null || pos === undefined || isNaN(pos)) return "";
  const n = Number(pos);
  if (n <= 20) return "background:rgba(30,100,220,0.5);color:#fff;font-weight:600;";
  if (n <= 40) return "background:rgba(100,150,230,0.3);";
  if (n >= 80) return "background:rgba(220,60,60,0.4);color:#fff;";
  return "";
}

// 거래량 비율 색상 (1.5 이상 강조)
function volColor(ratio) {
  if (ratio === null || ratio === undefined || isNaN(ratio)) return "";
  const n = Number(ratio);
  if (n >= 2.0) return "background:rgba(220,140,40,0.5);color:#fff;font-weight:700;";
  if (n >= 1.5) return "background:rgba(240,180,80,0.4);font-weight:600;";
  return "";
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
      return `<div class="market-card">
        <div class="market-label">${it.Label}</div>
        <div class="market-ticker">${it.Ticker}</div>
        <div class="market-price">$${fmt(it.Price)}</div>
        <div class="market-change" style="${chgStyle}">${fmtPct(it.DayChangePct)}</div>
        <div class="market-rsi" style="${rsiStyle}">RSI ${fmt(it.RSI)}</div>
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

  // 탭 변경 시 필터 초기화
  document.getElementById("search-box").value = "";
  setFilter("all", document.querySelector(`.chip[data-filter="all"]`));

  const tbody = document.getElementById("rsi-table-body");
  tbody.innerHTML = `<tr><td colspan="18">⏳ 로딩 중...</td></tr>`;

  try {
    const res = await fetch(`data/${name}.json`);
    if (!res.ok) throw new Error("파일 없음");
    const data = await res.json();

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="18">📭 데이터 없음</td></tr>`;
      currentData = [];
      return;
    }

    currentData = data;
    populateSectorFilter(data);
    renderTable(data);

  } catch (err) {
    console.warn(`${name}.json 없음`);
    tbody.innerHTML = `<tr><td colspan="18">⚠️ 데이터 파일이 없습니다</td></tr>`;
    currentData = [];
  }
}

// ===== 섹터 옵션 채우기 =====
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
    tbody.innerHTML = `<tr><td colspan="18">🔎 조건에 맞는 종목이 없습니다</td></tr>`;
    updateResultCount(0);
    return;
  }

  const cols = [
    "Ticker", "Name", "Sector", "Chart",
    "RSI", "RSI_30이하", "RSI_30초과_35이하", "최근7일내_RSI30이하",
    "Price", "DayChangePct", "Pos52w", "VolRatio",
    "PER", "PER(예상)", "PBR", "ROE", "EPS", "EPS(예상)"
  ];

  data.forEach(item => {
    const row = document.createElement("tr");
    cols.forEach(col => {
      const cell = document.createElement("td");

      if (col === "Ticker" || col === "Name") {
        const link = document.createElement("a");
        link.href = `./stocks/${item.Ticker}.html`;
        link.textContent = item[col] ?? "";
        link.classList.add("ticker-link");
        link.style.textDecoration = "none";
        link.style.color = "inherit";
        cell.appendChild(link);

      } else if (col === "Chart") {
        const tvLink = document.createElement("a");
        tvLink.href = `https://www.tradingview.com/symbols/${item.Ticker}/`;
        tvLink.target = "_blank";
        tvLink.textContent = "📈";
        tvLink.style.textDecoration = "none";
        cell.appendChild(tvLink);

      } else if (col === "RSI") {
        cell.textContent = fmt(item[col]);
        cell.style.cssText = rsiColor(item[col]);

      } else if (col === "Price") {
        cell.textContent = item[col] != null ? `$${fmt(item[col])}` : "";

      } else if (col === "DayChangePct") {
        cell.textContent = fmtPct(item[col]);
        cell.style.cssText = changeColor(item[col]);

      } else if (col === "Pos52w") {
        cell.textContent = fmtPos(item[col]);
        cell.style.cssText = posColor(item[col]);

      } else if (col === "VolRatio") {
        cell.textContent = item[col] != null ? `${fmt(item[col])}x` : "";
        cell.style.cssText = volColor(item[col]);

      } else {
        cell.textContent = fmt(item[col]);
      }
      row.appendChild(cell);
    });
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

  if (activeFilter === "oversold") {
    filtered = filtered.filter(d => Number(d.RSI) <= 30);
  } else if (activeFilter === "warning") {
    filtered = filtered.filter(d => Number(d.RSI) <= 35);
  } else if (activeFilter === "recent7") {
    filtered = filtered.filter(d => d["최근7일내_RSI30이하"]);
  }

  renderTable(filtered);
}

// ===== 정렬 =====
function sortTable(n) {
  const tbody = document.querySelector("table tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  const getValue = (row) => {
    const text = row.children[n].textContent.trim()
      .replace(/[$x%+,]/g, "");
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
// 기본 필터칩 active
document.querySelector(`.chip[data-filter="all"]`)?.classList.add("active");
