// src/lib/field-map.ts
//---------------------------------------------------------
// Normalisierung + Mapping
//---------------------------------------------------------

export const normalizeKey = (s: string) => {
    let str = String(s ?? '')
      .toLowerCase()
      .replace(/\u200B/g, '') // Zero-width space
      .trim();

    // Specific replacements before general normalization
    str = str.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
    
    // Replace special characters and sequences of non-alphanumeric with a single underscore
    str = str.replace(/[\s.,():\/\[\]]+/g, '_');
    
    // Remove trailing underscores
    str = str.replace(/_+$/g, '');
    
    // Remove leading underscores
    str = str.replace(/^_+/g, '');

    // This is a simplified version; a more robust one might be needed if keys get complex
    str = str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

    return str;
}


export const FIELD_MAP: Record<string, string> = {
  //-----------------------------------------------------
  // Stammdaten
  //-----------------------------------------------------
  'Name (Vor- und Nachname)': 'name',
  'E-Mail-Adresse': 'email',
  'Telefonkontakt': 'phone',
  'Zeitstempel': 'createdAtIso',

  //-----------------------------------------------------
  // Termine / Zeiten
  //-----------------------------------------------------
  'Gewünschter Umzugstermin': 'umzugsdetails.gewuenschterUmzugstermin',
  'Voraussichtliche Startzeit': 'umzugsdetails.voraussichtlicheStartzeit',

  //-----------------------------------------------------
  // Adressen
  //-----------------------------------------------------
  'Abholadresse (Straße, PLZ, Ort, Land)': 'abholadresse.strasse',
  'Zieladresse, (Straße, PLZ, Ort, Land)': 'zieladresse.strasse',
  'Art des Gebäudes (Abholadresse)': 'abholadresse.gebaeudetyp',
  'Art des Gebäudes (Zieladresse)': 'zieladresse.gebaeudetyp',
  'Bitte geben Sie das Stockwerk (Abholadresse) an': 'abholadresse.stockwerk',
  'Bitte geben Sie das Stockwerk an (Zieladresse)': 'zieladresse.stockwerk',
  'Gibt es einen Aufzug? (Abholadresse)': 'abholadresse.aufzug',
  'Gibt es einen Aufzug? (Zieladresse)': 'zieladresse.aufzug',
  'Bitte schätzen Sie die Größe des Aufzuges/Lift (Abholadresse)': 'abholadresse.aufzugsgroesse',
  'Bitte schätzen Sie die Größe des Aufzuges (Zieladresse)': 'zieladresse.aufzugsgroesse',
  'Entfernung vom LKW (Abholadresse) in Meter:': 'abholadresse.entfernungLKW',
  'Entfernung vom LKW-Standort (Zieladresse) in Meter': 'zieladresse.entfernungLKW',

  //-----------------------------------------------------
  // Rechnungsadresse
  //-----------------------------------------------------
  'Rechnungsadresse (Straße)': 'address.street',
  'Rechnungsadresse (Ort, PLZ)': 'address.cityZip',
  'Rechnungsadresse (Ort)': 'address.city',
  'Rechnungsadresse (PLZ)': 'address.zip',
  'Rechnungsadresse (Land)': 'address.country',

  //-----------------------------------------------------
  // Nebenleistungen
  //-----------------------------------------------------
  'Nebenleistungen [Einrichten einer Halteverbotszone]': 'nebenleistungen.einrichtenHVZ',
  'Nebenleistungen [Verpacken des Umzugsgutes]': 'nebenleistungen.verpacken',
  'Nebenleistungen [Verpacken zerbrechlicher Gegenstände]': 'nebenleistungen.verpackenZerbrechlich',
  'Nebenleistungen [Möbelmontage/- Demontage]': 'nebenleistungen.moebelmontage',
  'Nebenleistungen [Küchenmontage/- Demontage (Zeichnung beifügen)]': 'nebenleistungen.kuechenmontage',
  'Nebenleistungen [Auspacken des Umzugsgutes]': 'nebenleistungen.auspacken',
  'Nebenleistungen [Auspacken zerbrechlicher Gegenstände]': 'nebenleistungen.auspackenZerbrechlich',
  'Nebenleistungen [Lampenmontage/- Demontage]': 'nebenleistungen.lampenmontage',

  //-----------------------------------------------------
  // Diverse
  //-----------------------------------------------------
  'Kundennummer': 'id',
  'customer_id': 'id',

  //-----------------------------------------------------
  // Freitext / Anmerkungen
  //-----------------------------------------------------
  'Anmerkungen': 'anmerkungen',
  'Falls Sie noch Fragen, Details oder Anmerkungen haben, können Sie diese hier eintragen. Vielen Dank für Ihre Angaben – wir melden uns unverzüglich nach der Bearbeitung bei Ihnen!': 'anmerkungen',
  'Welche Gegenstände möchten Sie sonst noch mitnehmen?': 'gegenstaende.sonstigeGegenstaende',
};

//---------------------------------------------------------
// Normalisierter Index für robuste Zuordnung
//---------------------------------------------------------
export const FIELD_MAP_NORM: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_MAP).map(([k, v]) => [normalizeKey(k), v])
);

//---------------------------------------------------------
// Erkennung von [Bracket]-Items (Nebenleistungen / Gegenstände)
//---------------------------------------------------------
export function mapBracketItem(label: string): string | null {
  if (!/^\s*\[.+\]\s*$/.test(label)) return null;
  const inner = label.replace(/^\s*\[|\]\s*$/g, '');
  const slug = inner
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[ä]/g, 'ae')
    .replace(/[ö]/g, 'oe')
    .replace(/[ü]/g, 'ue')
    .replace(/[ß]/g, 'ss');

  const nebenleistungenMap: Record<string, string> = {
    'einrichten-einer-halteverbotszone': 'einrichtenHVZ',
    'verpacken-zerbrechlich': 'verpackenZerbrechlich',
    'moebel-de-re-montage': 'moebelmontage',
    'kuechen-de-re-montage': 'kuechenmontage',
  };

  if (nebenleistungenMap[slug]) {
    return `nebenleistungen.${nebenleistungenMap[slug]}`;
  }

  // Convert slug to camelCase to match item-cbm-defaults.ts
  const camelCaseSlug = slug.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

  return `gegenstaende.${camelCaseSlug}`;
}
