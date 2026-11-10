// Google Sheets backend connector.
// The Google Sheet is the source of truth; a Google Apps Script Web App URL
// (deployed from the sheet) exposes it as a JSON endpoint. Paste your deployed
// "exec" URL below — see docs/GOOGLE-SHEETS-BACKEND.md for the Apps Script code.
//
// Until a real URL is pasted, configured() is false and pages fall back to the
// existing same-origin API so the site keeps working during the migration.
window.GoogleSheets = (function () {
  const GOOGLE_SCRIPT_WEBAPP_URL =
    "https://script.google.com/macros/s/AKfycbynlZB70fyPEXNnfVYx29PB_izWX95fhXZjz-Od3Ib974pVoV3UxsKRNmlqqV8tjJ6cOw/exec";

  function configured() {
    return (
      /^https:\/\/script\.google\.com\/macros\/s\//.test(
        GOOGLE_SCRIPT_WEBAPP_URL,
      ) || /^https:\/\/script\.googleusercontent\.com\/macros\//.test(GOOGLE_SCRIPT_WEBAPP_URL)
    );
  }

  // Reads a sheet tab as a JSON array of row objects keyed by the header row,
  // e.g. fetchSheet("Events") -> [{ title: "...", date: "2026-11-14", ... }, ...]
  async function fetchSheet(sheetName) {
    if (!configured())
      throw Error("Google Sheets backend is not configured yet.");
    const url =
      GOOGLE_SCRIPT_WEBAPP_URL +
      "?action=read&sheet=" +
      encodeURIComponent(sheetName);
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) throw Error("Could not read from the sheet (HTTP " + response.status + ").");
    const data = await response.json();
    const rows = Array.isArray(data) ? data : data.rows;
    if (!Array.isArray(rows)) throw Error("The sheet returned an unexpected format.");
    return rows;
  }

  // Appends one row to a sheet tab. payload is a flat object whose keys match
  // the sheet's header row, e.g. postToSheet("Feedback", { category, message }).
  async function postToSheet(sheetName, payload) {
    if (!configured())
      throw Error("Google Sheets backend is not configured yet.");
    const response = await fetch(GOOGLE_SCRIPT_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight; Apps Script reads the raw body
      body: JSON.stringify({ action: "append", sheet: sheetName, data: payload }),
    });
    if (!response.ok) throw Error("Could not save to the sheet (HTTP " + response.status + ").");
    const result = await response.json();
    if (!result || result.ok !== true) throw Error(result && result.error ? result.error : "The sheet did not confirm the save.");
    return result;
  }

  return { GOOGLE_SCRIPT_WEBAPP_URL, configured, fetchSheet, postToSheet };
})();
