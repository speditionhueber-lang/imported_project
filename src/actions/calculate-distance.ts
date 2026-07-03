
'use server';

import {
  calculateDistance as calculateDistanceFlow,
  type CalculateDistanceInput,
  type CalculateDistanceOutput,
} from '@/ai/flows/calculate-distance-flow';

export async function calculateDistance(
  input: CalculateDistanceInput
): Promise<CalculateDistanceOutput> {
  return calculateDistanceFlow(input);
}
