// script.js

fetch("data/rsi_data.json")
  .then(response => response.json())
  .then(data => {
    const tableBody = document.getElementById("rsi-table-body");

    data.forEach((item) => {
      const row = document.createElement("tr");

      // Ticker
      const tickerCell = document.createElement("td");
      tickerCell.textContent = item.Ticker;
      row.appendChild(tickerCell);

      // RSI
      const rsiCell = document.createElement("td");
      rsiCell.textContent = item.RSI;
      // flag에 따라 색상 표시
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

      tableBody.appendChild(row);
    });
  })
  .catch(err => console.error("JSON 불러오기 실패:", err));


// 🔹 테이블 정렬 함수
function sortTable(n) {
  const table = document.querySelector("table");
  let rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
  switching = true;
  dir = "asc"; // 오름차순 시작
  while (switching) {
    switching = false;
    rows = table.rows;
    for (i = 1; i < (rows.length - 1); i++) {
      shouldSwitch = false;
      x = rows[i].getElementsByTagName("TD")[n];
      y = rows[i + 1].getElementsByTagName("TD")[n];
      let xContent = isNaN(parseFloat(x.textContent)) ? x.textContent : parseFloat(x.textContent);
      let yContent = isNaN(parseFloat(y.textContent)) ? y.textContent : parseFloat(y.textContent);
      if (dir === "asc") {
        if (xContent > yContent) { shouldSwitch = true; break; }
      } else if (dir === "desc") {
        if (xContent < yContent) { shouldSwitch = true; break; }
      }
    }
    if (shouldSwitch) {
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
      switchcount++;
    } else {
      if (switchcount === 0 && dir === "asc") {
        dir = "desc";
        switching = true;
      }
    }
  }
}
