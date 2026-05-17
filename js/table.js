import { fmt, fmtPct, fmtPos, fmtGrowth, fmtBacktest } from "./formatters.js";
import { rsiColor, changeColor, posColor, volColor, growthColor, btColor } from "./colors.js";
import { calcScore, scoreLabel } from "./score.js";
import { renderSparkline } from "./sparkline.js";

export function populateSectorFilter(data) {
  const sel = document.getElementById("sector-filter");
  const sectors = [...new Set(data.map(d => d.Sector).filter(s => s && s !== "-"))].sort();
  sel.innerHTML = `<option value="">모든 섹터</option>` +
    sectors.map(s => `<option value="${s}">${s}</option>`).join("");
}

export function updateResultCount(n) {
  const el = document.getElementById("result-count");
  if (el) el.textContent = `${n}개 종목`;
}

export function renderTable(data) {
  const tbody = document.getElementById("rsi-table-body");
  tbody.innerHTML = "";

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="27">🔎 조건에 맞는 종목이 없습니다</td></tr>`;
    updateResultCount(0);
    return;
  }

  data.forEach(item => {
    const row = document.createElement("tr");
    if (item.DualOversold) row.classList.add("row-dual");

    const cell = (html, style = "", sortVal = null) => {
      const td = document.createElement("td");
      td.innerHTML = html;
      if (style)   td.style.cssText = style;
      if (sortVal !== null) td.dataset.sort = sortVal;
      row.appendChild(td);
    };

    cell(`<a href="./stocks/${item.Ticker}.html" class="ticker-link" style="text-decoration:none;color:inherit;">${item.Ticker ?? ""}</a>`);
    cell(`<a href="./stocks/${item.Ticker}.html" class="ticker-link" style="text-decoration:none;color:inherit;">${item.Name ?? ""}</a>`);
    cell(item.Sector ?? "");
    cell(`<a href="https://www.tradingview.com/symbols/${item.Ticker}/" target="_blank" style="text-decoration:none;">📈</a>`);
    cell(fmt(item.RSI), rsiColor(item.RSI));
    cell(renderSparkline(item.RSI_Series));
    cell(fmt(item.WeeklyRSI), rsiColor(item.WeeklyRSI));
    cell(renderSparkline(item.WeeklyRSI_Series));
    cell(item.DualOversold || "", item.DualOversold ? "background:rgba(30,100,220,0.25);font-weight:700;" : "");
    cell(item["RSI_30이하"] || "");
    cell(item["RSI_30초과_35이하"] || "");
    cell(item["최근7일내_RSI30이하"] || "");
    cell(item.Price != null ? `$${fmt(item.Price)}` : "");
    cell(fmtPct(item.DayChangePct), changeColor(item.DayChangePct));
    cell(fmtPos(item.Pos52w), posColor(item.Pos52w));
    cell(item.VolRatio != null ? `${fmt(item.VolRatio)}x` : "", volColor(item.VolRatio));
    cell(fmtGrowth(item.EPS_Growth), growthColor(item.EPS_Growth));
    cell(fmtGrowth(item.Revenue_YoY), growthColor(item.Revenue_YoY));
    cell(fmtBacktest(item.BT_1M_Avg, item.BT_1M_Win, item.BT_Events), btColor(item.BT_1M_Avg, item.BT_1M_Win));
    cell(fmtBacktest(item.BT_3M_Avg, item.BT_3M_Win, item.BT_Events), btColor(item.BT_3M_Avg, item.BT_3M_Win));
    cell(fmt(item.PER));
    cell(fmt(item["PER(예상)"]));
    cell(fmt(item.PBR));
    cell(fmt(item.ROE));
    cell(fmt(item.EPS));
    cell(fmt(item["EPS(예상)"]));

    const score = calcScore(item);
    const lbl   = scoreLabel(score);
    cell(`${lbl.text} <small style="opacity:0.7">${score}점</small>`, lbl.style, score);

    tbody.appendChild(row);
  });

  updateResultCount(data.length);
}
