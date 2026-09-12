'use server';

import { calculateDistanceAction } from '@/app/actions';

export async function calculateDistance(input: { origin: string; destination: string }) {
  return calculateDistanceAction(input);
}
