// 배점: RSI신호(40) + 백테스트3M(25) + EPS성장(20) + Forward PER(10) + 매출성장(5)
export function calcScore(item) {
  let score = 0;

  const rsi  = Number(item.RSI);
  const wRsi = Number(item.WeeklyRSI);
  if (item.DualOversold)                          score += 40;
  else if (rsi <= 30)                             score += 32;
  else if (!isNaN(wRsi) && wRsi <= 30)            score += 28;
  else if (rsi <= 35 || item["최근7일내_RSI30이하"]) score += 22;
  else if (!isNaN(wRsi) && wRsi <= 35)            score += 15;

  const bt3m    = Number(item.BT_3M_Avg);
  const bt3mWin = Number(item.BT_3M_Win);
  if (!isNaN(bt3m)) {
    if      (bt3m >= 10 && bt3mWin >= 70) score += 25;
    else if (bt3m >= 5  && bt3mWin >= 60) score += 20;
    else if (bt3m >= 3)                   score += 15;
    else if (bt3m > 0)                    score += 10;
  }

  const epsG = Number(item.EPS_Growth);
  if (!isNaN(epsG)) {
    if      (epsG >= 30) score += 20;
    else if (epsG >= 15) score += 15;
    else if (epsG >= 5)  score += 10;
    else if (epsG >= 0)  score += 5;
  }

  const fwdPer = Number(item["PER(예상)"]);
  if (!isNaN(fwdPer) && fwdPer > 0) {
    if      (fwdPer < 15) score += 10;
    else if (fwdPer < 20) score += 8;
    else if (fwdPer < 25) score += 5;
    else if (fwdPer < 35) score += 3;
    else                  score += 1;
  }

  const revYoy = Number(item.Revenue_YoY);
  if (!isNaN(revYoy)) {
    if      (revYoy >= 15) score += 5;
    else if (revYoy >= 5)  score += 3;
    else if (revYoy > 0)   score += 1;
  }

  return Math.min(100, score);
}

export function scoreLabel(score) {
  if (score >= 75) return { text: "🟢 강력매수", style: "background:rgba(46,160,67,0.55);color:#fff;font-weight:700;" };
  if (score >= 60) return { text: "🔵 매수",     style: "background:rgba(30,100,220,0.45);color:#fff;font-weight:700;" };
  if (score >= 45) return { text: "🟡 관심",     style: "background:rgba(220,180,40,0.45);color:#1a1a1a;font-weight:600;" };
  if (score >= 30) return { text: "⚪ 중립",     style: "" };
  return               { text: "🔴 주의",        style: "background:rgba(220,60,60,0.3);color:#a8071a;" };
}
