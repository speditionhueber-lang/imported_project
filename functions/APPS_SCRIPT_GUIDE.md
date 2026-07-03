# Anleitung: Google Apps Script für Firebase Sync einrichten

Folgen Sie diesen Schritten, um die Echtzeit-Synchronisation in Ihrem Google Sheet zu aktivieren.

### Schritt 1: Apps Script Editor öffnen

1.  Öffnen Sie Ihr Google Sheet, das Sie synchronisieren möchten.
2.  Gehen Sie im Menü auf **Erweiterungen** > **Apps Script**. Ein neuer Tab mit dem Script-Editor öffnet sich.

### Schritt 2: Code einfügen

1.  Im Editor sehen Sie eine leere Datei namens `Code.gs`. Löschen Sie den gesamten Inhalt.
2.  Kopieren Sie den vollständigen Code aus der Datei `apps-script.js` und fügen Sie ihn in den leeren Editor ein.
3.  Klicken Sie auf das **Speichern-Symbol** (Diskette).

### Schritt 3: Trigger für `onEdit` einrichten

Damit das Skript automatisch bei jeder Änderung ausgeführt wird, müssen wir einen Trigger erstellen.

1.  Klicken Sie im linken Menü des Apps Script Editors auf das **Trigger-Symbol** (Wecker).
2.  Klicken Sie unten rechts auf die Schaltfläche **"+ Trigger hinzufügen"**.
3.  Konfigurieren Sie den Trigger mit folgenden Einstellungen:
    *   **Auszuführende Funktion wählen:** `onEdit`
    *   **Bereitstellung für die Ausführung auswählen:** `Head`
    *   **Ereignisquelle auswählen:** `Aus Tabelle`
    *   **Ereignistyp auswählen:** `Bei Bearbeitung`
4.  Klicken Sie auf **Speichern**.
5.  Sie werden nun aufgefordert, die erforderlichen Berechtigungen zu erteilen.
    *   Wählen Sie Ihr Google-Konto aus.
    *   Klicken Sie auf **"Erweitert"** und dann auf **"Zu [Projektname] (unsicher) wechseln"**. Dies ist normal, da Ihr Skript noch nicht von Google verifiziert wurde.
    *   Erlauben Sie dem Skript den Zugriff auf Ihre Google Sheets.

### Schritt 4: URL und Secret konfigurieren

Das Skript benötigt die URL Ihrer Firebase Function und das geheime Passwort, um Daten sicher zu senden.

1.  Wechseln Sie zurück zu Ihrem Google Sheet. Nach einem kurzen Moment (oder nach dem Neuladen der Seite) sollte ein neues Menü namens **"Firebase Sync"** erscheinen.
2.  Klicken Sie auf **Firebase Sync** > **Konfiguration festlegen**.
3.  Geben Sie im ersten Dialog die **URL Ihrer Firebase Cloud Function** ein. Diese finden Sie nach dem Deployment in der Firebase Console.
4.  Geben Sie im zweiten Dialog Ihr **SYNC_SECRET** ein. Dies ist dasselbe Passwort, das Sie bei der Konfiguration der Firebase Function über die CLI gesetzt haben.

Die Konfiguration ist nun abgeschlossen und wird sicher in den *Script Properties* gespeichert.

### Schritt 5: Test und initiale Synchronisation

-   **Echtzeit-Test:** Ändern Sie einen Wert in einer beliebigen Zelle (außer in der Kopfzeile) in Ihrem "Kunden"-Tab. Überprüfen Sie Ihr Firestore Dashboard. Der entsprechende Datensatz sollte sich innerhalb von Sekunden aktualisieren.
-   **Manuelle Vollsychronisation:** Um alle bestehenden Daten auf einmal zu Firebase zu übertragen, klicken Sie im Menü auf **Firebase Sync** > **Alle Zeilen synchronisieren**.

---

### Anpassungsmöglichkeiten

-   **Anderer Tab-Name:** Ändern Sie den Wert der Konstante `SHEET_NAME` am Anfang des `apps-script.js` Codes.
-   **Andere ID-Spalte:** Ändern Sie den Wert der Konstante `ID_COLUMN_NAME`, um eine andere Spalte als primären Schlüssel für Ihre Firestore-Dokumente zu verwenden.
