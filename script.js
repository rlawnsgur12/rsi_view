// script.js

// 🔹 숫자 포맷 함수 (🔴 추가)
function fmt(val) {
  if (val === null || val === undefined || val === "") return "";
  if (isNaN(val)) return val;          // 문자열(✅ 등)
  return Number(val).toFixed(2);       // 숫자 → 소수 2자리
}

fetch("data/rsi_data.json")
  .then(response => response.json())
  .then(data => {
    const tbody = document.getElementById("rsi-table-body");

    data.forEach(item => {
      const row = document.createElement("tr");

      // Ticker
      const tickerCell = document.createElement("td");
      tickerCell.textContent = item.Ticker;
      row.appendChild(tickerCell);

      // RSI
      const rsiCell = document.createElement("td");
      rsiCell.textContent = item.RSI;
      // flag 색상 적용
      if(item.flag === "low") rsiCell.style.color = "blue";
      else if(item.flag === "warn") rsiCell.style.color = "orange";
      row.appendChild(rsiCell);

      // RSI_30이하
      const rsi30Cell = document.createElement("td");
      rsi30Cell.textContent = item["RSI_30이하"];
      row.appendChild(rsi30Cell);

      // RSI_30초과_35이하
      const rsi30_35Cell = document.createElement("td");
      rsi30_35Cell.textContent = item["RSI_30초과_35이하"];
      row.appendChild(rsi30_35Cell);

      // 최근7일내_RSI30이하
      const recentCell = document.createElement("td");
      recentCell.textContent = item["최근7일내_RSI30이하"];
      row.appendChild(recentCell);

      // PER
      const perCell = document.createElement("td");
      perCell.textContent = fmt(item["PER"]);
      row.appendChild(perCell);

      // PER(예상)
      const fwdPerCell = document.createElement("td");
      fwdPerCell.textContent = fmt(item["PER(예상)"]);
      row.appendChild(fwdPerCell);

      // PBR
      const pbrCell = document.createElement("td");
      pbrCell.textContent = fmt(item["PBR"]);
      row.appendChild(pbrCell);

      // ROE
      const roeCell = document.createElement("td");
      roeCell.textContent = fmt(item["ROE"]);
      row.appendChild(roeCell);

      // EPS
      const epsCell = document.createElement("td");
      epsCell.textContent = fmt(item["EPS"]);
      row.appendChild(epsCell);

      // EPS(예상)
      const fwdEpsCell = document.createElement("td");
      fwdEpsCell.textContent = fmt(item["EPS(예상)"]);
      row.appendChild(fwdEpsCell);

      tbody.appendChild(row);
    });
  })
  .catch(err => console.error("JSON 불러오기 실패:", err));


// 🔹 테이블 정렬 함수
function sortTable(n) {
  const table = document.querySelector("table");
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  let dir = "asc";
  let switching = true;

  while (switching) {
    switching = false;
    for (let i = 0; i < rows.length - 1; i++) {
      const x = rows[i].getElementsByTagName("td")[n].textContent;
      const y = rows[i + 1].getElementsByTagName("td")[n].textContent;

      const xVal = isNaN(parseFloat(x)) ? x : parseFloat(x);
      const yVal = isNaN(parseFloat(y)) ? y : parseFloat(y);

      const shouldSwitch = (dir === "asc") ? xVal > yVal : xVal < yVal;
      if (shouldSwitch) {
        tbody.insertBefore(rows[i + 1], rows[i]);
        switching = true;
        break;
      }
    }

    if (!switching && dir === "asc") {
      dir = "desc";
      switching = true;
    }
  }
}
