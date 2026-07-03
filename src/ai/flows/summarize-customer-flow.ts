/**
 * @fileOverview A flow for summarizing customer data.
 *
 * - summarizeCustomer - A function that takes customer data and returns a summary.
 * - SummarizeCustomerInput - The input type for the summarizeCustomer function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Customer } from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';

export type SummarizeCustomerInput = Customer;

export async function summarizeCustomer(
  input: SummarizeCustomerInput
): Promise<string> {
  return summarizeCustomerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeCustomerPrompt',
  model: googleAI.model('gemini-2.5-flash'),
  input: { schema: z.custom<Customer>() },
  output: { schema: z.string() },
  prompt: `You are an expert assistant for a moving company.
Your task is to analyze the following customer data and provide a concise summary.
Highlight the most important information for the upcoming move, such as addresses, desired date, and key items or services.

Customer Data:
{{{json input}}}
`,
});

const summarizeCustomerFlow = ai.defineFlow(
  {
    name: 'summarizeCustomerFlow',
    inputSchema: z.custom<Customer>(),
    outputSchema: z.string(),
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to summarize customer data.');
    }
    return output;
  }
);
