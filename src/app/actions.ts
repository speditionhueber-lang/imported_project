'use server';

import { Client } from '@googlemaps/google-maps-services-js';
import {
  createFolder,
  listFiles,
  listFolders,
  uploadFileToDrive,
} from '@/lib/google-drive';

type ActionResult<T> = { data: T | null; error?: string };

type DriveFile = {
  id?: string | null;
  name?: string | null;
  modifiedTime?: string | null;
  mimeType?: string | null;
  webViewLink?: string | null;
  webContentLink?: string | null;
  thumbnailLink?: string | null;
};

export type ExtractedCustomerData = {
  customerName: string;
  email: string;
  phone: string;
  billingAddressStreet: string;
  billingAddressCityZip: string;
  billingAddressCountry: string;
  movingDate: string;
  pickupAddress: string;
  pickupFloor: string;
  pickupElevator: string;
  pickupDistanceToTruck: string;
  deliveryAddress: string;
  deliveryFloor: string;
  deliveryElevator: string;
  deliveryDistanceToTruck: string;
  gegenstaende: Array<Record<string, string>>;
  notes: string;
};

export async function getDriveFolders(folderId: string): Promise<ActionResult<DriveFile[]>> {
  try {
    const data = await listFolders(folderId);
    return { data };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Ordner konnten nicht geladen werden.',
    };
  }
}

export async function getDriveFiles(folderId: string): Promise<ActionResult<DriveFile[]>> {
  try {
    const data = await listFiles(folderId);
    return { data };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Dateien konnten nicht geladen werden.',
    };
  }
}

export async function createDriveFolder(name: string, parentFolderId: string): Promise<ActionResult<DriveFile>> {
  try {
    const data = await createFolder(name, parentFolderId);
    return { data };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Ordner konnte nicht erstellt werden.',
    };
  }
}

export async function uploadFileToDriveAction(
  folderId: string,
  fileName: string,
  base64Content: string,
  mimeType: string
): Promise<DriveFile> {
  const content = Buffer.from(base64Content, 'base64');
  return uploadFileToDrive(folderId, fileName, content, mimeType);
}

export async function runAudioTranscription(fileId: string): Promise<ActionResult<{ transcript: string }>> {
  if (!fileId) {
    return { data: null, error: 'Ungültige Datei-ID.' };
  }
  return {
    data: null,
    error:
      'Audio-Transkription ist noch nicht konfiguriert. Bitte Backend-Integration für Transkription ergänzen.',
  };
}

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

export async function runSummarization(transcript: string): Promise<ActionResult<{ summary: string }>> {
  const normalized = normalizeText(transcript);
  if (!normalized) {
    return { data: null, error: 'Kein Transkript zur Zusammenfassung übergeben.' };
  }
  const summary = normalized.length > 500 ? `${normalized.slice(0, 500)}…` : normalized;
  return { data: { summary } };
}

export async function runCustomerExtraction(
  transcript: string
): Promise<ActionResult<Record<string, string>>> {
  const extracted = await extractCustomerData({ transcript });
  return {
    data: {
      'Name (Vor- und Nachname)': extracted.customerName,
      Email: extracted.email,
      Telefon: extracted.phone,
      'Rechnungsadresse Straße': extracted.billingAddressStreet,
      'Rechnungsadresse PLZ Ort': extracted.billingAddressCityZip,
      Abholadresse: extracted.pickupAddress,
      Zieladresse: extracted.deliveryAddress,
      Notizen: extracted.notes,
    },
    error: undefined,
  };
}

const matchLineValue = (text: string, keys: string[]): string => {
  const escaped = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:${escaped})\\s*:\\s*(.+)`, 'i'));
  return match?.[1]?.trim() ?? '';
};

export async function extractCustomerData(input: {
  transcript: string;
}): Promise<ExtractedCustomerData> {
  const text = input.transcript ?? '';
  return {
    customerName: matchLineValue(text, ['Name', 'Kunde', 'Customer']) || 'Unbekannt',
    email: matchLineValue(text, ['Email', 'E-Mail']),
    phone: matchLineValue(text, ['Telefon', 'Phone']),
    billingAddressStreet: matchLineValue(text, ['Rechnungsadresse Straße', 'Straße', 'Strasse']),
    billingAddressCityZip: matchLineValue(text, ['Rechnungsadresse PLZ Ort', 'PLZ Ort', 'Ort']),
    billingAddressCountry: matchLineValue(text, ['Land', 'Country']) || 'Österreich',
    movingDate: matchLineValue(text, ['Umzugsdatum', 'Datum']),
    pickupAddress: matchLineValue(text, ['Abholadresse']),
    pickupFloor: matchLineValue(text, ['Abhol Stockwerk']),
    pickupElevator: matchLineValue(text, ['Abhol Aufzug']),
    pickupDistanceToTruck: matchLineValue(text, ['Abhol Trageweg']),
    deliveryAddress: matchLineValue(text, ['Zieladresse']),
    deliveryFloor: matchLineValue(text, ['Ziel Stockwerk']),
    deliveryElevator: matchLineValue(text, ['Ziel Aufzug']),
    deliveryDistanceToTruck: matchLineValue(text, ['Ziel Trageweg']),
    gegenstaende: [],
    notes: matchLineValue(text, ['Notizen']) || normalizeText(text).slice(0, 500),
  };
}

export async function calculateDistanceAction(input: {
  origin: string;
  destination: string;
}) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY ist nicht gesetzt.');
  }

  const client = new Client({});
  const response = await client.distancematrix({
    params: {
      key: apiKey,
      origins: [input.origin],
      destinations: [input.destination],
      language: 'de',
    },
  });

  const element = response.data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK' || !element.distance || !element.duration) {
    throw new Error('Distanz konnte nicht berechnet werden.');
  }

  return {
    distance: element.distance,
    duration: element.duration,
  };
}
