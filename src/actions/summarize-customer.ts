
'use server';

import {
  summarizeCustomer as summarizeCustomerFlow,
  type SummarizeCustomerInput,
} from '@/ai/flows/summarize-customer-flow';

export async function summarizeCustomer(
  input: SummarizeCustomerInput
): Promise<string> {
  return summarizeCustomerFlow(input);
}
