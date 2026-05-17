export function sortTable(n) {
  const tbody = document.querySelector("table tbody");
  const rows  = Array.from(tbody.querySelectorAll("tr"));

  const getValue = (row) => {
    const td = row.children[n];
    if (!td) return 0;
    if (td.dataset.sort !== undefined) return parseFloat(td.dataset.sort) || 0;
    const svg = td.querySelector("svg.spark");
    if (svg) {
      if (n === 5) return parseFloat(row.children[4]?.textContent.trim()) || 0;
      if (n === 7) return parseFloat(row.children[6]?.textContent.trim()) || 0;
    }
    const text = td.textContent.trim().replace(/[$x%+,]/g, "");
    const num  = parseFloat(text);
    return isNaN(num) ? text : num;
  };

  const asc = !tbody.classList.contains("asc");
  tbody.classList.toggle("asc", asc);

  rows.sort((a, b) => {
    const x = getValue(a), y = getValue(b);
    if (typeof x === "number" && typeof y === "number") return asc ? x - y : y - x;
    return asc ? String(x).localeCompare(String(y)) : String(y).localeCompare(String(x));
  });

  tbody.innerHTML = "";
  rows.forEach(row => tbody.appendChild(row));
}
