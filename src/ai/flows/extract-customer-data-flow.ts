
'use server';
/**
 * @fileOverview A flow for extracting structured customer data from a block of text.
 *
 * - extractCustomerData - A function that takes a transcript and returns structured customer data.
 * - ExtractedCustomerData - The return type for the extractCustomerData function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';

// Schema for the data to be extracted
const ExtractionSchema = z.object({
  customerName: z.string().nullable().optional().describe("Vollständiger Name des Kunden oder der Firma"),
  email: z.union([z.string().email(), z.string().length(0)]).nullable().optional().describe("E-Mail-Adresse"),
  phone: z.string().nullable().optional().describe("Telefonnummer"),
  movingDate: z.string().nullable().optional().describe("Umzugsdatum im Format YYYY-MM-DD, wenn erwähnt"),
  
  billingAddressStreet: z.string().nullable().optional().describe("Straße der Rechnungsadresse"),
  billingAddressCityZip: z.string().nullable().optional().describe("Postleitzahl und Ort der Rechnungsadresse"),
  billingAddressCountry: z.string().nullable().optional().describe("Land der Rechnungsadresse"),

  pickupAddress: z.string().nullable().optional().describe("Vollständige Abholadresse (Straße, PLZ, Ort)"),
  pickupFloor: z.string().nullable().optional().describe("Stockwerk an der Abholadresse (z.B. '2. Stock', 'EG')"),
  pickupElevator: z.string().nullable().optional().describe("Gibt es einen Aufzug an der Abholadresse? (\"Ja\", \"Nein\", \"Unbekannt\")"),
  pickupDistanceToTruck: z.string().nullable().optional().describe("Geschätzter Trageweg vom LKW zur Haustür (Abholung)"),
  
  deliveryAddress: z.string().nullable().optional().describe("Vollständige Zieladresse (Straße, PLZ, Ort)"),
  deliveryFloor: z.string().nullable().optional().describe("Stockwerk an der Zieladresse"),
  deliveryElevator: z.string().nullable().optional().describe("Gibt es einen Aufzug an der Zieladresse? (\"Ja\", \"Nein\", \"Unbekannt\")"),
  deliveryDistanceToTruck: z.string().nullable().optional().describe("Geschätzter Trageweg an der Zieladresse"),
  
  notes: z.string().nullable().optional().describe("Alle weiteren Anmerkungen, Fragen oder speziellen Wünsche des Kunden als Text."),
  gegenstaende: z.array(z.object({
      name: z.string(),
      quantity: z.number().int().optional(),
      note: z.string().nullable().optional(),
    })).nullable().optional().describe("Eine Liste der vom Kunden erwähnten Gegenstände."),
});

export type ExtractedCustomerData = z.infer<typeof ExtractionSchema>;

// This is the only function exported
export async function extractCustomerData(input: { transcript: string }): Promise<ExtractedCustomerData> {
  return extractCustomerDataFlow(input);
}


// This flow is defined internally and not exported
const extractCustomerDataFlow = ai.defineFlow(
  {
    name: 'extractCustomerDataFlow',
    inputSchema: z.object({ transcript: z.string() }),
    outputSchema: ExtractionSchema,
  },
  async (input) => {
    const prompt = `Lies die folgende Anfrage eines Umzugskunden und extrahiere strukturierte Daten.

GIB DIE ANTWORT AUSSCHLIESSLICH ALS GÜLTIGES JSON-OBJEKT ZURÜCK.
Kein Fließtext, keine Erklärungen, keine Markdown-Codeblöcke.

- "gegenstaende" soll ein Array von Objekten sein.
- Jedes Objekt repräsentiert einen Gegenstand.
- Versuche, den 'name' des Gegenstands zu normalisieren (z.B. 'Bücherregal' statt 'grosses regal fuer buecher').
- 'quantity' ist die Anzahl. Wenn nicht angegeben, setze 1.
- Wenn ein Gegenstand nicht eindeutig zugeordnet werden kann, gib den Originaltext des Kunden im 'note'-Feld an und setze 'name' auf einen allgemeinen Platzhalter wie 'Unbekannter Gegenstand'.

Wenn du einen Wert nicht sicher bestimmen kannst, setze ihn auf null.
Fasse Straße, PLZ und Ort jeweils zu einem einzigen String zusammen, z.B. "Dorf 185, 6252 Breitenbach am Inn".

Text:
"""${input.transcript}"""`;

    const { output } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt,
      config: {
        responseMimeType: 'application/json',
      },
      output: {
        schema: ExtractionSchema,
      },
    });

    if (!output) {
      throw new Error('AI did not return any output.');
    }
    
    // The output from the AI should already be parsed and validated by Genkit
    // based on the output schema provided in the generate call.
    return output;
  }
);
