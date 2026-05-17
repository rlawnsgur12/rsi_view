# RSI Viewer — 프로젝트 구조 가이드

## 개요

미국 주식 RSI 과매도(≤30) 반등 전략을 위한 모니터링 도구.  
매일 자동으로 데이터를 수집하고 GitHub Pages로 정적 웹앱을 제공한다.

---

## 투자 전략

- **진입 신호**: 일봉 또는 주봉 RSI가 30 이하에서 30 돌파하는 양봉
- **보조 지표**: EPS 성장률, 매출 YoY, Forward PER, 백테스트 승률
- **종합의견**: RSI신호(40) + 백테스트3M(25) + EPS성장(20) + Forward PER(10) + 매출성장(5) = 100점 만점

---

## 폴더 구조

```
rsi_view/
├── index.html               # 메인 페이지
├── style.css                # 스타일
│
├── js/                      # 프론트엔드 모듈 (ES Modules)
│   ├── app.js               # 진입점 — 상태, 탭 로드, 이벤트 바인딩
│   ├── table.js             # 테이블 렌더링
│   ├── filters.js           # (app.js 내 통합)
│   ├── sort.js              # 컬럼 정렬
│   ├── market.js            # 시장 지표 위젯
│   ├── sparkline.js         # RSI 스파크라인 SVG
│   ├── score.js             # 종합의견 점수 계산
│   ├── formatters.js        # 숫자/퍼센트 포맷 함수
│   └── colors.js            # 셀 배경색 함수
│
├── scripts/                 # 데이터 수집 Python 스크립트
│   ├── update_stocks.py     # RSI + 재무지표 수집 → data/*.json 생성 (매일 실행)
│   ├── generate_pages.py    # 종목별 재무 HTML 페이지 생성 → stocks/*.html
│   ├── backtest.py          # RSI≤30 진입 백테스트 → data/backtest.json (주 1회)
│   └── utils.py             # 공통 유틸 (compute_rsi_ema, load_ticker_map)
│
├── tickers_info/            # 종목 설정 (수동 관리)
│   ├── top100.json          # Top 1~100 종목 {Ticker: {Name, Sector}}
│   ├── top101_200.json      # Top 101~200 종목
│   └── custom.json          # 관심 종목 (직접 추가)
│
├── data/                    # 자동 생성 데이터 (git 추적, CI가 덮어씀)
│   ├── top100.json          # update_stocks.py 출력
│   ├── top101_200.json      # update_stocks.py 출력
│   ├── custom.json          # update_stocks.py 출력
│   ├── market.json          # 시장 지표 (SPY, QQQ, DIA, IWM)
│   └── backtest.json        # backtest.py 출력
│
├── stocks/                  # 자동 생성 재무 페이지 (git 추적, CI가 덮어씀)
│   ├── TICKER.html          # 종목별 분기/연간 재무 + 차트
│   └── TICKER_chart.json    # 차트용 데이터
│
└── .github/workflows/
    └── update-rsi.yml       # 매일 06:00 KST 자동 실행
```

---

## 데이터 흐름

```
tickers_info/*.json
        │
        ▼
scripts/update_stocks.py  ──────────────▶  data/top100.json
        │                                  data/top101_200.json
        │                                  data/custom.json
        │
scripts/generate_pages.py ──────────────▶  stocks/TICKER.html
                                            stocks/TICKER_chart.json

scripts/backtest.py       ──────────────▶  data/backtest.json
        │
        └─ (주 1회 수동 실행 권장)
```

---

## 로컬 개발

```bash
# 서버 실행 (fetch() 때문에 파일 직접 열기 불가)
python -m http.server 8080
# → http://localhost:8080

# 데이터 수집 (scripts/ 디렉터리에서 실행)
cd scripts
python update_stocks.py       # RSI + 재무지표
python generate_pages.py      # 종목별 HTML 페이지

# 백테스트 (시간 오래 걸림, 주 1회 권장)
python backtest.py
```

---

## 종목 추가 방법

`tickers_info/top100.json` (또는 `custom.json`)에 아래 형식으로 추가:

```json
{
  "TICKER": { "Name": "회사명", "Sector": "섹터명" }
}
```

---

## CI/CD

GitHub Actions (`update-rsi.yml`)가 매일 06:00 KST에:
1. `scripts/update_stocks.py` 실행 → `data/*.json` 갱신
2. `scripts/generate_pages.py` 실행 → `stocks/*.html` 갱신
3. 변경사항 자동 커밋 & 푸시 → GitHub Pages 반영
