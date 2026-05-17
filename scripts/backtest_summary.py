import sys
import json
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

with open(Path(__file__).parent.parent / "data" / "backtest.json", "r", encoding="utf-8") as f:
    data = json.load(f)

results = [(t, d) for t, d in data.items()
           if d.get("events", 0) > 0 and d.get("ret_3m_avg") is not None]
results.sort(key=lambda x: x[1]["ret_3m_avg"], reverse=True)

avgs = [d["ret_3m_avg"] for _, d in results]
wins = [d["ret_3m_winrate"] for _, d in results]

print(f"총 종목: {len(data)}개  |  진입 있는 종목: {len(results)}개")
print(f"전체 3M 평균수익: {sum(avgs)/len(avgs):+.2f}%  |  평균승률: {sum(wins)/len(wins):.1f}%")
print()

print("=== 3M 평균수익 Top 15 ===")
print(f"{'종목':6s}  {'진입':>4s}  {'3M평균':>8s}  {'승률':>6s}  {'1M평균':>8s}  {'1M승률':>6s}")
print("-" * 55)
for t, d in results[:15]:
    print(f"{t:6s}  {d['events']:4d}건  {d['ret_3m_avg']:+7.1f}%  {d['ret_3m_winrate']:5.1f}%  "
          f"{d.get('ret_1m_avg') or 0:+7.1f}%  {d.get('ret_1m_winrate') or 0:5.1f}%")

print()
print("=== 3M 평균수익 Bottom 10 ===")
print(f"{'종목':6s}  {'진입':>4s}  {'3M평균':>8s}  {'승률':>6s}")
print("-" * 35)
for t, d in results[-10:]:
    print(f"{t:6s}  {d['events']:4d}건  {d['ret_3m_avg']:+7.1f}%  {d['ret_3m_winrate']:5.1f}%")

low = sum(1 for _, d in data.items() if 0 < d.get("events", 0) < 5)
print(f"\n⚠️  진입 5건 미만 (신뢰도 낮음): {low}개")