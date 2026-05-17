const KEY = "rsi_ai_notes";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}

export function getNote(ticker) {
  return load()[ticker] || "";
}

export function saveNote(ticker, text) {
  const notes = load();
  if (text.trim()) {
    notes[ticker] = text.trim();
  } else {
    delete notes[ticker];
  }
  localStorage.setItem(KEY, JSON.stringify(notes));
}

export function hasNote(ticker) {
  return !!load()[ticker];
}
