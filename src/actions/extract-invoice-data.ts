
'use server';

import {
  extractInvoiceData as extractInvoiceDataFlow,
  type ExtractedInvoiceData,
} from '@/ai/flows/extract-invoice-data-flow';

export async function extractInvoiceData(input: {
  imageDataUri: string;
}): Promise<ExtractedInvoiceData> {
  return extractInvoiceDataFlow(input);
}
