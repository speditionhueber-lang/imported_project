'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";

const secretCommand = `firebase functions:config:set sync.secret="IHR_SEHR_GEHEIMES_PASSWORT"`;
const deployCommand = `firebase deploy --only functions:syncSheet`;

const appsScriptCode = `/**
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
    ui.alert(\`URL erfolgreich gespeichert: \${syncUrl}\`);
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
    SpreadsheetApp.getUi().alert(\`Tab "\${SHEET_NAME}" wurde nicht gefunden.\`);
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
    Logger.log(\`Warnung: ID-Spalte "\${ID_COLUMN_NAME}" nicht gefunden. Zeile \${rowNum} übersprungen.\`);
    return;
  }
  
  const docId = rowValues[idColumnIndex];
  // Überspringen, wenn die ID-Zelle leer ist.
  if (!docId) {
    Logger.log(\`Warnung: Keine ID in Zeile \${rowNum}. Übersprungen.\`);
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
      Logger.log(\`Zeile \${rowNum} erfolgreich an Firebase gesendet. Antwort: \${responseBody}\`);
    } else {
      Logger.log(
        \`Fehler beim Senden von Zeile \${rowNum}. Status: \${responseCode}, Body: \${responseBody}\`
      );
    }
  } catch (error) {
    Logger.log(\`Kritischer Fehler beim Senden von Zeile \${rowNum}: \${error.toString()}\`);
  }
}
`;


export default function AnleitungPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Google Sheets mit Firebase synchronisieren</CardTitle>
          <CardDescription>
            Folgen Sie diesen Schritten, um Ihre Kundendaten aus einem Google Sheet automatisch mit Ihrer Firestore-Datenbank zu synchronisieren.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teil 1: Firebase Cloud Function einrichten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Zuerst müssen Sie die bereitgestellte Cloud Function `syncSheet` bereitstellen und ein sicheres Passwort (Secret) dafür festlegen.</p>
          
          <div>
            <h3 className="font-semibold mb-2">Schritt 1.1: Geheimes Passwort festlegen</h3>
            <p className="mb-2">Öffnen Sie ein Terminal im Wurzelverzeichnis Ihres Projekts und führen Sie den folgenden Befehl aus. Ersetzen Sie `IHR_SEHR_GEHEIMES_PASSWORT` durch ein starkes, zufälliges Passwort Ihrer Wahl. Merken Sie sich dieses Passwort, Sie benötigen es später.</p>
            <CodeBlock language="bash" code={secretCommand} />
          </div>

          <div>
            <h3 className="font-semibold mb-2">Schritt 1.2: Cloud Function bereitstellen</h3>
            <p className="mb-2">Führen Sie nun diesen Befehl aus, um nur die Synchronisierungsfunktion bereitzustellen:</p>
            <CodeBlock language="bash" code={deployCommand} />
          </div>

           <div>
            <h3 className="font-semibold mb-2">Schritt 1.3: Funktions-URL kopieren</h3>
            <p className="mb-2">Nach erfolgreichem Deployment wird die URL des HTTPS-Endpunkts in der Konsole angezeigt. Kopieren Sie diese URL. Sie sieht in etwa so aus: `https://syncsheet-....run.app`. Sie finden die URL auch jederzeit in der Firebase Console unter "Functions".</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Teil 2: Google Apps Script im Google Sheet einrichten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
             <div>
                <h3 className="font-semibold mb-2">Schritt 2.1: Apps Script Editor öffnen</h3>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Öffnen Sie Ihr Google Sheet, das Sie synchronisieren möchten.</li>
                    <li>Stellen Sie sicher, dass die erste Zeile eine Kopfzeile ist und eine Spalte mit dem Namen `customer_id` für die eindeutige ID jedes Kunden enthält.</li>
                    <li>Gehen Sie im Menü auf <strong>Erweiterungen</strong> &gt; <strong>Apps Script</strong>. Ein neuer Tab mit dem Script-Editor öffnet sich.</li>
                </ol>
            </div>
             <div>
                <h3 className="font-semibold mb-2">Schritt 2.2: Code einfügen</h3>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Im Editor sehen Sie eine leere Datei namens `Code.gs`. Löschen Sie den gesamten Inhalt.</li>
                    <li>Kopieren Sie den vollständigen Code unten und fügen Sie ihn in den leeren Editor ein.</li>
                </ol>
                <CodeBlock language="javascript" code={appsScriptCode} />
                 <ol className="list-decimal list-inside space-y-1 mt-2" start={3}>
                    <li>Klicken Sie auf das <strong>Speichern-Symbol</strong> (Diskette).</li>
                </ol>
            </div>
             <div>
                <h3 className="font-semibold mb-2">Schritt 2.3: Trigger für `onEdit` einrichten</h3>
                <p>Damit das Skript automatisch bei jeder Änderung ausgeführt wird, müssen wir einen Trigger erstellen.</p>
                <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>Klicken Sie im linken Menü des Apps Script Editors auf das <strong>Trigger-Symbol</strong> (Wecker).</li>
                    <li>Klicken Sie unten rechts auf die Schaltfläche <strong>"+ Trigger hinzufügen"</strong>.</li>
                    <li>Konfigurieren Sie den Trigger mit folgenden Einstellungen:
                        <ul className="list-disc list-inside pl-6">
                            <li><strong>Auszuführende Funktion wählen:</strong> `onEdit`</li>
                            <li><strong>Bereitstellung für die Ausführung auswählen:</strong> `Head`</li>
                            <li><strong>Ereignisquelle auswählen:</strong> `Aus Tabelle`</li>
                            <li><strong>Ereignistyp auswählen:</strong> `Bei Bearbeitung`</li>
                        </ul>
                    </li>
                    <li>Klicken Sie auf <strong>Speichern</strong>.</li>
                    <li>Sie werden nun aufgefordert, die erforderlichen Berechtigungen zu erteilen.
                        <ul className="list-disc list-inside pl-6">
                            <li>Wählen Sie Ihr Google-Konto aus.</li>
                            <li>Klicken Sie auf <strong>"Erweitert"</strong> und dann auf <strong>"Zu [Projektname] (unsicher) wechseln"</strong>. Dies ist normal, da Ihr Skript noch nicht von Google verifiziert wurde.</li>
                            <li>Erlauben Sie dem Skript den Zugriff auf Ihre Google Sheets.</li>
                        </ul>
                    </li>
                </ol>
            </div>
             <div>
                <h3 className="font-semibold mb-2">Schritt 2.4: URL und Secret konfigurieren</h3>
                <p>Das Skript benötigt die URL Ihrer Firebase Function und das geheime Passwort, um Daten sicher zu senden.</p>
                 <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>Wechseln Sie zurück zu Ihrem Google Sheet. Nach einem kurzen Moment (oder nach dem Neuladen der Seite) sollte ein neues Menü namens <strong>"Firebase Sync"</strong> erscheinen.</li>
                    <li>Klicken Sie auf <strong>Firebase Sync</strong> &gt; <strong>Konfiguration festlegen</strong>.</li>
                    <li>Geben Sie im ersten Dialog die <strong>URL Ihrer Firebase Cloud Function</strong> ein (aus Schritt 1.3).</li>
                    <li>Geben Sie im zweiten Dialog Ihr <strong>SYNC_SECRET</strong> ein (das Passwort aus Schritt 1.1).</li>
                </ol>
                <p className="mt-2 text-sm text-muted-foreground">Die Konfiguration ist nun abgeschlossen und wird sicher in den *Script Properties* gespeichert.</p>
            </div>
             <div>
                <h3 className="font-semibold mb-2">Schritt 2.5: Test und initiale Synchronisation</h3>
                 <ul className="list-disc list-inside space-y-1 mt-2">
                    <li><strong>Echtzeit-Test:</strong> Ändern Sie einen Wert in einer beliebigen Zelle (außer in der Kopfzeile). Überprüfen Sie Ihre Firestore-Datenbank. Der entsprechende Kundendatensatz sollte sich innerhalb von Sekunden aktualisieren.</li>
                    <li><strong>Manuelle Vollsychronisation:</strong> Um alle bestehenden Daten auf einmal zu Firebase zu übertragen, klicken Sie im Menü auf <strong>Firebase Sync</strong> &gt; <strong>Alle Zeilen synchronisieren</strong>.</li>
                </ul>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}