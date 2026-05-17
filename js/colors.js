export function rsiColor(rsi) {
  if (rsi === null || rsi === undefined || isNaN(rsi)) return "";
  const v = Math.max(0, Math.min(100, Number(rsi)));
  let bg, fg = "#fff";
  if (v <= 30)       { bg = `rgba(30,100,220,${0.7 + (30 - v) / 100})`; }
  else if (v <= 45)  { bg = "rgba(100,150,230,0.4)"; fg = "#1a1a1a"; }
  else if (v < 55)   { bg = "transparent"; fg = "#333"; }
  else if (v <= 70)  { bg = "rgba(240,150,100,0.4)"; fg = "#1a1a1a"; }
  else               { bg = `rgba(220,60,60,${0.6 + (v - 70) / 100})`; }
  return `background:${bg};color:${fg};font-weight:600;`;
}

export function changeColor(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return "";
  const n = Number(pct);
  if (n > 0) return "color:#c0392b;font-weight:600;";
  if (n < 0) return "color:#1f6feb;font-weight:600;";
  return "";
}

export function posColor(pos) {
  if (pos === null || pos === undefined || isNaN(pos)) return "";
  const n = Number(pos);
  if (n <= 20) return "background:rgba(30,100,220,0.5);color:#fff;font-weight:600;";
  if (n <= 40) return "background:rgba(100,150,230,0.3);";
  if (n >= 80) return "background:rgba(220,60,60,0.4);color:#fff;";
  return "";
}

export function volColor(ratio) {
  if (ratio === null || ratio === undefined || isNaN(ratio)) return "";
  const n = Number(ratio);
  if (n >= 2.0) return "background:rgba(220,140,40,0.5);color:#fff;font-weight:700;";
  if (n >= 1.5) return "background:rgba(240,180,80,0.4);font-weight:600;";
  return "";
}

export function growthColor(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return "";
  const n = Number(pct);
  if (n >= 20) return "background:rgba(46,160,67,0.5);color:#fff;font-weight:700;";
  if (n >= 10) return "background:rgba(46,160,67,0.3);font-weight:600;";
  if (n > 0)   return "color:#2ea043;font-weight:600;";
  if (n < 0)   return "background:rgba(220,60,60,0.25);color:#a8071a;font-weight:600;";
  return "";
}

export function btColor(avg, winrate) {
  if (avg === null || avg === undefined || isNaN(avg)) return "";
  const a = Number(avg);
  const w = winrate !== null && winrate !== undefined ? Number(winrate) : 0;
  if (a >= 5 && w >= 70) return "background:rgba(46,160,67,0.55);color:#fff;font-weight:700;";
  if (a >= 3 && w >= 60) return "background:rgba(46,160,67,0.3);font-weight:600;";
  if (a > 0)             return "color:#2ea043;font-weight:600;";
  if (a <= -5)           return "background:rgba(220,60,60,0.5);color:#fff;font-weight:700;";
  if (a < 0)             return "background:rgba(220,60,60,0.2);color:#a8071a;font-weight:600;";
  return "";
}
