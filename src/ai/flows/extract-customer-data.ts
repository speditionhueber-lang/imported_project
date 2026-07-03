'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const gegenstand_alias_map = {"sitzlandschaft_element_je_sitz": ["sofa", "couch", "sitzgarnitur", "chaiselongue", "eckcouch", "wohnlandschaft", "sitzbank", "schlafsofa", "ausziehcouch"], "schrank_zerlegbar_je_angef_m": ["schrank", "kasten", "kleiderschrank", "schlafzimmerschrank", "pax", "ikea pax", "drehtürschrank", "schiebetürschrank", "einbauschrank", "mehrtürig", "kleiderkasten", "hochschrank"], "regale": ["regal", "bücherregal", "wandregal", "metallregal", "holzregal", "lagerregal", "expedit", "kallax", "ikea kallax", "ikea regal"], "bücherregal_zerlegbar_je_angef_m": ["bücherregal", "regalwand", "regal mit böden", "ikea billy", "billy", "regal mit fächern", "fachböden"], "waschmaschine_trockner": ["waschmaschine", "trockner", "waschtrockner", "waschautomat", "wäschetrockner", "frontlader", "toplader"], "doppelbett_komplett": ["doppelbett", "bett", "ehebett", "king size", "queen size", "schlafbett", "massivholzbett"], "bettzeug_je_betteinheit": ["bettzeug", "bettwäsche", "decke", "polster", "kissen"], "kinderwagen": ["kinderwagen", "buggy", "babywagen", "kombi-kinderwagen", "maxicosi wagen"], "fahrrad": ["fahrrad", "rad", "bike", "mountainbike", "rennrad", "tourenrad", "e-bike", "elektrofahrrad"], "dreirad_kinderrad": ["dreirad", "kinderrad", "laufrad", "kinderfahrrad", "roller", "scooter"], "koffer": ["koffer", "reisetasche", "rollkoffer", "reisekoffer", "trolley"], "schreibtischstuhl": ["schreibtischstuhl", "bürostuhl", "drehstuhl", "rollstuhl", "ergonomischer stuhl", "gamingstuhl"], "staubsauger": ["staubsauger", "sauger", "vacuum", "staubsaugergerät", "zyklonsauger"], "teppich_wz": ["teppich", "orientteppich", "läufer", "bodenmatte", "vorleger"], "schlitten": ["schlitten", "rodel", "bob"], "ski": ["ski", "skier", "skiset"], "klapptisch_klappstuhl": ["klapptisch", "klappstuhl", "campingstuhl", "campinghocker", "campingtisch"], "sonnenschirm": ["sonnenschirm", "schirm", "gartenschirm", "terrassenschirm"], "sekretär": ["sekretär", "schreibkommode", "schreibtischkasten", "nostalgieschrank"]};

const ExtractCustomerDataInputSchema = z.object({
  transcript: z.string().describe('Das vollständige Transkript eines Gesprächs.'),
});
export type ExtractCustomerDataInput = z.infer<typeof ExtractCustomerDataInputSchema>;

// Using a generic record to handle the large and dynamic schema
const ExtractCustomerDataOutputSchema = z.record(z.any()).describe('Ein JSON-Objekt, das die extrahierten Kundendaten enthält, basierend auf dem detaillierten Schema.');
export type ExtractCustomerDataOutput = z.infer<typeof ExtractCustomerDataOutputSchema>;

export async function extractCustomerData(
  input: ExtractCustomerDataInput
): Promise<ExtractCustomerDataOutput> {
  return extractCustomerDataFlow(input);
}

const customerDataPrompt = ai.definePrompt({
    name: 'extractCustomerDataPrompt',
    input: { schema: ExtractCustomerDataInputSchema },
    output: { schema: ExtractCustomerDataOutputSchema },
    prompt: `
        Du bist ein Experte für die Analyse von Gesprächstranskripten für eine österreichische Spedition. Deine Aufgabe ist es, strukturierte Daten aus dem Gespräch zu extrahieren und sie in ein JSON-Format zu bringen, das dem vorgegebenen Schema entspricht.

        **Analyse-Kontext und Regeln:**

        1.  **Zielschema:** Deine Ausgabe MUSS ein JSON-Objekt sein. Die Schlüssel des Objekts entsprechen den Feldnamen aus dem Umzugsformular (z.B. "Abholadresse", "Gegenstände", "Name (Vor- und Nachname)"). Verwende exakt die Feldnamen aus dem Beispielschema.

        2.  **Gegenstands-Aliase:** Viele Gegenstände werden umgangssprachlich genannt. Verwende die folgende Alias-Map, um sie dem korrekten Feldnamen im Schema zuzuordnen. Der Schlüssel der Map ist der offizielle Feldname, der Wert ist eine Liste von Aliasen.
            *   **Beispiel:** Wenn jemand "Couch" sagt, ordne es dem Feld "sitzlandschaft_element_je_sitz" zu.
            *   **Alias-Map:** ${JSON.stringify(gegenstand_alias_map)}

        3.  **Feld "Gegenstände":** Fasse alle erkannten Gegenstände im Feld "Gegenstände" als String zusammen, formatiert als "[Gegenstand]: Anzahl".

        4.  **Strukturierte Adressen:** Versuche, vollständige Adressen (Straße, PLZ, Ort) zu erkennen und in die entsprechenden Felder wie "Abholadresse (Straße, PLZ, Ort, Land)" oder "Zieladresse, (Straße, PLZ, Ort, Land):" einzutragen.

        5.  **Keine Information:** Wenn für ein Feld keine Information im Transkript gefunden wird, lasse das Feld im resultierenden JSON-Objekt einfach weg. Erfinde keine Daten.

        **Beispiel für ein Ziel-JSON-Objekt:**
        {
          "Name (Vor- und Nachname)": "Aimee Neher",
          "Telefonkontakt": "06644380698",
          "E-Mail-Adresse": "aimee.neher@gmail.com",
          "Abholadresse (Straße, PLZ, Ort, Land)": "Hörtnaglstrasse 16, 6020 Innsbruck",
          "Zieladresse, (Straße, PLZ, Ort, Land):": "Schneeburggasse 79, 6020 Innsbruck",
          "Gibt es einen Aufzug? (Zieladresse)": "Ja",
          "Bitte geben Sie das Stockwerk an! (Zieladresse)": 1,
          "Gegenstände": "[Sitzlandschaft (Element), je Sitz ]: 2 [Sessel, mit Armlehnen (WZ)]: 1",
          "Gewünschter Umzugstermin": "2025-09-04T22:00:00.000Z"
        }


        **Jetzt analysiere das folgende Transkript und gib NUR das JSON-Objekt als Antwort zurück:**

        ---
        {{{transcript}}}
        ---
    `,
});


const extractCustomerDataFlow = ai.defineFlow(
  {
    name: 'extractCustomerDataFlow',
    inputSchema: ExtractCustomerDataInputSchema,
    outputSchema: ExtractCustomerDataOutputSchema,
  },
  async (input) => {
    const llmResponse = await customerDataPrompt(input);
    return llmResponse || {};
  }
);
