
'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z.string().describe(
    "Audio-Datei als Data-URI mit MIME-Type und Base64-Encoding. Format: 'data:<mimetype>;base64,<encoded_data>'"
  ),
  dialectPhrases: z.array(z.string()).optional().describe(
    'Optional: Dialekt- oder Fachausdrücke zur Verbesserung der Erkennung.'
  ),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  transcript: z.string().describe('Das Transkript der Audiodatei.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

export async function transcribeAudio(
  input: TranscribeAudioInput
): Promise<TranscribeAudioOutput> {
  const { audioDataUri, dialectPhrases } = input;

  const textPart = 'Transkribiere bitte das Audio vollständig auf Deutsch.' + (dialectPhrases && dialectPhrases.length > 0 ? ` Beachte besonders folgende Dialektausdrücke: ${dialectPhrases.join(', ')}.` : '');
  const audioPart = { media: { url: audioDataUri } };
  
  const { text } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: [
          { text: textPart },
          audioPart
      ],
  });


  return { transcript: text || '[Leeres Transkript erhalten]' };
}
