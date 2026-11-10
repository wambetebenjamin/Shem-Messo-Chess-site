# Google Sheets backend (Google Apps Script Web App)

The Google Sheet is now the **source of truth** for public content and form
submissions. The website frontend is static (hosted on Render); all reads and
writes go to a Google Apps Script Web App URL, which reads/writes sheet tabs
and returns/accepts **standard JSON arrays of row objects** keyed by the
header row.

## 1. Prepare the Sheet

Create one Google Sheet (e.g. `Kericho Chess Academy — Site Data`) with one
tab per data type. Row 1 of each tab is the header. Expected headers:

- **Events** — `title, date, startTime, location, category, timeControl, entryFee, registrationDeadline, contact, description, poster, registrationUrl, published`
  (only `title` and `date` are required; `published` must not be `FALSE` for an event to show)
- **Feedback** — `submittedAt, category, message`
- **Enquiries** — `submittedAt, name, email, program, message`

Any extra columns are simply carried through in the JSON.

## 2. Paste the Apps Script code

In the Sheet: **Extensions → Apps Script**, delete the default code, and paste
the code below (also saved as `docs/google-apps-script.gs`):

```javascript
// ---- Kericho Chess Academy: Sheets-as-a-database web app ----
// doGet  -> read a whole tab as a JSON array of row objects (keyed by header row)
// doPost -> append one row (object) to a tab; returns { ok: true, row: n }

const SHEETS = {
  Events: "Events",
  Feedback: "Feedback",
  Enquiries: "Enquiries",
};

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
  try {
    notifyClub(String(body.sheet || "").trim(), data);
  } catch (err) {
    // The row is already saved; an email failure must not fail the request.
  }
  return json({ ok: true, row: sheet.getLastRow() });
}

// Optional: connect Google Docs / Slides as generated outputs per row.
// Example — create (or update) a Doc/Slides file when a Feedback row arrives:
/*
function onFormRow(sheetName, data) {
  if (sheetName === "Feedback") {
    const doc = DocumentApp.create("Feedback — " + data.submittedAt);
    doc.getBody().appendParagraph(data.category + ": " + data.message);
    // const slides = SlidesApp.create("Academy briefing"); slides.appendSlide(...) etc.
  }
}
*/
```

## 3. Deploy as a Web App

1. In the Apps Script editor: **Deploy → New deployment → Web app**.
2. **Execute as:** Me. **Who has access:** Anyone (the site is public; the URL
   acts as a capability token — keep it unlisted).
3. Copy the `/exec` URL and paste it into `assets/google-sheets.js` as
   `GOOGLE_SCRIPT_WEBAPP_URL`. Redeploy the website (Render).

**Current deployment (2026-11-04):** deployment ID
`AKfycbynlZB70fyPEXNnfVYx29PB_izWX95fhXZjz-Od3Ib974pVoV3UxsKRNmlqqV8tjJ6cOw`, web app URL
`https://script.google.com/macros/s/AKfycbynlZB70fyPEXNnfVYx29PB_izWX95fhXZjz-Od3Ib974pVoV3UxsKRNmlqqV8tjJ6cOw/exec`
— already set in `assets/google-sheets.js`. If you redeploy the script, update
both this note and the constant (a new deployment gets a new ID).

**Email delivery:** every appended row (Enquiries, Feedback) is also emailed
directly to the club inbox **`kerichochessacademy@gmail.com`** via
`MailApp.sendEmail` in `notifyClub()` — so the club email receives the data
immediately, and the Sheet remains the stored source of truth. Make sure the
Google account that owns the Apps Script is allowed to send mail (it sends as
that account); the club inbox just receives it.

## 4. Frontend contract

- `assets/google-sheets.js` exposes `window.GoogleSheets` with
  `GOOGLE_SCRIPT_WEBAPP_URL`, `configured()`, `fetchSheet(name)` (GET, returns a
  JSON array) and `postToSheet(name, payload)` (clean `fetch()` POST of
  `{ action: "append", sheet, data }`).
- Pages read the **Events** tab; the contact enquiry form and the feedback form
  POST to the **Enquiries** / **Feedback** tabs.
- Until a real URL is pasted, `configured()` is `false` and pages fall back to
  the previous same-origin API, so the site keeps working during migration.

## 5. Security notes

- Treat the web app URL as a secret-ish capability: anyone with it can append
  rows. Do not expose admin-only tabs through it, and keep sensitive tabs
  (payments, accounts) out of this sheet entirely — those stay on the Node
  service.
- `doPost` writes plain text only; the site renders everything as text, never
  as HTML.
