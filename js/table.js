import { fmt, fmtPct, fmtPos, fmtGrowth, fmtBacktest } from "./formatters.js";
import { rsiColor, changeColor, posColor, volColor, growthColor, btColor } from "./colors.js";
import { calcScore, scoreLabel, calcScoreBreakdown } from "./score.js";
import { renderSparkline } from "./sparkline.js";
import { isWatched, toggleWatchlist } from "./watchlist.js";

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
    aiTd.innerHTML = `<span style="cursor:pointer;font-size:1.1em;" title="AI 분석">🤖</span>`;
    aiTd.addEventListener("click", () => showAiModal(item));
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

function buildPrompt(item) {
  const n   = v => (v != null && !isNaN(v)) ? v : "데이터없음";
  const pct = v => (v != null && !isNaN(v)) ? `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(1)}%` : "데이터없음";
  const dual = item.DualOversold ? " ⚠️ 일·주봉 쌍과매도" : "";
  const earningsLine = item.EarningsDate
    ? `★ 다음 실적 발표 예정일: ${item.EarningsDate}`
    : "★ 다음 실적 발표 예정일: 데이터없음";

  return `[종목명: ${item.Ticker} (${item.Name}) 매수 검토 요청]

현재가: $${n(item.Price)} (일변동 ${pct(item.DayChangePct)})
52주 위치: ${item.Pos52w != null ? item.Pos52w + "%" : "데이터없음"} | 거래량 비율: ${item.VolRatio != null ? item.VolRatio + "x" : "데이터없음"}
섹터: ${item.Sector}
${earningsLine}

📊 RSI 현황
- 일 RSI: ${n(item.RSI)}${item["RSI_30이하"] ? " (≤30 과매도)" : item["RSI_30초과_35이하"] ? " (≤35 경계)" : ""}
- 주 RSI: ${n(item.WeeklyRSI)}${dual}

📈 성장성
- EPS 성장: ${pct(item.EPS_Growth)}
- 매출 YoY: ${pct(item.Revenue_YoY)}

💰 밸류에이션
- Forward PER: ${n(item["PER(예상)"])} | PER: ${n(item.PER)}
- PBR: ${n(item.PBR)} | ROE: ${item.ROE != null ? (item.ROE * 100).toFixed(1) + "%" : "데이터없음"}

🧪 백테스트 (RSI≤30 진입 기준, 과거 5년)
- 1M: 평균 ${n(item.BT_1M_Avg)}%, 승률 ${n(item.BT_1M_Win)}%
- 3M: 평균 ${n(item.BT_3M_Avg)}%, 승률 ${n(item.BT_3M_Win)}% (진입 ${n(item.BT_Events)}건)

위 데이터를 바탕으로 아래 가이드라인에 맞춰 투자 가치를 '심층 분석 리포트' 형식으로 작성해 주세요. 질문을 쪼개지 말고 한 번에 결론 위주로 상세히 분석해 주시기 바랍니다.

1. 밸류에이션 및 저평가 여부 판단 (착시 지표 자동 필터링)
- 제공된 지표 중 특이사항(예: 마이너스 PBR, 음수 EPS, 극단적인 PER 등)이 있다면, 이를 단순 부실 위험으로 보지 말고 '자사주 매입/소각'이나 '업종별 회계 특성' 등 실질적인 원인을 파악해 착시 현상인지 분석해 주세요.
- 과거 평균 밸류에이션 밴드 및 이익 성장성 대비 현재 주가가 진성 저평가 구간인지 펀더멘탈 결론을 내려주세요.

2. RSI 과매도 반등 전략의 유효성 타점 분석
- 일봉/주봉 RSI 현황과 과거 5년 백테스트 데이터를 결합하여, 현재 진입 시 승률과 적절한 보유 기간(또는 분할 매수 전략)을 통계적으로 짚어주세요.

3. 실적 발표일 연계 일정 매매 전략 ★
- 다가오는 실적 발표일을 기준으로, 발표 전 '기대감 선반영 분할 진입'이 유리한지 아니면 '실적 확인 후 불확실성 해소 진입'이 유리한지 최근 가이던스 트렌드와 결합하여 행동 지침을 주세요. 실적 발표 전후 예상되는 단기 변동성 대응 방안도 포함해 주세요.

4. 1년 뒤 주가 전망 및 매크로 결합 최종 의견
- 향후 이익 전망(Forward 지표)과 최근 섹터 트렌드, 리스크 요인을 종합하여 1년 시계열에서의 상승 가능성을 확률적으로 예측해 주세요.
- 최종 결론은 투자의견(강력매수/매수/보유/매도)과 타점, 실적 발표일 대응 팁을 요약한 '종합 의견' 블록으로 명확하게 마무리해 주세요.`;
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

function showAiModal(item) {
  let modal = document.getElementById("ai-modal");
  if (modal) modal.remove();
  modal = document.createElement("div");
  modal.id = "ai-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;";
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });

  const prompt = buildPrompt(item);
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:28px 32px;min-width:400px;max-width:560px;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <strong style="font-size:1.05em;">🤖 ${item.Ticker} AI 분석</strong>
        <span style="cursor:pointer;font-size:1.3em;" onclick="document.getElementById('ai-modal').remove()">✕</span>
      </div>
      <textarea readonly style="width:100%;height:220px;font-size:0.8em;border:1px solid #ddd;border-radius:8px;padding:10px;resize:none;box-sizing:border-box;color:#444;">${prompt}</textarea>
      <p style="font-size:0.78em;color:#888;margin:8px 0 14px;">Claude는 프롬프트가 자동 입력됩니다. ChatGPT·Gemini는 클립보드에 복사 후 붙여넣기 하세요.</p>
      ${aiButtons(item)}
    </div>`;
  document.body.appendChild(modal);
}

window.openAiSite = function(url) {
  navigator.clipboard.writeText(_aiPrompt).catch(() => {});
  window.open(url, "_blank");
};
