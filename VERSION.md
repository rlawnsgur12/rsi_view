# VERSION

## v1
화면 : Github Page
배치 : Github Action
기능
- RSI 기능 지표

## v1.1
requirements로 패키지 변경하도록 변경 수행

## v2
per, pbr, roe, eps 지표 추가

## v3
티커별 상세 페이지 추가

## v4
재무정보 비교 그래프 추가(Plotly)

### v4.1
Git Ignore 추가, 차트 화면 고정, 차트 표시 수정, 표 정렬 수정, github action 추가

### v5
탭 추가, 탭 추가에 따른 공통화

### v6
name, sector 추가, 정렬 기능 수정
#### v6.1
rsi 비교 컬럼 길이 강제 할당

### v6
tradingview 차트 링크 추가, 앱으로 이동 변경

### v7
일일 RSI 자동 업데이트 안정화

### v10
투자 참고도 강화 (Phase A — Quick wins)
- 시세 컬럼 추가: 현재가, 일변동률, 52주 위치, 거래량 비율(20일 대비)
- 시장 벤치마크 위젯 추가 (SPY/QQQ/DIA/IWM RSI를 상단 고정)
- RSI 색상 그라데이션 (과매도 파랑 ↔ 과매수 빨강)
- 일변동률/52주위치/거래량비율 색상 강조
- 검색바: 티커/종목명 실시간 검색
- 필터 칩: 전체/RSI≤30/RSI≤35/최근7일 과매도
- 섹터 필터 드롭다운
- 결과 개수 표시
- 모바일 반응형 (768px 미만)
- 헤더 sticky 처리

# 추가 필요 요구사항
python 64bit -> pandas 설치