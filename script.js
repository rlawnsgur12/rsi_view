fetch('./data/rsi_data.json')
  .then(response => response.json())
  .then(data => {
    const tbody = document.querySelector('#rsi-table tbody');
    data.forEach(stock => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${stock.ticker}</td>
        <td>${stock.rsi}</td>
        <td>${stock.rsi_flag}</td>
        <td>${stock.rsi_below_30_recently ? '🕐' : ''}</td>
      `;
      tbody.appendChild(row);
    });
  })
  .catch(err => {
    console.error("데이터 불러오기 실패:", err);
  });
