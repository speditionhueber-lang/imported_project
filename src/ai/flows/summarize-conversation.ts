'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

const SummarizeConversationInputSchema = z.object({
  transcript: z.string().describe('Das vollständige Transkript eines Gesprächs.'),
});
export type SummarizeConversationInput = z.infer<typeof SummarizeConversationInputSchema>;

const SummarizeConversationOutputSchema = z.object({
  summary: z.string().describe('Eine prägnante Zusammenfassung des Gesprächs.'),
});
export type SummarizeConversationOutput = z.infer<typeof SummarizeConversationOutputSchema>;

export async function summarizeConversation(
  input: SummarizeConversationInput
): Promise<SummarizeConversationOutput> {
  const { transcript } = input;

  const prompt = `Fasse das folgende Gesprächstranskript in 2-3 prägnanten Sätzen zusammen. Konzentriere dich auf das Hauptanliegen und das Ergebnis des Gesprächs. Gib nur die Zusammenfassung zurück.

Original-Transkript:
---
${transcript}
---
`;

  const { text } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: prompt,
  });

  return { summary: text || '[Keine Zusammenfassung möglich]' };
}
