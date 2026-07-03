/**
 * @fileOverview A flow for extracting structured data from an invoice image.
 *
 * - extractInvoiceData - A function that takes an invoice image and returns structured data.
 * - ExtractedInvoiceData - The return type for the extractInvoiceData function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';

// Define schemas internally, do not export them as consts
const InvoiceDataItemSchema = z.object({
  description: z.string().describe('The description of the line item.'),
  quantity: z.number().optional().describe('The quantity of the item.'),
  unitPrice: z.number().optional().describe('The price per unit.'),
  total: z.number().describe('The total price for the line item.'),
});

const ExtractedInvoiceDataSchema = z.object({
  vendorName: z.string().optional().describe('The name of the vendor or merchant.'),
  invoiceDate: z.string().optional().describe('The date the invoice was issued (YYYY-MM-DD).'),
  dueDate: z.string().optional().describe('The date the payment is due (YYYY-MM-DD).'),
  invoiceNumber: z.string().optional().describe('The unique identifier for the invoice.'),
  netAmount: z.number().optional().describe('The total amount before tax.'),
  vatAmount: z.number().optional().describe('The total amount of VAT (tax).'),
  grossAmount: z.number().optional().describe('The final total amount including tax (Bruttobetrag).'),
  currency: z.string().optional().describe('The currency of the amounts (e.g., EUR, USD).'),
  items: z.array(InvoiceDataItemSchema).optional().describe('An array of line items from the invoice.'),
});

// Export the type, not the schema object
export type ExtractedInvoiceData = z.infer<typeof ExtractedInvoiceDataSchema>;

// This is the only function exported
export async function extractInvoiceData(input: { imageDataUri: string }): Promise<ExtractedInvoiceData> {
  return extractInvoiceDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractInvoiceDataPrompt',
  model: googleAI.model('gemini-2.5-flash'),
  input: { schema: z.object({ imageDataUri: z.string() }) },
  output: { schema: ExtractedInvoiceDataSchema },
  prompt: `You are an expert OCR and data extraction assistant for an accounting department.
Your task is to analyze the following invoice image and extract all relevant accounting information into a structured JSON object.
The invoice can be of any type (supermarket receipt, corporate invoice, etc.). Be as accurate as possible.

Extract the following fields:
- vendorName: The name of the company that issued the invoice.
- invoiceDate: The date the invoice was created. Format as YYYY-MM-DD.
- dueDate: The payment due date, if mentioned. Format as YYYY-MM-DD.
- invoiceNumber: The invoice number (Rechnungsnummer).
- netAmount: The total net amount (Nettobetrag).
- vatAmount: The total VAT/tax amount (MwSt. / USt.).
- grossAmount: The final total amount (Bruttobetrag / Gesamtbetrag). This is the most important amount.
- currency: The currency symbol or code (e.g., €, EUR).
- items: A list of individual items if available, with description and total price.

Analyze this image: {{media url=imageDataUri}}
`,
});

// This flow is defined internally and not exported
const extractInvoiceDataFlow = ai.defineFlow(
  {
    name: 'extractInvoiceDataFlow',
    inputSchema: z.object({ imageDataUri: z.string() }),
    outputSchema: ExtractedInvoiceDataSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("Failed to extract invoice data from image.");
    }
    return output;
  }
);
