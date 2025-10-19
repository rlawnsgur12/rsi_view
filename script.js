// script.js

// 🔹 JSON 불러오기 후 테이블 생성
fetch("data/rsi_data.json")
  .then(res => res.json())
  .then(data => {
    const tbody = document.getElementById("rsi-table-body");

    data.forEach(item => {
      const row = document.createElement("tr");

      const tickerCell = document.createElement("td");
      tickerCell.textContent = item.Ticker;
      row.appendChild(tickerCell);

      const rsiCell = document.createElement("td");
      rsiCell.textContent = item.RSI;
      // flag 색상 적용
      if(item.flag === "low") rsiCell.style.color = "blue";
      else if(item.flag === "warn") rsiCell.style.color = "orange";
      row.appendChild(rsiCell);

      const rsi30Cell = document.createElement("td");
      rsi30Cell.textContent = item["RSI_30이하"];
      row.appendChild(rsi30Cell);

      const rsi30_35Cell = document.createElement("td");
      rsi30_35Cell.textContent = item["RSI_30초과_35이하"];
      row.appendChild(rsi30_35Cell);

      const recentCell = document.createElement("td");
      recentCell.textContent = item["최근7일내_RSI30이하"];
      row.appendChild(recentCell);

      tbody.appendChild(row);
    });
  })
  .catch(err => console.error("JSON 불러오기 실패:", err));


// 🔹 테이블 정렬 함수
function sortTable(n) {
  const table = document.querySelector("table");
  const tbody = table.querySelector("tbody");
  const numericCols = [1]; // RSI 컬럼만 숫자로 비교

  let dir = "asc";
  let switching = true;

  while (switching) {
    switching = false;
    const rows = Array.from(tbody.querySelectorAll("tr"));

    for (let i = 0; i < rows.length - 1; i++) {
      const x = rows[i].getElementsByTagName("td")[n].textContent;
      const y = rows[i + 1].getElementsByTagName("td")[n].textContent;

      const xVal = numericCols.includes(n) ? parseFloat(x) : x;
      const yVal = numericCols.includes(n) ? parseFloat(y) : y;

      if ((dir === "asc" && xVal > yVal) || (dir === "desc" && xVal < yVal)) {
        tbody.insertBefore(rows[i + 1], rows[i]);
        switching = true;
        break;
      }
    }

    if (!switching && dir === "asc") {
      dir = "desc";
      s
