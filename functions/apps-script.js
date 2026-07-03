/**
 * @fileoverview Google Apps Script zur Echtzeit-Synchronisation mit Firebase.
 *
 * Dieses Script wird in einem Google Sheet installiert und reagiert auf
 * Änderungen, um die entsprechenden Daten an eine Firebase Cloud Function
 * zu senden.
 */

// ============== KONFIGURATION ==============
// Name des Tabs, der synchronisiert werden soll.
const SHEET_NAME = 'Kunden';
// Name der Spalte, die die eindeutige ID für jedes Dokument enthält.
const ID_COLUMN_NAME = 'customer_id';
// ==========================================

/**
 * Erstellt ein benutzerdefiniertes Menü im Google Sheet, um die
 * Konfiguration und manuelle Synchronisation zu ermöglichen.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Firebase Sync')
    .addItem('Alle Zeilen synchronisieren', 'syncAllRows')
    .addSeparator()
    .addItem('Konfiguration festlegen', 'showConfigurationPrompt')
    .addToUi();
}

/**
 * Zeigt Eingabeaufforderungen an, um die Firebase Function URL und das
 * Secret sicher in den Script Properties zu speichern.
 */
function showConfigurationPrompt() {
  const ui = SpreadsheetApp.getUi();
  const scriptProperties = PropertiesService.getScriptProperties();

  // URL abfragen
  const urlResult = ui.prompt(
    'Firebase Konfiguration',
    'Bitte geben Sie die URL Ihrer Firebase Cloud Function ein (z. B. https://...):',
    ui.ButtonSet.OK_CANCEL
  );

  if (urlResult.getSelectedButton() == ui.Button.OK) {
    const syncUrl = urlResult.getResponseText();
    scriptProperties.setProperty('SYNC_URL', syncUrl);
    ui.alert(`URL erfolgreich gespeichert: ${syncUrl}`);
  } else {
    return; // Abbruch durch Benutzer
  }

  // Secret abfragen
  const secretResult = ui.prompt(
    'Firebase Konfiguration',
    'Bitte geben Sie Ihr SYNC_SECRET ein:',
    ui.ButtonSet.OK_CANCEL
  );

  if (secretResult.getSelectedButton() == ui.Button.OK) {
    const syncSecret = secretResult.getResponseText();
    scriptProperties.setProperty('SYNC_SECRET', syncSecret);
    ui.alert('Secret wurde erfolgreich gespeichert.');
  }
}

/**
 * Trigger-Funktion, die bei jeder Bearbeitung einer Zelle im Sheet ausgeführt wird.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e Das Event-Objekt von onEdit.
 */
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;

  // Prüfen, ob die Änderung im richtigen Tab und nicht in der Header-Zeile stattfindet.
  if (sheet.getName() !== SHEET_NAME || range.getRow() <= 1) {
    return;
  }

  // Die geänderte Zeile als JSON-Objekt an Firebase senden.
  sendRowData(sheet, range.getRow());
}

/**
 * Synchronisiert alle Zeilen des definierten Sheets mit Firestore.
 * Nützlich für die initiale Einrichtung.
 */
function syncAllRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Tab "${SHEET_NAME}" wurde nicht gefunden.`);
    return;
  }

  const lastRow = sheet.getLastRow();
  // Startet ab der zweiten Zeile, um den Header zu überspringen.
  for (let i = 2; i <= lastRow; i++) {
    sendRowData(sheet, i);
    // Kurze Pause, um Ratenbegrenzungen der UrlFetchApp zu vermeiden.
    Utilities.sleep(200);
  }
  SpreadsheetApp.getUi().alert('Alle Zeilen wurden erfolgreich synchronisiert.');
}

/**
 * Liest eine einzelne Zeile aus, konvertiert sie in ein JSON-Objekt und
 * sendet es an die Firebase Cloud Function.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Das Tabellenblatt-Objekt.
 * @param {number} rowNum Die Zeilennummer, die gesendet werden soll.
 */
function sendRowData(sheet, rowNum) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const SYNC_URL = scriptProperties.getProperty('SYNC_URL');
  const SYNC_SECRET = scriptProperties.getProperty('SYNC_SECRET');

  if (!SYNC_URL || !SYNC_SECRET) {
    SpreadsheetApp.getUi().alert(
      'Fehler: SYNC_URL oder SYNC_SECRET nicht konfiguriert. Bitte über das Menü "Firebase Sync" -> "Konfiguration festlegen" einrichten.'
    );
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowValues = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const idColumnIndex = headers.indexOf(ID_COLUMN_NAME);
  if (idColumnIndex === -1) {
    Logger.log(`Warnung: ID-Spalte "${ID_COLUMN_NAME}" nicht gefunden. Zeile ${rowNum} übersprungen.`);
    return;
  }
  
  const docId = rowValues[idColumnIndex];
  // Überspringen, wenn die ID-Zelle leer ist.
  if (!docId) {
    Logger.log(`Warnung: Keine ID in Zeile ${rowNum}. Übersprungen.`);
    return;
  }

  const record = {};
  headers.forEach((header, index) => {
    // Leere Header ignorieren
    if (header) {
      record[header] = rowValues[index];
    }
  });

  const payload = {
    data: [record], // Die Cloud Function erwartet ein Array.
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-secret': SYNC_SECRET,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true, // Verhindert, dass bei Fehlern eine Exception geworfen wird.
  };

  try {
    const response = UrlFetchApp.fetch(SYNC_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      Logger.log(`Zeile ${rowNum} erfolgreich an Firebase gesendet. Antwort: ${responseBody}`);
    } else {
      Logger.log(
        `Fehler beim Senden von Zeile ${rowNum}. Status: ${responseCode}, Body: ${responseBody}`
      );
    }
  } catch (error) {
    Logger.log(`Kritischer Fehler beim Senden von Zeile ${rowNum}: ${error.toString()}`);
  }
}
