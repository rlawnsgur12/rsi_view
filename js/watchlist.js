const KEY = "rsi_watchlist";

export function getWatchlist() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function toggleWatchlist(ticker) {
  const list = getWatchlist();
  const idx  = list.indexOf(ticker);
  if (idx === -1) list.push(ticker);
  else list.splice(idx, 1);
  localStorage.setItem(KEY, JSON.stringify(list));
  return idx === -1; // true = added
}

export function isWatched(ticker) {
  return getWatchlist().includes(ticker);
}
