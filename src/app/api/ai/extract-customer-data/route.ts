
import { NextResponse } from 'next/server';
import { extractCustomerData } from '@/actions/extract-customer-data';
import { z } from 'zod';

const ExtractCustomerDataInputSchema = z.object({
  transcript: z.string().min(1, { message: "Transcript cannot be empty." }),
});


export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const validation = ExtractCustomerDataInputSchema.safeParse(payload);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid body', details: validation.error.flatten() }, { status: 400 });
    }
    const result = await extractCustomerData(validation.data);
    return NextResponse.json(result);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('API Error in /api/ai/extract-customer-data:', err);
    // Propagate the specific error message to the client
    return NextResponse.json({ error: 'Server error', details: errorMessage }, { status: 500 });
  }
}
