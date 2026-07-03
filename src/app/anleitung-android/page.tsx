'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";

const taskerExample = `
Profil: Neue Aufnahme erkannt
    Ereignis: Datei geändert
    Pfad: [Pfad zu Ihrem Aufnahme-Ordner, z.B. /storage/emulated/0/Recordings/Call]
    Ereignis: Erstellt
->
Task: HueberHelper Upload
    A1: Starte App
        App: Chrome
        Daten: [IHRE_APP_URL]/telefonate
        Immer neue Kopie starten: An
`;


export default function AnleitungAndroidPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Anleitung: Android-Aufnahmen schneller importieren</CardTitle>
          <CardDescription>
            Eine direkte, vollautomatische Synchronisierung ist mit einer Web-App nicht möglich. Sie können den Prozess jedoch mit einer Automatisierungs-App wie "Tasker" oder "Automate" auf Ihrem Android-Handy erheblich beschleunigen.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Das Konzept</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Das Ziel ist, dass Ihr Handy automatisch die "Telefonate"-Seite in Ihrem Browser öffnet, sobald eine neue Anrufaufnahme gespeichert wird. Sie müssen den Upload dann nur noch manuell auslösen.</p>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>Eine neue Audioaufnahme wird auf Ihrem Handy gespeichert.</li>
            <li>Eine Automatisierungs-App (z.B. Tasker) erkennt diese neue Datei.</li>
            <li>Die App öffnet automatisch die Seite <strong>[IHRE_APP_URL]/telefonate</strong> in Ihrem Standard-Browser.</li>
            <li>Sie tippen auf "Audioaufnahme hochladen", wählen die neueste Aufnahme aus und der Prozess startet.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Schritt-für-Schritt mit "Tasker" (Beispiel)</CardTitle>
            <CardDescription>Andere Apps wie "Automate" oder "MacroDroid" funktionieren nach einem ähnlichen Prinzip.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div>
                <h3 className="font-semibold mb-2">Schritt 1: Aufnahme-Ordner finden</h3>
                <p>Finden Sie heraus, wo Ihr Handy die Anrufaufnahmen speichert. Dies ist je nach Hersteller unterschiedlich. Übliche Pfade sind:</p>
                <ul className="list-disc list-inside space-y-1 pl-4 mt-2 bg-muted p-3 rounded-md">
                    <li><code>/storage/emulated/0/Recordings/</code></li>
                    <li><code>/storage/emulated/0/Call/</code></li>
                    <li><code>/storage/emulated/0/Music/CallRecordings/</code></li>
                </ul>
                <p className="mt-2 text-sm text-muted-foreground">Tipp: Nutzen Sie eine "Dateimanager"-App auf Ihrem Handy, um den genauen Pfad zu finden.</p>
            </div>
             <div>
                <h3 className="font-semibold mb-2">Schritt 2: Tasker-Profil erstellen</h3>
                <p>Installieren Sie "Tasker" (oder eine ähnliche App) aus dem Google Play Store und erstellen Sie ein neues Profil.</p>
                <ol className="list-decimal list-inside space-y-2 mt-2">
                    <li><strong>Auslöser (Trigger) erstellen:</strong>
                        <ul className="list-disc list-inside pl-6">
                            <li>Wählen Sie als Kontext: <strong>Ereignis → Datei → Datei geändert</strong>.</li>
                            <li>Geben Sie bei <strong>Pfad</strong> den Ordner an, den Sie in Schritt 1 gefunden haben.</li>
                            <li>Wählen Sie bei <strong>Ereignis</strong> die Option <strong>"Erstellt"</strong>.</li>
                        </ul>
                    </li>
                    <li className="mt-2"><strong>Aktion (Task) erstellen:</strong>
                         <ul className="list-disc list-inside pl-6">
                            <li>Fügen Sie eine neue Aktion hinzu: <strong>App → Starte App</strong>.</li>
                            <li>Wählen Sie als App Ihren Browser (z.B. Chrome).</li>
                            <li>Geben Sie in das Feld <strong>"Daten"</strong> die URL zu Ihrer Telefonate-Seite ein: <code>[IHRE_APP_URL]/telefonate</code>. Ersetzen Sie `[IHRE_APP_URL]` durch die tatsächliche URL Ihrer Anwendung.</li>
                        </ul>
                    </li>
                </ol>
            </div>

            <div>
                <h3 className="font-semibold mb-2">Beispiel-Konfiguration in Tasker-Syntax</h3>
                 <CodeBlock language="bash" code={taskerExample} />
            </div>

             <div>
                <h3 className="font-semibold mb-2">Schritt 3: Testen</h3>
                <p>Führen Sie einen Testanruf durch oder legen Sie manuell eine neue Audiodatei in den Aufnahme-Ordner. Ihr Browser sollte sich automatisch mit der korrekten Seite öffnen.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
