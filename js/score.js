// 배점: 백테스트3M승률(40) + Forward PER저평가(25) + EPS성장(20) + 매출YoY(15)
// RSI는 진입 조건이므로 점수에서 제외 — 저평가+우상향 가능성만 평가
export function calcScore(item) {
  let score   = 0;
  let maxScore = 0; // 데이터 있는 항목만 분모로

  // --- 백테스트 3M 승률 (40점) ---
  const bt3m    = Number(item.BT_3M_Avg);
  const bt3mWin = Number(item.BT_3M_Win);
  if (!isNaN(bt3m) && !isNaN(bt3mWin)) {
    maxScore += 40;
    if      (bt3m >= 10 && bt3mWin >= 70) score += 40;
    else if (bt3m >= 7  && bt3mWin >= 60) score += 32;
    else if (bt3m >= 4  && bt3mWin >= 55) score += 24;
    else if (bt3m > 0   && bt3mWin >= 50) score += 16;
    else if (bt3m > 0)                    score += 8;
  }

  // --- Forward PER 저평가 (25점) ---
  const fwdPer = Number(item["PER(예상)"]);
  if (!isNaN(fwdPer) && fwdPer > 0) {
    maxScore += 25;
    if      (fwdPer < 12) score += 25;
    else if (fwdPer < 17) score += 20;
    else if (fwdPer < 22) score += 14;
    else if (fwdPer < 28) score += 8;
    else if (fwdPer < 40) score += 3;
  }

  // --- EPS 성장 (20점) ---
  const epsG = Number(item.EPS_Growth);
  if (!isNaN(epsG)) {
    maxScore += 20;
    if      (epsG >= 30) score += 20;
    else if (epsG >= 15) score += 15;
    else if (epsG >= 5)  score += 10;
    else if (epsG >= 0)  score += 4;
  }

  // --- 매출 YoY (15점) ---
  const revYoy = Number(item.Revenue_YoY);
  if (!isNaN(revYoy)) {
    maxScore += 15;
    if      (revYoy >= 20) score += 15;
    else if (revYoy >= 10) score += 11;
    else if (revYoy >= 5)  score += 7;
    else if (revYoy > 0)   score += 3;
  }

  // 데이터 없는 항목은 제외하고 100점 만점으로 환산
  if (maxScore === 0) return 0;
  return Math.round(Math.min(100, (score / maxScore) * 100));
}

export function scoreLabel(score) {
  if (score >= 75) return { text: "🟢 강력매수", style: "background:rgba(46,160,67,0.55);color:#fff;font-weight:700;" };
  if (score >= 60) return { text: "🔵 매수",     style: "background:rgba(30,100,220,0.45);color:#fff;font-weight:700;" };
  if (score >= 45) return { text: "🟡 관심",     style: "background:rgba(220,180,40,0.45);color:#1a1a1a;font-weight:600;" };
  if (score >= 30) return { text: "⚪ 중립",     style: "" };
  return               { text: "🔴 주의",        style: "background:rgba(220,60,60,0.3);color:#a8071a;" };
}
