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
