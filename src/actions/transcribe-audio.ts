
'use server';

import {
  transcribeAudio as transcribeAudioFlow,
  type TranscribeAudioInput,
} from '@/ai/flows/transcribe-audio-flow';

export async function transcribeAudio(
  input: TranscribeAudioInput
): Promise<string> {
  return transcribeAudioFlow(input);
}
