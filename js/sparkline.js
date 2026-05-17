export function renderSparkline(series, opts = {}) {
  if (!Array.isArray(series) || series.length < 2) return "";
  const width  = opts.width  || 110;
  const height = opts.height || 32;
  const padX = 2, padY = 3;
  const innerW = width  - padX * 2;
  const innerH = height - padY * 2;
  const n = series.length;

  const xAt = (i) => padX + (i / (n - 1)) * innerW;
  const yAt = (v) => padY + (1 - v / 100) * innerH;

  const y30 = yAt(30);
  const y70 = yAt(70);
  const path = series.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");

  const dots = series.map((v, i) => {
    if (v <= 30) return `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="1.8" fill="#1e64dc"/>`;
    if (v >= 70) return `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="1.8" fill="#dc3c3c"/>`;
    return "";
  }).join("");

  const lastV     = series[series.length - 1];
  const lastColor = lastV <= 30 ? "#1e64dc" : (lastV >= 70 ? "#dc3c3c" : "#666");

  return `<svg class="spark" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <line x1="${padX}" y1="${y30.toFixed(1)}" x2="${width - padX}" y2="${y30.toFixed(1)}" stroke="#bcd2f0" stroke-dasharray="2,2" stroke-width="0.8"/>
    <line x1="${padX}" y1="${y70.toFixed(1)}" x2="${width - padX}" y2="${y70.toFixed(1)}" stroke="#f0bcbc" stroke-dasharray="2,2" stroke-width="0.8"/>
    <path d="${path}" fill="none" stroke="${lastColor}" stroke-width="1.4"/>
    ${dots}
    <circle cx="${xAt(n-1).toFixed(1)}" cy="${yAt(lastV).toFixed(1)}" r="2.4" fill="${lastColor}"/>
  </svg>`;
}
