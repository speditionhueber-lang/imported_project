# Firebase Cloud Functions

Dieses Verzeichnis enthält den serverseitigen Code für Ihre Firebase-Anwendung.

## Funktion: syncSheet

Dies ist eine HTTPS-Cloud-Function, die als Endpunkt für die Echtzeit-Synchronisation von Daten aus einem Google Sheet dient.

### Deployment

1.  **Secret setzen:**
    Bevor Sie die Funktion bereitstellen, müssen Sie ein Secret für die Authentifizierung festlegen. Führen Sie dazu den folgenden Befehl in Ihrem Terminal aus und ersetzen Sie `IHR_SEHR_GEHEIMES_PASSWORT` durch ein starkes, zufälliges Passwort:

    ```bash
    firebase functions:config:set sync.secret="IHR_SEHR_GEHEIMES_PASSWORT"
    ```

2.  **Bereitstellung:**
    Stellen Sie die Funktion mit dem folgenden Befehl bereit:

    ```bash
    firebase deploy --only functions:syncSheet
    ```

3.  **Funktions-URL abrufen:**
    Nach dem erfolgreichen Deployment wird die URL des HTTPS-Endpunkts in der Konsole angezeigt. Kopieren Sie diese URL. Sie wird im nächsten Schritt für das Google Apps Script benötigt.
    Sie finden die URL auch jederzeit in der Firebase Console unter "Functions".

### Anpassungen

-   **Collection-Name:** Um die Daten in eine andere Firestore-Collection zu schreiben, ändern Sie den Wert der Konstante `FIRESTORE_COLLECTION` in `functions/src/index.ts`.
-   **Dokumenten-ID:** Standardmäßig wird der Wert aus der Spalte `customer_id` als eindeutige ID für jedes Firestore-Dokument verwendet. Stellen Sie sicher, dass diese Spalte in Ihrem Google Sheet existiert, oder passen Sie die Logik in der `forEach`-Schleife an, um ein anderes Feld zu verwenden.
