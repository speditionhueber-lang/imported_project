
'use server';

import { collection, writeBatch, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { ExtractedInvoiceData } from '@/ai/flows/extract-invoice-data-flow';

type CapturedInvoice = {
  id: string;
  imageDataUrl: string; // This might be very large. Consider storing in Firebase Storage instead.
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
      // For Firestore, it's better to convert Date objects to ISO strings or Timestamps
      const dataToSave = {
        ...invoice,
        capturedAt: invoice.capturedAt.toISOString(),
        // We are saving the base64 string directly in Firestore.
        // For production apps, uploading to Firebase Storage and saving the URL would be a better approach
        // to avoid large document sizes.
        imageDataUrl: invoice.imageDataUrl, 
        extractedData: invoice.extractedData || null,
      };
      // Use the client-generated ID for the document
      const docRef = doc(invoicesCollection, invoice.id);
      batch.set(docRef, dataToSave);
    });

    await batch.commit();
    return { count: invoices.length, error: null };

  } catch (e: any) {
    console.error('Error saving scanned invoices to Firestore:', e);
    // Return a simplified error message
    return { count: 0, error: e.message || 'An unknown error occurred during save.' };
  }
}
