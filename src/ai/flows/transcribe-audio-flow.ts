/**
 * @fileOverview Transcribes audio data to text using Genkit.
 *
 * - transcribeAudio - A function that takes an audio data URI and returns the transcript.
 * - TranscribeAudioInput - The input type for the transcribeAudio function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio recording, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;


/**
 * Transcribes the given audio data URI to text.
 * @param input The audio data to transcribe.
 * @returns The transcribed text.
 */
export async function transcribeAudio(input: TranscribeAudioInput): Promise<string> {
    const { audioDataUri } = TranscribeAudioInputSchema.parse(input);
    
    // Using a specialized speech-to-text model for better accuracy with telephony audio.
    const { text } = await ai.generate({
        model: googleAI.model("speech-to-text-2-telephony"),
        prompt: [
            { text: 'Transcribe the following audio recording. The language is German, possibly with a Tyrolean dialect.' },
            { media: { url: audioDataUri } },
        ],
    });

    if (!text) {
        throw new Error("Failed to transcribe audio.");
    }
    return text;
}
