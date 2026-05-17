import { loadMarket } from "./market.js";
import { renderTable, populateSectorFilter, updateResultCount } from "./table.js";
import { sortTable } from "./sort.js";

// ===== 상태 =====
let currentData  = [];
let activeFilter = "all";

// ===== 필터 =====
function setFilter(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  applyFilters();
}

function applyFilters() {
  if (!currentData.length) return;
  const q      = document.getElementById("search-box").value.trim().toLowerCase();
  const sector = document.getElementById("sector-filter").value;

  let filtered = currentData;
  if (q)      filtered = filtered.filter(d => (d.Ticker || "").toLowerCase().includes(q) || (d.Name || "").toLowerCase().includes(q));
  if (sector) filtered = filtered.filter(d => d.Sector === sector);

  if      (activeFilter === "oversold")        filtered = filtered.filter(d => Number(d.RSI) <= 30);
  else if (activeFilter === "warning")         filtered = filtered.filter(d => Number(d.RSI) <= 35);
  else if (activeFilter === "weekly_oversold") filtered = filtered.filter(d => d.WeeklyRSI != null && Number(d.WeeklyRSI) <= 35);
  else if (activeFilter === "dual")            filtered = filtered.filter(d => d.DualOversold);
  else if (activeFilter === "recent7")         filtered = filtered.filter(d => d["최근7일내_RSI30이하"]);

  renderTable(filtered);
}

// ===== 탭 로드 =====
async function loadTab(name, btn) {
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  document.getElementById("search-box").value = "";
  const allChip = document.querySelector(`.chip[data-filter="all"]`);
  setFilter("all", allChip);

  const tbody = document.getElementById("rsi-table-body");
  tbody.innerHTML = `<tr><td colspan="27">⏳ 로딩 중...</td></tr>`;

  try {
    const res = await fetch(`data/${name}.json`);
    if (!res.ok) throw new Error("파일 없음");
    const data = await res.json();
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="27">📭 데이터 없음</td></tr>`;
      currentData = [];
      return;
    }
    currentData = data;
    populateSectorFilter(data);
    renderTable(data);
  } catch {
    tbody.innerHTML = `<tr><td colspan="27">⚠️ 데이터 파일이 없습니다</td></tr>`;
    currentData = [];
  }
}

// ===== 이벤트 바인딩 =====
function bindEvents() {
  // 탭
  document.querySelectorAll(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => loadTab(btn.dataset.tab, btn));
  });

  // 필터칩
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => setFilter(chip.dataset.filter, chip));
  });

  // 검색
  document.getElementById("search-box").addEventListener("input", applyFilters);

  // 섹터 드롭다운
  document.getElementById("sector-filter").addEventListener("change", applyFilters);

  // 테이블 헤더 정렬
  document.querySelectorAll("thead th").forEach((th, i) => {
    th.addEventListener("click", () => sortTable(i));
  });
}

// ===== 초기화 =====
document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadMarket();

  const firstTab = document.querySelector(".tabs button.active");
  if (firstTab) loadTab(firstTab.dataset.tab, firstTab);

  document.querySelector(`.chip[data-filter="all"]`)?.classList.add("active");
});
