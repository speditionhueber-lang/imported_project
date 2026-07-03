import * as admin from 'firebase-admin';
import * as fs from 'fs';

// ---- Init ----
const sa = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const dashRegex = /[–—−]/g;
const cleanRange = (s:any) => String(s ?? '').replace(dashRegex,'-').replace(/\s*Meter\b/i,'').trim();
const toNum = (v:any) => { const n = Number(v); return isFinite(n) ? n : null; };
const hasCity = (s:string) => /(Innsbruck|Wien|Graz|Linz|Salzburg|Hamburg|Österreich|Austria|Deutschland|Germany)/i.test(s||'');
const ensureAddress = (s:any, city='Innsbruck', country='Österreich') => {
  const src = String(s ?? '').trim(); if (!src) return '';
  return hasCity(src) ? src : `${src}, ${city}, ${country}`;
};
const parse = (v:any) => { const d = new Date(v); return isNaN(+d) ? null : d; };
const iso = (d:Date|null|undefined) => d ? d.toISOString() : null;
const hydrateTimeIfLegacy = (timeIso:any, fallbackIso:any) => {
  const t = parse(timeIso); if (!t) return null;
  if (t.getFullYear() >= 1905) return t;
  const f = parse(fallbackIso); if (!f) return null;
  return new Date(f.getFullYear(), f.getMonth(), f.getDate(), t.getHours(), t.getMinutes(), t.getSeconds());
};
const mapBracketItem = (label:string) => {
  if (!/^\s*\[.+\]\s*$/.test(label)) return null;
  const inner = label.replace(/^\s*\[|\]\s*$/g,'');
  const slug = inner.toLowerCase()
    .replace(/[.,()]/g,'').replace(/\s+/g,'-')
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');
  return `items.${slug}`;
};

async function run() {
  const snap = await db.collection('customers').get();
  let ok = 0, fail = 0;

  for (const doc of snap.docs) {
    const d = doc.data() as Record<string, any>;

    // Kernfelder aus Dumps
    const name  = d['Name (Vor- und Nachname)'] ?? d['name_vor_und_nachname'] ?? d['Name'] ?? d['name'] ?? '';
    const email = d['E-Mail-Adresse'] ?? d['e_mail_adresse'] ?? d['email'] ?? '';
    const phone = d['Telefonkontakt'] ?? d['telefonkontakt'] ?? d['phone'] ?? '';

    const createdRaw = d['createdAt'] ?? d['createdat_iso'] ?? d['created_at'] ?? d['Zeitstempel'] ?? d['zeitstempel'];
    const moveDateIso = d['Gewünschter Umzugstermin'] ?? d['gewünschter_umzugstermin'];
    const moveTimeIso = d['Voraussichtliche Startzeit'] ?? d['voraussichtliche_startzeit'];

    const hydrated = hydrateTimeIfLegacy(moveTimeIso, createdRaw);
    const moveDateFinal = hydrated ? iso(hydrated) : iso(parse(moveDateIso));

    // Adressen
    let pickup = d['Abholadresse (Straße, PLZ, Ort, Land)'] ?? d['abholadresse_straße_plz_ort_land'] ?? d['Abholadresse'] ?? d['abholadresse'] ?? d['pickupAddress'] ?? '';
    let drop   = d['Zieladresse, (Straße, PLZ, Ort, Land)'] ?? d['zieladresse_straße_plz_ort_land'] ?? d['Zustelladresse'] ?? d['zustelladresse'] ?? d['dropoffAddress'] ?? '';
    pickup = ensureAddress(pickup);
    drop   = ensureAddress(drop, 'Frankenburg', 'Österreich');

    // Entfernungen / Wege
    const distanceFromTruckPickup = cleanRange(d['Entfernung vom LKW (Abholadresse) in Meter:'] ?? d['entfernung_vom_lkw_abholadresse_in_meter'] ?? d['distanceFromTruckPickup']);
    const distanceFromTruckDrop   = cleanRange(d['Entfernung vom LKW-Standort (Zieladresse) in Meter'] ?? d['entfernung_vom_lkw_standort_zieladresse_in_meter'] ?? d['distanceFromTruckDrop']);

    const way1 = toNum(d['Weg1_km'] ?? d['weg1_km'] ?? d['way1Km']);
    const way2 = toNum(d['Weg2_km'] ?? d['weg2_km'] ?? d['way2Km']);
    const way3 = toNum(d['Weg3_km'] ?? d['weg3_km'] ?? d['way3Km']);
    const totalKm = toNum(d['Gesamt_km'] ?? d['gesamt_km'] ?? d['totalKm']) ?? ((way1||0)+(way2||0)+(way3||0) || null);

    const driveCost  = toNum(d['Gesamtkosten Fahrt'] ?? d['gesamtkosten_fahrt'] ?? d['driveCost']);
    const driveHours = toNum(d['Fahrzeit'] ?? d['fahrzeit'] ?? d['driveHours']);
    const totalHours = toNum(d['Gesamtzeit'] ?? d['gesamtzeit'] ?? d['totalHours']);
    const volumeM3   = toNum(d['Volumen (m³)'] ?? d['volumen_m³'] ?? d['volumeM3']);

    const hvzRaw = String(d['Nebenleistungen [Einrichten einer Halteverbotszone]'] ?? d['nebenleistungen_einrichten_einer_halteverbotszone'] ?? d['hvzPickup'] ?? '').toLowerCase();
    const hvzPickup = hvzRaw.includes('abhol') || hvzRaw === 'true';

    // Items
    const items: Record<string, number|string> = {};
    for (const k of Object.keys(d)) {
      const m = mapBracketItem(k);
      if (m) {
        const key = m.replace(/^items\./,'');
        const val = toNum(d[k]);
        items[key] = (val ?? String(d[k] ?? ''));
      }
    }

    try {
      await doc.ref.set({
        name: String(name),
        email: String(email),
        phone: String(phone),
        createdAtIso: createdRaw ? iso(parse(createdRaw)) : null,
        moveDateIso: moveDateFinal ?? null,

        pickupAddress: pickup,
        dropoffAddress: drop,

        distanceFromTruckPickup,
        distanceFromTruckDrop,

        way1Km: way1 ?? null,
        way2Km: way2 ?? null,
        way3Km: way3 ?? null,
        totalKm,

        driveCost: driveCost ?? null,
        driveHours: driveHours ?? null,
        totalHours: totalHours ?? null,

        volumeM3: volumeM3 ?? null,
        hvzPickup: !!hvzPickup,

        ...(Object.keys(items).length ? { items } : {}),
      }, { merge: true });

      ok++;
    } catch (e) {
      console.error('FAIL', doc.id, e);
      fail++;
    }
  }

  console.log(`Sanitize done. OK=${ok} FAIL=${fail}`);
}

run().then(() => process.exit(0));
