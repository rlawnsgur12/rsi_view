import { fmt, fmtPct } from "./formatters.js";
import { rsiColor, changeColor } from "./colors.js";

export async function loadMarket() {
  const widget = document.getElementById("market-widget");
  try {
    const res = await fetch("data/market.json");
    if (!res.ok) throw new Error("no market");
    const items = await res.json();
    if (!items.length) throw new Error("empty");
    widget.innerHTML = items.map(it => `
      <div class="market-card">
        <div class="market-label">${it.Label}</div>
        <div class="market-ticker">${it.Ticker}</div>
        <div class="market-price">$${fmt(it.Price)}</div>
        <div class="market-change" style="${changeColor(it.DayChangePct)}">${fmtPct(it.DayChangePct)}</div>
        <div class="market-rsi-row">
          <span class="market-rsi" style="${rsiColor(it.RSI)}">일 ${fmt(it.RSI)}</span>
          <span class="market-rsi" style="${rsiColor(it.WeeklyRSI)}">주 ${fmt(it.WeeklyRSI)}</span>
        </div>
      </div>`).join("");
  } catch {
    widget.innerHTML = `<span class="market-widget-loading">⚠️ 시장 데이터 없음 (data/market.json)</span>`;
  }
}
