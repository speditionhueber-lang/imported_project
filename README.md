# Firebase Studio / Next.js Projekt

## Lokale Vorbereitung

```bash
npm ci
npm run typecheck
npm run build
```

## Erforderliche Umgebungsvariablen (Deploy)

- `GOOGLE_MAPS_API_KEY` (für Distanzberechnung)
- `GOOGLE_CLIENT_EMAIL` (Service Account für Drive-Zugriff)
- `GOOGLE_PRIVATE_KEY` (Service Account Private Key, inkl. `\n` Escaping)
- `GOOGLE_DRIVE_FOLDER_ID` (Root-Ordner für Dokumente/Telefonate)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON als String für Admin API-Routen)
- `NEXT_PUBLIC_FIREBASE_*` (Client Firebase Konfiguration)
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (optional, für Push)

`GOOGLE_MAPS_API_KEY` ist bereits in `apphosting.yaml` als Secret referenziert.

## Firebase Deploy

```bash
firebase use <project-id>
firebase deploy --only hosting,firestore:rules,firestore:indexes
```

Optional nur Regeln:

```bash
npm run deploy:rules
```
