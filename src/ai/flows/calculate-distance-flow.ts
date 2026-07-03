
'use server';
/**
 * @fileOverview A flow for calculating driving distance and duration using Google Maps API.
 *
 * - calculateDistance - A function that takes an origin and destination and returns distance and duration.
 * - CalculateDistanceInput - The input type for the calculateDistance function.
 * - CalculateDistanceOutput - The return type for the calculateDistance function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Client, Language } from '@googlemaps/google-maps-services-js';

const CalculateDistanceInputSchema = z.object({
  origin: z.string().describe('The starting address for the route.'),
  destination: z.string().describe('The ending address for the route.'),
});
export type CalculateDistanceInput = z.infer<typeof CalculateDistanceInputSchema>;

const CalculateDistanceOutputSchema = z.object({
  distance: z.object({
    text: z.string().describe('The human-readable distance (e.g., "123 km").'),
    value: z.number().describe('The distance in meters.'),
  }),
  duration: z.object({
    text: z.string().describe('The human-readable duration (e.g., "1 hour 23 mins").'),
    value: z.number().describe('The duration in seconds.'),
  }),
});
export type CalculateDistanceOutput = z.infer<typeof CalculateDistanceOutputSchema>;


export async function calculateDistance(
  input: CalculateDistanceInput
): Promise<CalculateDistanceOutput> {
  return calculateDistanceFlow(input);
}


const calculateDistanceFlow = ai.defineFlow(
  {
    name: 'calculateDistanceFlow',
    inputSchema: CalculateDistanceInputSchema,
    outputSchema: CalculateDistanceOutputSchema,
  },
  async (input) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      throw new Error('GOOGLE_MAPS_API_KEY is not set in environment variables. Please add it to your .env file.');
    }

    const client = new Client({});
    const response = await client.directions({
        params: {
            origin: input.origin,
            destination: input.destination,
            key: apiKey,
            language: Language.de,
        },
        timeout: 1000, // milliseconds
    });
    
    if (response.data.status !== 'OK' || !response.data.routes || response.data.routes.length === 0) {
       throw new Error(`Failed to calculate distance: ${response.data.error_message || response.data.status || 'No route found'}`);
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];
    
    return {
      distance: {
        text: leg.distance.text,
        value: leg.distance.value,
      },
      duration: {
        text: leg.duration.text,
        value: leg.duration.value,
      },
    };
  }
);
