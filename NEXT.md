# 다음 작업 목록

## 1. RSI 30 돌파 감지 (`RSICrossUp`)
**우선순위: 높음**

현재는 "RSI ≤ 30이었음" 만 표시. 실제 진입 트리거인 "30 위로 돌파한 시점"이 없음.

- `update_stocks.py`에 `RSICrossUp` 필드 추가
  - 값: 오늘 돌파 = `0`, 어제 돌파 = `1`, ... , 아직 30 이하거나 돌파 안 됨 = `null`
- 테이블에 "🚀 D+N" 형태로 표시 (D+0 = 오늘 돌파)
- 필터 칩 추가: "오늘 돌파" / "최근 3일 돌파"


## 2. 섹터 ETF RSI
**우선순위: 높음**

종목 RSI가 30이어도 섹터 자체가 약하면 의미 다름.

- 섹터별 대표 ETF 매핑 추가
  ```
  Technology    → XLK
  Financials    → XLF
  Energy        → XLE
  Health Care   → XLV
  Consumer Disc → XLY
  Industrials   → XLI
  Utilities     → XLU
  Materials     → XLB
  Real Estate   → XLRE
  Communication → XLC
  Staples       → XLP
  ```
- `update_stocks.py`에서 각 섹터 ETF RSI 계산 → `data/sector_rsi.json` 저장
- 테이블에 "섹터 RSI" 컬럼 또는 종목 행에 배지 표시
- AI 프롬프트 v3에 섹터 ETF RSI 포함


## 3. 200일선 위/아래 표시 (`Above200MA`)
**우선순위: 중간**

사용자가 직접 보고 판단하는 용도. 주봉 RSI 돌파 전략에서 보조 필터로 활용 가능.

- `update_stocks.py`에 `Above200MA` 필드 추가 (Boolean)
- 테이블에 `📈` / `📉` 또는 배경색으로 표시
- 필터 칩 추가: "200일선 위" 옵션


## 4. 실적 발표 임박 경고 (`EarningsInDays`)
**우선순위: 중간**

실적 D-7 이내 진입은 리스크가 높음.

- `update_stocks.py`에 `EarningsInDays` 필드 추가 (정수, 없으면 null)
- 테이블에 7일 이내면 🚨 배지 표시
- AI 프롬프트에 자동 포함 (EarningsDate 있으니 계산만 추가)


## 5. 백테스트 최소 이벤트 필터
**우선순위: 중간**

현재 events 2~3건짜리 100% 승률이 종합의견 점수에 그대로 반영됨.

- `score.js`에서 `BT_Events < 5`이면 백테스트 항목(40점) 0점 처리
- events 수 낮으면 회색/경고 스타일 표시


## 6. 백테스트 최대 손실폭 (`BT_MaxDD`)
**우선순위: 낮음**

DCA 2·3차 진입 가격 결정에 통계적 근거 필요.

- `backtest.py`에 진입 후 보유 기간 내 최대 하락폭(MDD) 계산 추가
- "평균 진입 후 -X%까지 빠짐" → 2차/3차 분할 기준 제시 가능
- AI 프롬프트 v3에 포함
