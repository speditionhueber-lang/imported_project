// src/app/api/ai/learn/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';

const LearnRequestSchema = z.object({
  customer_input: z.string(),
  final_reply: z.string(),
  intent: z.enum(["Angebot", "Termin", "Mahnung"]),
  policyId: z.string(),
  tags: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = LearnRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.flatten() }, { status: 400 });
    }

    // In a real implementation, this would:
    // 1. Generate an embedding for the `final_reply`.
    // 2. Save the `customer_input`, `final_reply`, `intent`, `policyId`, and `tags` to Firestore.
    // 3. Save the embedding vector to a vector database (e.g., Pinecone, Supabase pgvector) linked to the Firestore document ID.

    console.log('Received data for learning:', validation.data);

    // Simulate a delay for the learning process
    await new Promise(resolve => setTimeout(resolve, 1000));


    return NextResponse.json({ success: true, message: 'Example received and queued for learning.' });

  } catch (error) {
    console.error('API /ai/learn error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}
