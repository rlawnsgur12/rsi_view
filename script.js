// script.js

// JSON 파일 불러오기
fetch("data/rsi_data.json")
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    // data가 배열 형태라고 가정
    const tableBody = document.getElementById("rsi-table-body");

    data.forEach((item, index) => {
      // 새로운 tr 요소 생성
      const row = document.createElement("tr");

      // Ticker
      const tickerCell = document.createElement("td");
      tickerCell.textContent = item.Ticker;
      row.appendChild(tickerCell);

      // RSI
      const rsiCell = document.createElement("td");
      rsiCell.textContent = item.RSI;
      row.appendChild(rsiCell);

      // Price
      const priceCell = document.createElement("td");
      priceCell.textContent = item.Price;
      row.appendChild(priceCell);

      // 테이블에 추가
      tableBody.appendChild(row);
    });
  })
  .catch(error => {
    console.error("Error fetching RSI JSON:", error);
  });
