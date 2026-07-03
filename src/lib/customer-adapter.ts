// src/lib/customer-adapter.ts
//---------------------------------------------------------
import { FIELD_MAP, FIELD_MAP_NORM, normalizeKey, mapBracketItem } from './field-map';
import { Customer } from './types';
import type { CalculationParams } from '@/contexts/customer-context';

export type RawDoc = Record<string, any>;

//---------------------------------------------------------
// Hilfsfunktionen
//---------------------------------------------------------
function set(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (current[key] === undefined || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }
  current[parts[parts.length - 1]] = value;
}

function getLegacyMappedKey(key: string): string | null {
  const legacyMap: Record<string, string> = {
    'Abholadresse Stockwerk': 'abholadresse.stockwerk',
    'Abholadresse Aufzug vorhanden?': 'abholadresse.aufzug',
    'Abholadresse Gebäudetyp': 'abholadresse.gebaeudetyp',
    'Abholadresse Parkmöglichkeit': 'abholadresse.parkplatz',
    'Abholadresse Entfernung zur LKW-Parkmöglichkeit': 'abholadresse.entfernungLKW',
    'Zieladresse Stockwerk': 'zieladresse.stockwerk',
    'Zieladresse Aufzug vorhanden?': 'zieladresse.aufzug',
  };
  return legacyMap[key] || null;
}

//---------------------------------------------------------
// Adapter für das 'inquiries' Schema
//---------------------------------------------------------
function normalizeInquiryData(doc: RawDoc): Customer {
  const rawGegenstaende = doc.umzugsgut?.gegenstaende || {};
  const normalizedGegenstaende: Record<string, number | string | boolean> = {};

  for (const key in rawGegenstaende) {
    if (Object.prototype.hasOwnProperty.call(rawGegenstaende, key)) {
      const value = rawGegenstaende[key];
      if (typeof value === 'object' && value !== null && 'count' in value) {
        normalizedGegenstaende[key] = Number(value.count) || 0;
      } else {
        normalizedGegenstaende[key] = value;
      }
    }
  }


  const normalized: Partial<Customer> = {
    id: doc.id,
    name: `${doc.kontakt?.firstName || ''} ${doc.kontakt?.lastName || ''}`.trim(),
    email: doc.kontakt?.email || '',
    phone: doc.kontakt?.phone || '',
    createdAt: doc.timestamp,
    address: { // Hauptadresse aus Kontaktdaten oder leer
        street: doc.kontakt?.billingAddress || '',
        city: '',
        zip: '',
        country: ''
    },
    abholadresse: {
      strasse: doc.abholadresse?.adresse || '',
      stockwerk: String(doc.abholadresse?.etage ?? ''),
      aufzug: doc.abholadresse?.aufzug || 'none',
      entfernungLKW: String(doc.abholadresse?.trageweg ?? ''),
      gebaeudetyp: doc.abholadresse?.gebaeudetyp || ''
    },
    zieladresse: {
      strasse: doc.zieladresse?.adresse || '',
      stockwerk: String(doc.zieladresse?.etage ?? ''),
      aufzug: doc.zieladresse?.aufzug || 'none',
      entfernungLKW: String(doc.zieladresse?.trageweg ?? ''),
      gebaeudetyp: doc.zieladresse?.gebaeudetyp || ''
    },
    umzugsdetails: {
      gewuenschterUmzugstermin: doc.termin?.von,
    },
    gegenstaende: normalizedGegenstaende,
    anmerkungen: doc.notizen,
    avatarUrl: `https://picsum.photos/seed/${doc.id}/40/40`,
  };

  normalized.nameLower = (normalized.name || '').toLowerCase();

  return normalized as Customer;
}


//---------------------------------------------------------
// Hauptfunktion: Normalisierung
//---------------------------------------------------------
export function normalizeCustomerData(doc: RawDoc, calcParams?: CalculationParams): Customer {
  // Entscheiden, welcher Adapter basierend auf der Datenstruktur verwendet wird
  if (doc.hasOwnProperty('kontakt') && doc.hasOwnProperty('abholadresse') && typeof doc.abholadresse === 'object' && doc.abholadresse.hasOwnProperty('etage')) {
    return normalizeInquiryData(doc);
  }

  // Fallback/Standard-Adapter für 'customers' Sammlung und andere flache Strukturen
  const normalized: RawDoc = { gegenstaende: {} };
  if (doc.id) normalized.id = doc.id;

  for (const key in doc) {
    if (!Object.prototype.hasOwnProperty.call(doc, key)) continue;
    
    let value = doc[key];

    // Preserve nested objects like abholadresse, zieladresse, etc.
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value.toDate instanceof Function)) {
        normalized[key] = value;
        continue;
    }

    const keepValue = typeof value === 'number' || typeof value === 'boolean' || (value !== null && value !== undefined && value !== '');
    if (!keepValue) continue;

    const cleanedKey = key.trim();
    const mappedKey =
      FIELD_MAP[cleanedKey] ||
      FIELD_MAP_NORM[normalizeKey(cleanedKey)] ||
      mapBracketItem(cleanedKey) ||
      getLegacyMappedKey(cleanedKey);

    if (mappedKey) {
      if (mappedKey.startsWith('nebenleistungen.')) {
        const val = String(value).toLowerCase();
        if (val === 'ja' || val === 'true' || val === '1' || val === 'abholadresse, zustelladresse') {
          set(normalized, mappedKey, true);
        } else if (val === 'nein' || val === 'false' || val === '0') {
           set(normalized, mappedKey, false);
        }
      } 
      else if (mappedKey.startsWith('gegenstaende.')) {
         const numValue = parseInt(String(value), 10);
         if (!isNaN(numValue) && numValue > 0) {
            set(normalized, mappedKey, numValue);
         } else if (typeof value === 'string' && value.trim() !== '' && !/^[0" ]+$/.test(value)) {
            set(normalized, mappedKey, value);
         }
      }
      else {
        set(normalized, mappedKey, value);
      }
    } else {
       // Keep unmapped fields as they are, especially if they are not objects
       if (typeof value !== 'object' || Array.isArray(value) || value === null) {
         normalized[key] = value;
       }
    }
  }

  // 2) Overlay calcParams if provided -> Diese haben Vorrang
  if (calcParams) {
      if (!normalized.abholadresse) normalized.abholadresse = {};
      if (!normalized.zieladresse) normalized.zieladresse = {};
      
      set(normalized, 'abholadresse.entfernungLKW', String(calcParams.pickupDistance));
      set(normalized, 'zieladresse.entfernungLKW', String(calcParams.destinationDistance));
      set(normalized, 'abholadresse.stockwerk', String(calcParams.pickupFloor));
      set(normalized, 'zieladresse.stockwerk', String(calcParams.destinationFloor));
      set(normalized, 'abholadresse.aufzugsgroesse', calcParams.pickupElevator);
      set(normalized, 'zieladresse.aufzugsgroesse', calcParams.destinationElevator);
      
      if (!normalized.zusatzoptionen) normalized.zusatzoptionen = {};
      set(normalized, 'zusatzoptionen.helfer', String(calcParams.selfProvidedPersonnel));
      
      if (!normalized.nebenleistungen) normalized.nebenleistungen = {};
      set(normalized, 'nebenleistungen.einrichtenHVZ', calcParams.hvzCount > 0);
  }

  //-----------------------------------------------------
  // Post-processing & Hydration
  //-----------------------------------------------------
  hydrateTimeIfLegacy(normalized);
  ensureAddress(normalized);

  const n = normalized as any;
  if (n.nebenleistungen) {
    n.nebenleistungen._liste = Object.entries(n.nebenleistungen)
      .filter(([, v]) => v === true)
      .map(([k]) => k)
      .join(', ');
  }

  // Ensure name is set, check 'name' field if not already mapped
  normalized.name = String(normalized.name || doc.name || '');
  if (normalized.name) {
    normalized.nameLower = normalized.name.toLowerCase();
  }

  if (!normalized.id && doc.customer_id) {
    normalized.id = doc.customer_id;
  }
  if (!normalized.id) {
     normalized.id = `temp_${Date.now()}`;
  }
  if(!normalized.avatarUrl) {
    normalized.avatarUrl = `https://picsum.photos/seed/${normalized.id}/40/40`;
  }

  // Final check and parse for `gegenstaende` string
  if (doc.Gegenstaende && typeof doc.Gegenstaende === 'string') {
      const regex = /\[([^\]]+)\]:\s*(\d+)/g;
      let match;
      while ((match = regex.exec(doc.Gegenstaende)) !== null) {
          const key = mapBracketItem(`[${match[1].trim()}]`);
          if (key && key.startsWith('gegenstaende.')) {
              const cleanKey = key.replace('gegenstaende.', '');
              (normalized.gegenstaende as Record<string, any>)[cleanKey] = parseInt(match[2], 10);
          }
      }
  }


  return normalized as Customer;
}

//---------------------------------------------------------
// Zeitstempel konvertieren
//---------------------------------------------------------
function hydrateTimeIfLegacy(obj: RawDoc) {
  const createdRaw = obj.createdAtIso || obj.createdAt;
  if (createdRaw) {
    try {
      const date = (createdRaw as any).toDate ? (createdRaw as any).toDate() : new Date(createdRaw);
      if (!isNaN(date.getTime())) obj.createdAt = date.toISOString();
    } catch {
      // ignore
    }
  }
}

//---------------------------------------------------------
// Address-Struktur absichern
//---------------------------------------------------------
function ensureAddress(obj: RawDoc) {
  if (obj.address && obj.address.street) return;
  if (obj.address?.cityZip) {
    const [city, zip] = String(obj.address.cityZip).split(',');
    obj.address.city = (city || '').trim();
    obj.address.zip = (zip || '').trim();
    delete obj.address.cityZip;
  } else if (!obj.address) {
    obj.address = { street: '', city: '', zip: '', country: '' };
  }
}

//---------------------------------------------------------
// Meta-Derivat für Tabellenansicht
//---------------------------------------------------------
export function deriveCustomerMeta(doc: RawDoc) {
  const normalized = normalizeCustomerData(doc);
  const { name, email, phone, createdAt } = normalized;
  let finalDate: Date | undefined;

  if (createdAt) {
    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) finalDate = d;
    } catch {
      finalDate = undefined;
    }
  }

  return {
    name: String(name || '—'),
    email: String(email || ''),
    phone: String(phone || ''),
    createdAt: finalDate,
  };
}
