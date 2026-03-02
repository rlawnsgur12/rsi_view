// script.js

// 🔹 숫자 포맷 함수 (🔴 추가)
function fmt(val) {
  if (val === null || val === undefined || val === "") return "";
  if (isNaN(val)) return val;          // 문자열(✅ 등)
  return Number(val).toFixed(2);       // 숫자 → 소수 2자리
}

async function loadTab(name, btn) {

  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  const tbody = document.getElementById("rsi-table-body");
  tbody.innerHTML = "";

  try {
    const res = await fetch(`data/${name}.json`);

    if (!res.ok) throw new Error("파일 없음");

    const data = await res.json();

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="14">📭 데이터 없음</td></tr>`;
      return;
    }

    data.forEach(item => {
      const row = document.createElement("tr");

      const cols = [
        "Ticker",
        "Name",       // 추가
        "Sector",     // 추가
        "Chart",
        "RSI",
        "RSI_30이하",
        "RSI_30초과_35이하",
        "최근7일내_RSI30이하",
        "PER",
        "PER(예상)",
        "PBR",
        "ROE",
        "EPS",
        "EPS(예상)"
      ];

      cols.forEach(col => {
        const cell = document.createElement("td");
        if (col === "Ticker" || col === "Name") {
          const link = document.createElement("a");
          link.href = `./stocks/${item.Ticker}.html`;
          link.textContent = item[col];
          link.classList.add("ticker-link");
          link.style.textDecoration = "none";
          link.style.color = "inherit";
          cell.appendChild(link);
        } else if (col === "Chart") {

          const tvLink = document.createElement("a");
          const symbol = item.Ticker;
        
          //tvLink.href = `https://www.tradingview.com/chart/?symbol=${symbol}`;
          tvLink.href = `https://www.tradingview.com/symbols/${symbol}/`;
          tvLink.target = "_blank";
          tvLink.textContent = "📈";
          tvLink.style.textDecoration = "none";
        
          cell.appendChild(tvLink);
        } else {
          cell.textContent = fmt(item[col]);
        }

        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });

  } catch (err) {
    console.warn(`${name}.json 없음`);
    tbody.innerHTML = `<tr><td colspan="14">⚠️ 데이터 파일이 없습니다</td></tr>`;
  }
}




// 기본 첫 탭 로드
loadTab("rsi_data", document.querySelector(".tabs button.active"));

// fetch("data/rsi_data.json")
//   .then(response => response.json())
//   .then(data => {
//     const tbody = document.getElementById("rsi-table-body");

//     data.forEach(item => {
//       const row = document.createElement("tr");

//       // // Ticker
//       // const tickerCell = document.createElement("td");
//       // tickerCell.textContent = item.Ticker;
//       // row.appendChild(tickerCell);
//       // Ticker (클릭 시 상세 페이지 이동)
//       const tickerCell = document.createElement("td");

//       const ticker = item.Ticker;
//       const link = document.createElement("a");
//       link.href = `./stocks/${ticker}.html`;
//       link.textContent = ticker;
//       link.classList.add("ticker-link");
//       link.style.textDecoration = "none";
//       link.style.color = "inherit"; // 기존 색상 유지

//       tickerCell.appendChild(link);
//       row.appendChild(tickerCell);

//       // RSI
//       const rsiCell = document.createElement("td");
//       rsiCell.textContent = item.RSI;
//       // flag 색상 적용
//       if(item.flag === "low") rsiCell.style.color = "blue";
//       else if(item.flag === "warn") rsiCell.style.color = "orange";
//       row.appendChild(rsiCell);

//       // RSI_30이하
//       const rsi30Cell = document.createElement("td");
//       rsi30Cell.textContent = item["RSI_30이하"];
//       row.appendChild(rsi30Cell);

//       // RSI_30초과_35이하
//       const rsi30_35Cell = document.createElement("td");
//       rsi30_35Cell.textContent = item["RSI_30초과_35이하"];
//       row.appendChild(rsi30_35Cell);

//       // 최근7일내_RSI30이하
//       const recentCell = document.createElement("td");
//       recentCell.textContent = item["최근7일내_RSI30이하"];
//       row.appendChild(recentCell);

//       // PER
//       const perCell = document.createElement("td");
//       perCell.textContent = fmt(item["PER"]);
//       row.appendChild(perCell);

//       // PER(예상)
//       const fwdPerCell = document.createElement("td");
//       fwdPerCell.textContent = fmt(item["PER(예상)"]);
//       row.appendChild(fwdPerCell);

//       // PBR
//       const pbrCell = document.createElement("td");
//       pbrCell.textContent = fmt(item["PBR"]);
//       row.appendChild(pbrCell);

//       // ROE
//       const roeCell = document.createElement("td");
//       roeCell.textContent = fmt(item["ROE"]);
//       row.appendChild(roeCell);

//       // EPS
//       const epsCell = document.createElement("td");
//       epsCell.textContent = fmt(item["EPS"]);
//       row.appendChild(epsCell);

//       // EPS(예상)
//       const fwdEpsCell = document.createElement("td");
//       fwdEpsCell.textContent = fmt(item["EPS(예상)"]);
//       row.appendChild(fwdEpsCell);

//       tbody.appendChild(row);
//     });
//   })
//   .catch(err => console.error("JSON 불러오기 실패:", err));


// 🔹 테이블 정렬 함수
function sortTable(n) {
  const tbody = document.querySelector("table tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  const getValue = (row) => {
    const text = row.children[n].textContent.trim();
    const num = parseFloat(text);
    return isNaN(num) ? text : num;
  };

  const asc = !tbody.classList.contains("asc");
  tbody.classList.toggle("asc", asc);

  rows.sort((a, b) => {
    const x = getValue(a);
    const y = getValue(b);

    if (typeof x === "number" && typeof y === "number") {
      return asc ? x - y : y - x;
    }
    return asc
      ? String(x).localeCompare(String(y))
      : String(y).localeCompare(String(x));
  });

  tbody.innerHTML = "";
  rows.forEach(row => tbody.appendChild(row));
}