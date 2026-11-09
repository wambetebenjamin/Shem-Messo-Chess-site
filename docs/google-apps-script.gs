// ---- Kericho Chess Academy: Sheets-as-a-database web app ----
// doGet  -> read a whole tab as a JSON array of row objects (keyed by header row)
// doPost -> append one row (object) to a tab; returns { ok: true, row: n }
// Setup and frontend contract: docs/GOOGLE-SHEETS-BACKEND.md

const SHEETS = {
  Events: "Events",
  Feedback: "Feedback",
  Enquiries: "Enquiries",
};

// Every form submission is emailed directly to the club inbox that receives the data.
const CLUB_EMAIL = "kerichochessacademy@gmail.com";

// Sends one notification email per appended row so the club sees submissions
// immediately in the inbox, even before anyone opens the Sheet.
function notifyClub(sheetName, data) {
  const subject = "New " + sheetName + " entry — Kericho Chess Academy website";
  const lines = Object.keys(data).map((k) => k + ": " + data[k]);
  MailApp.sendEmail(
    CLUB_EMAIL,
    subject,
    "A new row was added to the \"" + sheetName + "\" tab of the academy site data sheet.\n\n" +
      lines.join("\n") +
      "\n\nOpen the sheet to review: " + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  );
}

function sheetByName(name) {
  const allowed = Object.values(SHEETS);
  if (!allowed.includes(name)) return null;
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

// Rows -> array of objects using row 1 headers. Empty trailing cells are "".
function rowsToJson(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map((h) => String(h).trim());
  return values.slice(1)
    .filter((row) => row.some((cell) => String(cell).trim() !== ""))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        let v = row[i];
        if (v instanceof Date) v = Utilities.formatDate(v, "Africa/Nairobi", "yyyy-MM-dd HH:mm:ss");
        obj[h] = v === undefined || v === null ? "" : v;
      });
      return obj;
    });
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const sheet = sheetByName((e.parameter.sheet || "Events").trim());
  if (!sheet) return json({ error: "Unknown sheet" });
  if ((e.parameter.action || "read") !== "read") return json({ error: "Unknown action" });
  return json(rowsToJson(sheet));
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: "Invalid JSON body" });
  }
  const sheet = sheetByName(String(body.sheet || "").trim());
  if (!sheet) return json({ ok: false, error: "Unknown sheet" });
  if (String(body.action || "append") !== "append") return json({ ok: false, error: "Unknown action" });
  const data = body.data && typeof body.data === "object" ? body.data : {};
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map((h) => String(h).trim());
  const row = headers.map((h) => (data[h] !== undefined ? String(data[h]) : ""));
  sheet.appendRow(row);
  return json({ ok: true, row: sheet.getLastRow() });
}

// Optional: connect Google Docs / Slides as generated outputs per row.
// Example — create a Doc when a Feedback row arrives:
/*
function onFeedbackRow(data) {
  const doc = DocumentApp.create("Feedback — " + data.submittedAt);
  doc.getBody().appendParagraph(data.category + ": " + data.message);
  // const slides = SlidesApp.create("Academy briefing"); slides.appendSlide(SlidesApp.PredefinedLayout.TITLE_AND_BODY);
}
*/
