
'use server';

import {
  extractInvoiceData,
  type ExtractedInvoiceData,
} from '@/ai/flows/extract-invoice-data-flow';

import { 
  transcribeAudio,
  type TranscribeAudioInput,
} from '@/ai/flows/transcribe-audio';
import {
  summarizeConversation,
  type SummarizeConversationInput,
} from '@/ai/flows/summarize-conversation';
import {
    extractCustomerData,
    type ExtractCustomerDataInput,
} from '@/ai/flows/extract-customer-data';

import { getDriveAudioFile, listAudioFiles, listFolders, getFolderName, uploadFileToDrive, createFolder, listFiles } from '@/lib/google-drive';

export async function runInvoiceExtraction(input: { imageDataUri: string; }): Promise<{ data: ExtractedInvoiceData; error: null; } | { data: null; error: string; }> {
  try {
    const result = await extractInvoiceData(input);
    return { data: result, error: null };
  } catch (e: any) {
    return { data: null, error: e.message || 'An unknown error occurred.' };
  }
}


export async function getDriveFolders(parentFolderId?: string) {
    try {
      const files = await listFolders(parentFolderId);
      return { data: files, error: null };
    } catch (e: any) {
      console.error('Action Error: getDriveFolders', e);
      return { data: [], error: e.message || 'An unknown error occurred.' };
    }
}

export async function getDriveFiles(folderId: string) {
    try {
        const files = await listFiles(folderId);
        return { data: files, error: null };
    } catch (e: any) {
        console.error('Action Error: getDriveFiles', e);
        return { data: [], error: e.message || 'An unknown error occurred.' };
    }
}

export async function createDriveFolder(folderName: string, parentFolderId?: string) {
    try {
        const folder = await createFolder(folderName, parentFolderId);
        return { data: folder, error: null };
    } catch (e: any) {
        console.error('Action Error: createDriveFolder', e);
        return { data: null, error: e.message || 'An unknown error occurred.' };
    }
}

export async function getDriveFolderName(folderId: string) {
    try {
        const name = await getFolderName(folderId);
        return { data: name, error: null };
    } catch (e: any) {
        return { data: null, error: e.message || 'An unknown error occurred.' };
    }
}


export async function getDriveAudioFiles(folderId: string) {
  try {
    const files = await listAudioFiles(folderId);
    return { data: files, error: null };
  } catch (e: any) {
    return { data: [], error: e.message || 'An unknown error occurred.' };
  }
}

export async function runAudioTranscription(fileId: string, dialectPhrases?: string[]) {
    try {
      const fileBuffer = await getDriveAudioFile(fileId);
      const audioDataUri = `data:audio/mp4;base64,${fileBuffer.toString('base64')}`;
      
      const transcriptionInput: TranscribeAudioInput = { audioDataUri, dialectPhrases };
      
      const result = await transcribeAudio(transcriptionInput);
      return { data: result, error: null };
    } catch (e: any) {
      return { data: null, error: e.message || 'An unknown error occurred.' };
    }
}

export async function runSummarization(transcript: string) {
    try {
        const summarizationInput: SummarizeConversationInput = { transcript };
        const result = await summarizeConversation(summarizationInput);
        return { data: result, error: null };
    } catch (e: any) {
        return { data: null, error: e.message || 'An unknown error occurred.' };
    }
}

export async function runCustomerExtraction(transcript: string) {
    try {
        const extractionInput: ExtractCustomerDataInput = { transcript };
        const result = await extractCustomerData(extractionInput);
        return { data: result, error: null };
    } catch (e: any) {
        return { data: null, error: e.message || 'An unknown error occurred.' };
    }
}

async function uploadToDriveInternal(folderId: string, fileName: string, fileContent: ArrayBuffer, mimeType: string) {
  return uploadFileToDrive(folderId, fileName, Buffer.from(fileContent), mimeType);
}

export async function uploadFileToDriveAction(folderId: string, fileName: string, fileBufferBase64: string, mimeType: string) {
    try {
        const buffer = Buffer.from(fileBufferBase64, 'base64');
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        const result = await uploadToDriveInternal(folderId, fileName, arrayBuffer, mimeType);
        return { data: result, error: null };
    } catch (e: any) {
        console.error('Action Error: uploadFileToDriveAction', e);
        return { data: null, error: e.message || 'An unknown error occurred.' };
    }
}

