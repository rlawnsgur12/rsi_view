export function fmt(val) {
  if (val === null || val === undefined || val === "") return "";
  if (isNaN(val)) return val;
  return Number(val).toFixed(2);
}

export function fmtPct(val) {
  if (val === null || val === undefined || val === "") return "";
  const n = Number(val);
  if (isNaN(n)) return "";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function fmtPos(val) {
  if (val === null || val === undefined || val === "") return "";
  const n = Number(val);
  if (isNaN(n)) return "";
  return `${n.toFixed(1)}%`;
}

export function fmtGrowth(val) {
  if (val === null || val === undefined || val === "") return "";
  const n = Number(val);
  if (isNaN(n)) return "";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function fmtBacktest(avg, winrate, events) {
  if (avg === null || avg === undefined || isNaN(avg)) return "";
  const a = Number(avg);
  const w = winrate !== null && winrate !== undefined && !isNaN(winrate) ? Number(winrate) : null;
  const avgStr = `${a > 0 ? "+" : ""}${a.toFixed(1)}%`;
  const winStr = w !== null ? `${w.toFixed(0)}%` : "-";
  const nStr = events ? `<span class="bt-n">N=${events}</span>` : "";
  return `<div class="bt-cell"><span class="bt-avg">${avgStr}</span><span class="bt-sep">/</span><span class="bt-win">${winStr}</span>${nStr}</div>`;
}
