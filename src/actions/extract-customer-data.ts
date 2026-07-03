
'use server';

import {
  extractCustomerData as extractCustomerDataFlow,
  type ExtractedCustomerData,
} from '@/ai/flows/extract-customer-data-flow';
import { z } from 'zod';

export async function extractCustomerData(
  input: { transcript: string }
): Promise<ExtractedCustomerData> {
  return extractCustomerDataFlow(input);
}
