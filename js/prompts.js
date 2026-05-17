const LS_KEY = "rsi_prompt_version";

// ── helpers ──────────────────────────────────────────
const n   = v => (v != null && !isNaN(v)) ? v : "데이터없음";
const pct = v => (v != null && !isNaN(v)) ? `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(1)}%` : "데이터없음";
const arr = a => (Array.isArray(a) && a.length) ? a.join(", ") : "데이터없음";

// ──────────────────────────────────────────────────────
// v2 — 상세 분석 (표·등급·DCA·목표가) ★ 최신
// ──────────────────────────────────────────────────────
function buildPromptV2(item) {
  const dual    = item.DualOversold ? " ⚠️ 일·주봉 쌍과매도" : "";
  const rsiTag  = item["RSI_30이하"] ? " (≤30 과매도)" : item["RSI_30초과_35이하"] ? " (≤35 경계)" : "";
  const recent7 = item["최근7일내_RSI30이하"] ? "🕐 최근 7일 내 ≤30 발생" : "해당없음";
  const earningsLine = item.EarningsDate
    ? `★ 다음 실적 발표 예정일: ${item.EarningsDate}`
    : "★ 다음 실적 발표 예정일: 데이터없음";

  return `[종목명: ${item.Ticker} (${item.Name}) RSI 매매 관점 심층 분석 요청]

현재가: $${n(item.Price)} (일변동 ${pct(item.DayChangePct)})
52주 위치: ${item.Pos52w != null ? item.Pos52w + "%" : "데이터없음"} | 거래량 비율: ${item.VolRatio != null ? item.VolRatio + "x" : "데이터없음"}
섹터: ${item.Sector}
${earningsLine}

📊 RSI 현황
- 일 RSI: ${n(item.RSI)}${rsiTag}
- 주 RSI: ${n(item.WeeklyRSI)}${dual}
- 최근 7일 과매도 여부: ${recent7}

📈 일 RSI 최근 30일 추세
${arr(item.RSI_Series)}

📈 주 RSI 최근 30주 추세
${arr(item.WeeklyRSI_Series)}

📈 성장성
- EPS 성장: ${pct(item.EPS_Growth)}
- 매출 YoY: ${pct(item.Revenue_YoY)}

💰 밸류에이션
- Forward PER: ${n(item["PER(예상)"])} | PER: ${n(item.PER)}
- PBR: ${n(item.PBR)} | ROE: ${item.ROE != null ? (item.ROE * 100).toFixed(1) + "%" : "데이터없음"}
- EPS: $${n(item.EPS)} | Forward EPS: $${n(item["EPS(예상)"])}

🧪 백테스트 (RSI≤30 진입 기준, 과거 5년)
- 1M: 평균 ${n(item.BT_1M_Avg)}%, 승률 ${n(item.BT_1M_Win)}%
- 3M: 평균 ${n(item.BT_3M_Avg)}%, 승률 ${n(item.BT_3M_Win)}% (진입 ${n(item.BT_Events)}건)

═══════════════════════════════════════════
위 데이터로 'RSI 30 돌파 매매 전략' 관점에서 심층 분석해 주세요. 질문을 쪼개지 말고 아래 6개 섹션 + 종합 결론을 한 번에 작성해주세요.

1. 진입 시그널 강도 (★ 5단계 평가)
- 표로 정리: 일RSI, 주RSI, 쌍과매도, 52주위치, 최근7일 과매도 여부
- RSI 시리즈 흐름 해석: 며칠간 어디 머물렀는지, 지금 30 돌파 시도 중인지 명확히 짚어주세요

2. 펀더멘탈 (★ 5단계 평가)
- EPS/매출/PER을 표로 정리
- 이상치 자동 해석: 마이너스 PBR·음수 EPS·null ROE 등이 있으면 그 원인이 자사주매입·업종특성·일회성 회계인지 분석해 '노이즈'인지 '진짜 위험'인지 명확히 구분해 주세요

3. 백테스트 신뢰도 (★ 5단계 평가)
- 진입 건수가 5건 이상인지 확인 (이하면 통계적 유의성 낮음 명시)
- 1M vs 3M 수익률 차이 해석 (단기 변동성 / 인내 필요 여부)

4. DCA 3차 진입 시나리오
- 표 형식: 회차 | 진입가 | RSI 조건 | 자본 비중
- 평균 단가 계산
- 1차는 현재가 / 2·3차는 -5%~-12% 추가 하락 가격 추정

5. 목표가 산정 (3가지 시나리오)
- Forward EPS × PER로 계산
- 보수(역사적 PER 하단) / 적정(5년 평균) / 낙관(정상회복)
- 표 형식: PER배수 | 목표가 | 상승률
- 12개월 목표가 명시

6. 리스크 요인 (번호 매겨서 3~5개)
- 섹터·매크로·종목 고유 리스크 분리
- 실적 발표일 임박 여부 점검

7. 🎯 종합 결론 (블록 인용 형식)
> 투자의견: 강력매수/매수/보유/매도
> 타점: 구체적 가격
> 목표가: 12개월 $XXX (+XX%)
> 보유 기간: X개월 이상
> 손절선: 있음/없음 + 가격
> 포지션 크기: 포트폴리오 X% 권장

[톤]
- 표·헤더·이모지로 시각적 계층 명확히
- "데이터없음"인 항목도 누락 말고 그 의미 설명
- 노이즈와 진짜 위험 신호 구분
- 두루뭉술한 표현 금지 ("어느 정도", "약간" 등 지양, 구체 숫자로)`;
}

// ──────────────────────────────────────────────────────
// v1 — 표준 분석 (4섹션)
// ──────────────────────────────────────────────────────
function buildPromptV1(item) {
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

// ──────────────────────────────────────────────────────
// 버전 레지스트리 (최신순)
// ──────────────────────────────────────────────────────
export const PROMPT_VERSIONS = [
  { id: "v2", label: "v2 — 상세 분석 (표·등급·DCA·목표가)", builder: buildPromptV2 },
  { id: "v1", label: "v1 — 표준 분석 (4섹션)",              builder: buildPromptV1 },
];

export const DEFAULT_PROMPT_ID = "v2";

export function getPromptVersion() {
  const id = localStorage.getItem(LS_KEY) || DEFAULT_PROMPT_ID;
  return PROMPT_VERSIONS.some(v => v.id === id) ? id : DEFAULT_PROMPT_ID;
}

export function setPromptVersion(id) {
  localStorage.setItem(LS_KEY, id);
}

export function buildPrompt(item) {
  const id  = getPromptVersion();
  const ver = PROMPT_VERSIONS.find(v => v.id === id) || PROMPT_VERSIONS[0];
  return ver.builder(item);
}
