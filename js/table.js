import { fmt, fmtPct, fmtPos, fmtGrowth, fmtBacktest } from "./formatters.js";
import { rsiColor, changeColor, posColor, volColor, growthColor, btColor } from "./colors.js";
import { calcScore, scoreLabel, calcScoreBreakdown } from "./score.js";
import { renderSparkline } from "./sparkline.js";
import { isWatched, toggleWatchlist } from "./watchlist.js";
import { getNote, saveNote, hasNote } from "./ai_notes.js";
import { buildPrompt, PROMPT_VERSIONS, getPromptVersion, setPromptVersion } from "./prompts.js";

let _aiPrompt = "";

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
    tbody.innerHTML = `<tr><td colspan="29">🔎 조건에 맞는 종목이 없습니다</td></tr>`;
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

    const starTd = document.createElement("td");
    const watched = isWatched(item.Ticker);
    starTd.innerHTML = `<span style="cursor:pointer;font-size:1.1em;user-select:none;">${watched ? "⭐" : "☆"}</span>`;
    starTd.addEventListener("click", () => {
      const added = toggleWatchlist(item.Ticker);
      starTd.querySelector("span").textContent = added ? "⭐" : "☆";
    });
    row.appendChild(starTd);

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

    const score     = calcScore(item);
    const lbl       = scoreLabel(score);
    const breakdown = calcScoreBreakdown(item);

    const scoreTd = document.createElement("td");
    scoreTd.style.cssText = lbl.style + "cursor:pointer;";
    scoreTd.dataset.sort  = score;
    scoreTd.innerHTML     = `${lbl.text} <small style="opacity:0.7">${score}점</small>`;
    scoreTd.addEventListener("click", () => showScoreModal(item, score, lbl, breakdown));
    row.appendChild(scoreTd);

    const aiTd = document.createElement("td");
    const aiIcon = () => hasNote(item.Ticker) ? "🤖✓" : "🤖";
    aiTd.innerHTML = `<span style="cursor:pointer;font-size:1.1em;" title="AI 분석">${aiIcon()}</span>`;
    aiTd.addEventListener("click", () => showAiModal(item, () => {
      aiTd.querySelector("span").textContent = aiIcon();
    }));
    row.appendChild(aiTd);

    tbody.appendChild(row);
  });

  updateResultCount(data.length);
}

function showScoreModal(item, score, lbl, breakdown) {
  let modal = document.getElementById("score-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "score-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;";
    modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  const rows = breakdown.map(r => {
    const bar = Math.round((r.score / r.max) * 100);
    return `<tr>
      <td style="padding:6px 12px 6px 0;white-space:nowrap;">${r.label}</td>
      <td style="padding:6px 8px;text-align:right;font-weight:600;">${r.score}/${r.max}</td>
      <td style="padding:6px 0 6px 12px;color:#888;font-size:0.88em;">${r.detail}</td>
      <td style="padding:6px 0 6px 8px;width:80px;">
        <div style="background:#eee;border-radius:4px;height:8px;">
          <div style="background:#4a90d9;width:${bar}%;height:8px;border-radius:4px;"></div>
        </div>
      </td>
    </tr>`;
  }).join("");

  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:28px 32px;min-width:360px;max-width:480px;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <strong style="font-size:1.1em;">${item.Ticker} — 종합의견 상세</strong>
        <span style="cursor:pointer;font-size:1.3em;line-height:1;" onclick="document.getElementById('score-modal').remove()">✕</span>
      </div>
      <div style="font-size:1.4em;font-weight:700;margin-bottom:16px;padding:8px 12px;border-radius:8px;${lbl.style}">${lbl.text} ${score}점</div>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <div style="margin-top:20px;">${aiButtons(item)}</div>
    </div>`;
}

function aiButtons(item) {
  const prompt = buildPrompt(item);
  _aiPrompt = prompt;
  const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
  const btnStyle = "display:inline-block;padding:7px 14px;border-radius:8px;text-decoration:none;font-size:0.85em;font-weight:600;cursor:pointer;border:none;margin:0 4px;";

  return `
    <div style="display:flex;justify-content:flex-end;gap:0;flex-wrap:wrap;">
      <a href="${claudeUrl}" target="_blank"
         style="${btnStyle}background:#7c3aed;color:#fff;">🟣 Claude</a>
      <button onclick="openAiSite('https://chatgpt.com/')"
         style="${btnStyle}background:#10a37f;color:#fff;">🟢 ChatGPT</button>
      <button onclick="openAiSite('https://gemini.google.com/')"
         style="${btnStyle}background:#4285f4;color:#fff;">🔵 Gemini</button>
    </div>`;
}

function showAiModal(item, onSave) {
  let modal = document.getElementById("ai-modal");
  if (modal) modal.remove();
  modal = document.createElement("div");
  modal.id = "ai-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;";
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });

  const saved = getNote(item.Ticker);

  const versionOptions = PROMPT_VERSIONS
    .map(v => `<option value="${v.id}"${v.id === getPromptVersion() ? " selected" : ""}>${v.label}</option>`)
    .join("");

  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:28px 32px;min-width:400px;max-width:600px;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <strong style="font-size:1.05em;">🤖 ${item.Ticker} AI 분석</strong>
        <span style="cursor:pointer;font-size:1.3em;" onclick="document.getElementById('ai-modal').remove()">✕</span>
      </div>

      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <label style="font-size:0.82em;color:#666;white-space:nowrap;">프롬프트 버전:</label>
        <select id="prompt-version" style="flex:1;padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.82em;">${versionOptions}</select>
      </div>

      <textarea id="ai-prompt-area" readonly style="width:100%;height:180px;font-size:0.8em;border:1px solid #ddd;border-radius:8px;padding:10px;resize:none;box-sizing:border-box;color:#444;"></textarea>
      <p style="font-size:0.78em;color:#888;margin:6px 0 10px;">Claude는 프롬프트가 자동 입력됩니다. ChatGPT·Gemini는 클립보드에 복사 후 붙여넣기 하세요.</p>
      <div id="ai-buttons-container"></div>

      <hr style="border:none;border-top:1px solid #eee;margin:18px 0;">

      <div style="font-size:0.88em;font-weight:600;color:#444;margin-bottom:8px;">📝 AI 분석 결과 메모 <span style="font-weight:400;color:#aaa;font-size:0.85em;">(붙여넣기 후 저장)</span></div>
      <textarea id="ai-note-area" style="width:100%;height:200px;font-size:0.82em;border:1px solid #ddd;border-radius:8px;padding:10px;resize:vertical;box-sizing:border-box;color:#333;">${saved}</textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
        <button id="ai-note-clear" style="padding:6px 14px;border-radius:8px;border:1px solid #ddd;background:#f5f5f5;color:#666;cursor:pointer;font-size:0.85em;">삭제</button>
        <button id="ai-note-save"  style="padding:6px 14px;border-radius:8px;border:none;background:#4a90d9;color:#fff;cursor:pointer;font-size:0.85em;font-weight:600;">저장</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const refreshPrompt = () => {
    document.getElementById("ai-prompt-area").value      = buildPrompt(item);
    document.getElementById("ai-buttons-container").innerHTML = aiButtons(item);
  };
  refreshPrompt();

  document.getElementById("prompt-version").addEventListener("change", e => {
    setPromptVersion(e.target.value);
    refreshPrompt();
  });

  document.getElementById("ai-note-save").addEventListener("click", () => {
    const text = document.getElementById("ai-note-area").value;
    saveNote(item.Ticker, text);
    if (onSave) onSave();
    modal.remove();
  });

  document.getElementById("ai-note-clear").addEventListener("click", () => {
    document.getElementById("ai-note-area").value = "";
    saveNote(item.Ticker, "");
    if (onSave) onSave();
  });
}

window.openAiSite = function(url) {
  navigator.clipboard.writeText(_aiPrompt).catch(() => {});
  window.open(url, "_blank");
};
