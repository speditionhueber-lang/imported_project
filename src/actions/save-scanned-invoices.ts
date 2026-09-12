'use server';

import { collection, writeBatch, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

type ExtractedInvoiceData = any;

type CapturedInvoice = {
  id: string;
  imageDataUrl: string;
  capturedAt: Date;
  extractedData?: ExtractedInvoiceData | null;
};

export async function saveScannedInvoices(
  invoices: CapturedInvoice[]
): Promise<{ count: number; error: string | null }> {
  try {
    const { firestore } = initializeFirebase();
    const batch = writeBatch(firestore);
    const invoicesCollection = collection(firestore, 'scannedInvoices');

    invoices.forEach((invoice) => {
      const dataToSave = {
        ...invoice,
        capturedAt: invoice.capturedAt.toISOString(),
        imageDataUrl: invoice.imageDataUrl,
        extractedData: invoice.extractedData ?? null,
      };

      const docRef = doc(invoicesCollection, invoice.id);
      batch.set(docRef, dataToSave);
    });

    await batch.commit();

    return {
      count: invoices.length,
      error: null,
    };
  } catch (e: any) {
    console.error('Error saving scanned invoices to Firestore:', e);

    return {
      count: 0,
      error: e.message || 'An unknown error occurred during save.',
    };
  }
}
